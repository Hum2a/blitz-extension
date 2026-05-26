/**
 * Staff email OTP for admin portal — existing Supabase users only (shouldCreateUser: false).
 * Allowed when email is on VITE_ADMIN_EMAIL_ALLOWLIST or admin_profiles.allow_email_login.
 */

const ENV_ALLOWLIST = (import.meta.env.VITE_ADMIN_EMAIL_ALLOWLIST || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isEmailOnEnvAllowlist(email) {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && ENV_ALLOWLIST.includes(normalized);
}

export async function checkAdminEmailLoginAllowed(supabase, email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { allowed: false };

  if (isEmailOnEnvAllowlist(normalized)) {
    return { allowed: true, source: "env" };
  }

  const { data, error } = await supabase.rpc("admin_portal_email_login_allowed", {
    check_email: normalized,
  });
  if (error) return { allowed: false, error: error.message };
  return { allowed: Boolean(data), source: "database" };
}

export async function sendStaffEmailOtp(supabase, email) {
  return supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: window.location.origin,
    },
  });
}

export function isEmailRateLimitError(err) {
  const m = String(err?.message || err || "").toLowerCase();
  return m.includes("rate limit") || m.includes("too many");
}
