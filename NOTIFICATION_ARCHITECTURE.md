# NM Mart mobile push notification architecture

This project currently contains the shared Supabase admin panel and order RPC flow, but not the Android app project itself. The implementation below keeps the existing canonical order architecture untouched and adds a server-side-safe notification contract for the Android app when that project exists.

## 1. Canonical order creation path

The existing order creation path is:

- `src/erpController.js` dispatches the action
- `src/dbSync.js` calls the Supabase RPC `place_order_atomic`
- `supabase/migrations/functions/0207__harden_pos_checkout_v3.sql` executes the atomic order insert flow

This path remains the source of truth and is not bypassed.

## 2. Notification flow

1. Customer order is created through the existing order flow.
2. The database insert/update event is handled by a trusted server-side notification handler.
3. The handler verifies tenant/company scope and admin recipient roles.
4. The handler sends FCM messages using a server-side credential only.
5. Android devices registered against their admin user receive the push notification.

## 3. Required Supabase-side tables

The notification system should use a table similar to:

- `admin_device_tokens`
  - `id`
  - `user_id`
  - `tenant_id`
  - `company_code`
  - `device_token`
  - `platform`
  - `app_version`
  - `is_active`
  - `created_at`
  - `updated_at`
  - `last_seen_at`

No password, refresh token, service role key, or other secret should be stored here.

## 4. Authorization

Only admin roles should receive order notifications:

- `super_admin`
- `admin`
- `manager`

Cashiers and viewers are explicitly excluded.

## 5. Tenant isolation

Notifications must be filtered using both `tenant_id` and `company_code` from the created order versus the receiving admin device registration.

## 6. FCM setup

The Android app must integrate Firebase Cloud Messaging using the standard Firebase / Capacitor-compatible plugin flow.

Required steps in the Android project:

- create Firebase Android app
- add `google-services.json`
- add Firebase Gradle plugin to Android app module
- use the Capacitor Firebase messaging plugin or equivalent official FCM flow
- request notification permission on Android 13+
- obtain the device registration token
- store that token server-side under the correct user, tenant and company
- handle foreground/background tap behavior in the Android app

## 7. Important guardrails

- no `service_role` in browser code
- no `VITE_*` or React frontend storage of FCM server credentials
- no direct browser-to-FCM call
- no production order creation for notification tests
- notification send failures must never cancel a successful order

## 8. Local testing

1. Start local admin panel
2. Sign in as an admin user with admin/manager role
3. Register a test Android device token via the server-side registration endpoint or DB admin flow
4. Create a safe local order fixture in a test environment only
5. Confirm the server handler emits an FCM message to the registered token
6. Verify the payload and deep link target
7. Verify unauthorized users do not receive it

## 9. Production deployment

Production deployment must happen only after review and approval. This repo does not include the Android app and must not be published without that project being present and tested on a real device.
