import { useState } from "react";
import { supabase } from "../lib/supabase.js";
import {
  checkAdminEmailLoginAllowed,
  sendStaffEmailOtp,
  isEmailRateLimitError,
} from "../lib/admin-email-auth.js";

/**
 * Staff sign-in: Google (all admin/developer) or email OTP (developers only, pre-provisioned).
 */
export default function Login() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailStep, setEmailStep] = useState("idle"); // idle | allowed | sent
  const [emailCheckError, setEmailCheckError] = useState(null);

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (err) setError(err.message);
    setBusy(false);
  }

  async function checkEmail(e) {
    e?.preventDefault();
    setEmailCheckError(null);
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) return;

    setBusy(true);
    const result = await checkAdminEmailLoginAllowed(supabase, trimmed);
    setBusy(false);

    if (result.error) {
      setEmailCheckError(result.error);
      setEmailStep("idle");
      return;
    }
    if (!result.allowed) {
      setEmailCheckError(
        "Email OTP is not enabled for this address. Use Google, or ask a developer to enable email login in Roles."
      );
      setEmailStep("idle");
      return;
    }
    setEmailStep("allowed");
  }

  async function sendOtp(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await sendStaffEmailOtp(supabase, email);
    setBusy(false);
    if (err) {
      if (isEmailRateLimitError(err)) {
        setError(
          "Too many emails sent. Wait a few minutes, or use the code from your last email below. You can also use Google sign-in."
        );
        setEmailStep("sent");
      } else if (/signups not allowed|user not found/i.test(err.message)) {
        setError(
          "No account exists for this email yet. Sign in with Google once (extension or here), then ask a developer to enable email login."
        );
      } else {
        setError(err.message);
      }
      return;
    }
    setEmailStep("sent");
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (err) setError(err.message);
  }

  return (
    <div className="center">
      <div className="card login-card">
        <h1>Blitz Admin</h1>
        <p className="muted">
          Internal dashboard for <strong>admin</strong> and <strong>developer</strong> staff.
        </p>

        <button type="button" className="btn primary" disabled={busy} onClick={signInGoogle}>
          {busy && emailStep === "idle" ? "Redirecting…" : "Sign in with Google"}
        </button>

        <hr />

        <p className="muted" style={{ marginTop: "1rem", fontWeight: 600 }}>
          Staff email (developers only)
        </p>
        <p className="muted small">
          For existing developer accounts with email login enabled. Does not create new users.
        </p>

        <form onSubmit={emailStep === "sent" ? verifyOtp : emailStep === "allowed" ? sendOtp : checkEmail} className="stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailStep !== "idle") setEmailStep("idle");
                setEmailCheckError(null);
              }}
              required
              autoComplete="email"
              disabled={busy}
            />
          </label>

          {emailStep === "sent" && (
            <label>
              One-time code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                disabled={busy}
              />
            </label>
          )}

          <button type="submit" className="btn" disabled={busy || !email.trim()}>
            {emailStep === "sent" ? "Verify code" : emailStep === "allowed" ? "Send code" : "Continue with email"}
          </button>
        </form>

        {emailCheckError && <p className="error">{emailCheckError}</p>}
        {error && <p className="error">{error}</p>}

        <p className="muted small" style={{ marginTop: "1.25rem" }}>
          Roles are assigned in the database or <strong>Roles</strong> page — not via this login.
          Google setup: <code>docs/ADMIN_GOOGLE_AUTH.md</code>
        </p>
      </div>
    </div>
  );
}
