import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { target_user_id: targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: actor },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !actor) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", actor.id)
      .maybeSingle();

    if (roleRow?.role !== "developer") {
      return new Response(JSON.stringify({ error: "Developer role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === actor.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account from admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("sync_documents").delete().eq("user_id", targetUserId);
    await admin.from("synced_applications").delete().eq("user_id", targetUserId);
    await admin.from("license_entitlements").delete().eq("user_id", targetUserId);
    await admin.from("user_sync_meta").delete().eq("user_id", targetUserId);
    await admin.from("support_notes").delete().eq("user_id", targetUserId);
    await admin.from("client_events").delete().eq("user_id", targetUserId);
    await admin.from("user_roles").delete().eq("user_id", targetUserId);
    await admin.from("admin_profiles").delete().eq("user_id", targetUserId);

    await admin.from("admin_audit_log").insert({
      actor_id: actor.id,
      action: "admin_delete_user",
      target_user_id: targetUserId,
      meta: {},
    });

    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
