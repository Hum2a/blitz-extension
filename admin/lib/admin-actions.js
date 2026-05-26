import { supabase } from "./supabase.js";
import { logAdminAction } from "./audit.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function invokeAdminFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${name} failed (${res.status})`);
  return data;
}

export async function setAccountStatus(userId, status) {
  const { error } = await supabase.rpc("admin_set_account_status", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw error;
  await logAdminAction("account_status_change", userId, { status });
}

export async function resetUserSync(userId) {
  const { data, error } = await supabase.rpc("admin_reset_user_sync", {
    p_user_id: userId,
  });
  if (error) throw error;
  await logAdminAction("admin_reset_sync", userId, data || {});
  return data;
}

export async function revokeUserSessions(userId) {
  const data = await invokeAdminFunction("admin-revoke-sessions", {
    target_user_id: userId,
  });
  return data;
}

export async function deleteUserAccount(userId) {
  const data = await invokeAdminFunction("admin-delete-user", {
    target_user_id: userId,
  });
  return data;
}

export async function addSupportNote(userId, note) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("support_notes").insert({
    user_id: userId,
    author_id: user?.id,
    note: note.trim(),
  });
  if (error) throw error;
  await logAdminAction("support_note_added", userId, {});
}
