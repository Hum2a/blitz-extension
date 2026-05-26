import { supabase } from "./supabase.js";

export async function logAdminAction(action, targetUserId, meta = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return;
  await supabase.from("admin_audit_log").insert({
    actor_id: user.id,
    action,
    target_user_id: targetUserId || null,
    meta,
  });
}
