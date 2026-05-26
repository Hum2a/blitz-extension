import { useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
    setBusy(false);
  }

  async function sendOtp(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
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
        <p className="muted">Sign in with an admin or developer account.</p>
        <button type="button" className="btn primary" disabled={busy} onClick={signInGoogle}>
          Sign in with Google
        </button>
        <hr />
        <form onSubmit={sent ? verifyOtp : sendOtp} className="stack">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {sent && (
            <label>
              One-time code
              <input value={code} onChange={(e) => setCode(e.target.value)} required />
            </label>
          )}
          <button type="submit" className="btn" disabled={busy}>
            {sent ? "Verify code" : "Send code"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
