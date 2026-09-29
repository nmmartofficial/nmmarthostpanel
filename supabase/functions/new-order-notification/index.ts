import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Only POST requests are allowed",
        }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const payload = await req.json();

    console.log("New order webhook received:", payload);

    return new Response(
      JSON.stringify({
        success: true,
        message: "New order notification function received the order",
        received: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("New order notification error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Invalid request payload",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});