import { supabase } from "./supabase.js";
import { logAdminAction } from "./audit.js";

const LICENSE_ENDPOINT =
  import.meta.env.VITE_LICENSE_ENDPOINT ||
  "https://license.blitzai.online";

export async function validateLicenseKey(key) {
  const res = await fetch(LICENSE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: key.trim() }),
  });
  return res.json();
}

export async function setUserLicenseTier(userId, tier, { source = "admin_dashboard" } = {}) {
  const { error } = await supabase.from("license_entitlements").upsert(
    {
      user_id: userId,
      tier,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  await logAdminAction("license_tier_change", userId, { tier, source });
}

export async function linkLicenseKeyForUser(userId, key) {
  const result = await validateLicenseKey(key);
  if (!result?.valid) {
    throw new Error(result?.message || "Invalid license key");
  }
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(key.trim()));
  const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
  const { error } = await supabase.from("license_entitlements").upsert(
    {
      user_id: userId,
      tier: "pro",
      source: "admin_license_key",
      license_key_hash: hash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  await logAdminAction("license_key_linked", userId, { tier: "pro" });
  return result;
}

export async function resetApplicationsUsed(userId) {
  const { error } = await supabase
    .from("license_entitlements")
    .update({ applications_used: 0, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
  await logAdminAction("license_reset_usage", userId, {});
}

export async function setLicenseExpiry(userId, expiresAt) {
  const { error } = await supabase
    .from("license_entitlements")
    .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
  await logAdminAction("license_expiry_change", userId, { expires_at: expiresAt });
}
