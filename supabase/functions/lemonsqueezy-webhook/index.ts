import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
};

async function verifySignature(body: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === hex;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET") || "";
    if (!secret) {
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const signature = req.headers.get("X-Signature");
    if (!(await verifySignature(rawBody, signature, secret))) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload?.meta?.event_name || payload?.event_name || "unknown";
    const email =
      payload?.data?.attributes?.user_email ||
      payload?.data?.attributes?.customer_email ||
      payload?.meta?.custom_data?.email ||
      null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let userId: string | null = null;
    if (email) {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const match = list?.users?.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase()
      );
      userId = match?.id ?? null;
    }

    await admin.from("billing_events").insert({
      event_name: eventName,
      external_id: String(payload?.data?.id || payload?.meta?.event_id || ""),
      customer_email: email,
      user_id: userId,
      payload,
    });

    const proEvents = ["order_created", "subscription_created", "subscription_payment_success"];
    if (userId && proEvents.includes(eventName)) {
      await admin.from("license_entitlements").upsert(
        {
          user_id: userId,
          tier: "pro",
          source: "lemonsqueezy",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      await admin.from("admin_audit_log").insert({
        actor_id: null,
        action: "lemonsqueezy_pro_grant",
        target_user_id: userId,
        meta: { event_name: eventName, email },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
