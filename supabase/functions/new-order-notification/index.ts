import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type Device = {
  id: string;
  device_token: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" };
const FIREBASE_MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function jsonResponse(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const WEBHOOK_API_KEY_NAME = "orders_webhook";

function getWebhookApiKey(): string | null {
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeysJson) return null;

  try {
    const secretKeys: unknown = JSON.parse(secretKeysJson);
    if (!isObject(secretKeys)) return null;
    const apiKey = secretKeys[WEBHOOK_API_KEY_NAME];
    return typeof apiKey === "string" && apiKey.length > 0 ? apiKey : null;
  } catch {
    return null;
  }
}

function securelyMatchesApiKey(provided: string, expected: string): boolean {
  const providedBytes = new TextEncoder().encode(provided);
  const expectedBytes = new TextEncoder().encode(expected);
  let difference = providedBytes.length ^ expectedBytes.length;
  const length = Math.max(providedBytes.length, expectedBytes.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (providedBytes[index] ?? 0) ^ (expectedBytes[index] ?? 0);
  }

  return difference === 0;
}

function requiredString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function encodeJsonBase64Url(value: JsonObject): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function createFirebaseAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  try {
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = encodeJsonBase64Url({ alg: "RS256", typ: "JWT" });
    const claims = encodeJsonBase64Url({
      iss: serviceAccount.client_email,
      scope: FIREBASE_MESSAGING_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    });
    const signingInput = `${header}.${claims}`;
    const privateKeyBody = serviceAccount.private_key
      .replace(/\\n/g, "\n")
      .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
    const privateKeyBytes = Uint8Array.from(atob(privateKeyBody), character => character.charCodeAt(0));
    const signingKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = new Uint8Array(await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      signingKey,
      new TextEncoder().encode(signingInput),
    ));
    const assertion = `${signingInput}.${encodeBase64Url(signature)}`;
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) throw new Error("Google OAuth rejected the service-account assertion.");
    const result = await response.json();
    if (typeof result.access_token !== "string" || !result.access_token) {
      throw new Error("Google OAuth response did not include an access token.");
    }
    return result.access_token;
  } catch {
    throw new Error("Firebase authentication failed.");
  }
}

function isUnregisteredToken(errorBody: unknown): boolean {
  if (!isObject(errorBody) || !isObject(errorBody.error)) return false;
  const details = Array.isArray(errorBody.error.details) ? errorBody.error.details : [];
  return details.some(detail =>
    isObject(detail) && detail.errorCode === "UNREGISTERED"
  );
}

