/** Supabase Auth email / OTP rate-limit helpers (user-facing). */

export function isEmailRateLimitError(err) {
  const m = String(err?.message || err || "").toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("too many") ||
    m.includes("over_email_send_rate_limit")
  );
}

/** Best-effort cooldown until another OTP can be requested. */
export function rateLimitCooldownMs(err) {
  const m = String(err?.message || "").toLowerCase();
  if (m.includes("exceeded")) return 60 * 60 * 1000;
  return 60 * 1000;
}

export function formatRateLimitMessage(remainingSec) {
  if (remainingSec >= 3600) {
    const mins = Math.ceil(remainingSec / 60);
    return `Too many sign-in emails were sent. Wait about ${mins} minutes, or use a code from your last email and tap Verify below. You can also sign in with Google.`;
  }
  if (remainingSec > 60) {
    const mins = Math.ceil(remainingSec / 60);
    return `Please wait ${mins} minute${mins === 1 ? "" : "s"} before requesting another code. If you already received a code, enter it below and tap Verify.`;
  }
  return `Please wait ${remainingSec || 60} seconds before requesting another code. If you already received a code, enter it below and tap Verify.`;
}