Deno.serve(async (req) => {
  const expectedApiKey = getWebhookApiKey();
  if (!expectedApiKey) {
    return jsonResponse({ success: false, error: "Webhook authentication is not configured." }, 500);
  }

  const providedApiKey = req.headers.get("apikey");
  if (!providedApiKey || !securelyMatchesApiKey(providedApiKey, expectedApiKey)) {
    return jsonResponse({ success: false, error: "Unauthorized." }, 401);
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Only POST requests are allowed." }, 405);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Malformed webhook JSON." }, 400);
  }

  if (
    !isObject(payload) ||
    payload.type !== "INSERT" ||
    payload.table !== "orders" ||
    payload.schema !== "public" ||
    !isObject(payload.record)
  ) {
    return jsonResponse({ success: false, error: "Expected a public.orders INSERT webhook payload." }, 400);
  }

  const record = payload.record;
  const orderId = requiredString(record.id);
  const orderNumber = requiredString(record.order_number);
  const totalAmount = requiredString(record.total_amount);
  const tenantId = requiredString(record.tenant_id);
  const companyCode = requiredString(record.company_code);

  if (
    !orderId || !orderNumber || !totalAmount || !tenantId || !companyCode ||
    !Number.isFinite(Number(totalAmount))
  ) {
    return jsonResponse({ success: false, error: "Order record is missing required fields." }, 400);
  }

  const firebaseServiceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!firebaseServiceAccountJson) {
    return jsonResponse({ success: false, error: "Firebase server credential is not configured." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: "Supabase server environment is not configured." }, 500);
  }

  let serviceAccount: ServiceAccount;
  try {
    const parsed: unknown = JSON.parse(firebaseServiceAccountJson);
    if (
      !isObject(parsed) ||
      typeof parsed.project_id !== "string" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      throw new Error("Invalid service-account fields.");
    }
    serviceAccount = parsed as ServiceAccount;
  } catch {
    return jsonResponse({ success: false, error: "Firebase server credential is invalid." }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let devices: Device[];
  try {
    const { data, error } = await supabase
      .from("admin_device_tokens")
      .select("id, device_token")
      .eq("tenant_id", tenantId)
      .eq("company_code", companyCode)
      .eq("is_active", true)
      .eq("platform", "web");

    if (error) throw error;
    devices = (data || []) as Device[];
  } catch (error) {
    console.error("new-order-notification: device query failed", {
      order_id: orderId,
      tenant_id: tenantId,
      company_code: companyCode,
      error_code: isObject(error) && typeof error.code === "string" ? error.code : "UNKNOWN",
    });
    return jsonResponse({ success: false, error: "Device registration query failed." }, 500);
  }

  if (devices.length === 0) {
    console.info("new-order-notification: processed", {
      order_id: orderId,
      tenant_id: tenantId,
      company_code: companyCode,
      devices_found: 0,
      notifications_sent: 0,
      failed_count: 0,
      devices_deactivated: 0,
    });
    return jsonResponse({
      success: true,
      devices_found: 0,
      notifications_sent: 0,
      failed_count: 0,
      devices_deactivated: 0,
    });
  }

  let firebaseAccessToken: string;
  try {
    firebaseAccessToken = await createFirebaseAccessToken(serviceAccount);
  } catch {
    console.error("new-order-notification: Firebase authentication failed", {
      order_id: orderId,
      tenant_id: tenantId,
      company_code: companyCode,
      devices_found: devices.length,
    });
    return jsonResponse({ success: false, error: "Firebase authentication failed." }, 500);
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(serviceAccount.project_id)}/messages:send`;
  const messageData = {
    order_id: orderId,
    order_number: orderNumber,
    notification_type: "new_order",
    tenant_id: tenantId,
    company_code: companyCode,
  };
  const notificationTitle = "🔔 New Order Received";
  const notificationBody = `Dear NM Mart, you have received a new order.\nOrder #${orderNumber} • ₹${totalAmount}`;

  const sendResults = await Promise.all(devices.map(async (device) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firebaseAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: device.device_token,
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
            webpush: {
              notification: {
                tag: `nm-order-${orderId}`,
                renotify: false,
                silent: false,
              },
            },
            data: messageData,
          },
        }),
      });

      if (response.ok) return { status: "sent", device };
      const errorBody: unknown = await response.json().catch(() => null);
      if (isUnregisteredToken(errorBody)) return { status: "unregistered", device };

      console.warn("new-order-notification: FCM send failed", {
        order_id: orderId,
        tenant_id: tenantId,
        company_code: companyCode,
        device_id: device.id,
        http_status: response.status,
      });
      return { status: "failed", device };
    } catch {
      console.warn("new-order-notification: FCM request failed", {
        order_id: orderId,
        tenant_id: tenantId,
        company_code: companyCode,
        device_id: device.id,
      });
      return { status: "failed", device };
    }
  }));

  const notificationsSent = sendResults.filter(result => result.status === "sent").length;
  let failedCount = sendResults.filter(result => result.status === "failed").length;
  let devicesDeactivated = 0;

  for (const result of sendResults) {
    if (result.status !== "unregistered") continue;
    const { data, error } = await supabase
      .from("admin_device_tokens")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", result.device.id)
      .eq("device_token", result.device.device_token)
      .eq("tenant_id", tenantId)
      .eq("company_code", companyCode)
      .eq("platform", "web")
      .eq("is_active", true)
      .select("id");

    if (error) {
      failedCount += 1;
      console.error("new-order-notification: invalid token deactivation failed", {
        order_id: orderId,
        tenant_id: tenantId,
        company_code: companyCode,
        device_id: result.device.id,
        error_code: error.code || "UNKNOWN",
      });
      continue;
    }
    devicesDeactivated += data?.length || 0;
  }

  console.info("new-order-notification: processed", {
    order_id: orderId,
    tenant_id: tenantId,
    company_code: companyCode,
    devices_found: devices.length,
    notifications_sent: notificationsSent,
    failed_count: failedCount,
    devices_deactivated: devicesDeactivated,
  });

  return jsonResponse({
    success: failedCount === 0,
    devices_found: devices.length,
    notifications_sent: notificationsSent,
    failed_count: failedCount,
    devices_deactivated: devicesDeactivated,
  });
});