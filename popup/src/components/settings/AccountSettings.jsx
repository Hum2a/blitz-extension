import { useState, useEffect, useCallback } from "react";
import SettingsCard, { SettingsField, SettingsInput } from "./SettingsCard.jsx";
import SyncPassphraseModal from "./SyncPassphraseModal.jsx";
import { SUPABASE_CONFIGURED } from "../../lib/config.js";
import { accountRequest } from "../../lib/account-api.js";
import { clearAccountUiState } from "../../lib/ui-state.js";
import { usePersistedUiSlice } from "../../hooks/usePersistedUiSlice.js";
import { useModal } from "../../hooks/useModal.js";

const DEFAULT_STATUS = {
  configured: SUPABASE_CONFIGURED,
  signedIn: false,
  email: null,
  syncEnabled: false,
  sync: { enabled: false, lastSyncAt: null, lastError: null, pendingCount: 0 },
};

export default function AccountSettings() {
  const { showAlert, showConfirm } = useModal();
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accountUi, setAccountUi] = usePersistedUiSlice("account", {
    otpEmail: "",
    otpCode: "",
    otpSent: false,
    otpSentAt: null,
  });
  const { otpEmail, otpCode, otpSent } = accountUi;
  const setOtpEmail = (v) =>
    setAccountUi((u) => ({ ...u, otpEmail: typeof v === "function" ? v(u.otpEmail) : v }));
  const setOtpCode = (v) =>
    setAccountUi((u) => ({ ...u, otpCode: typeof v === "function" ? v(u.otpCode) : v }));
  const [passphraseModal, setPassphraseModal] = useState(null);

  const refresh = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setStatus(DEFAULT_STATUS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await accountRequest("ACCOUNT_GET_STATUS");
      if (res?.error) throw new Error(res.error);
      setStatus({ ...DEFAULT_STATUS, ...res, sync: { ...DEFAULT_STATUS.sync, ...res?.sync } });
    } catch (err) {
      setStatus({
        ...DEFAULT_STATUS,
        configured: true,
        error: err.message || "Could not load account status",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!status.signedIn) return;
    clearAccountUiState().catch(() => {});
    setAccountUi({ otpEmail: "", otpCode: "", otpSent: false, otpSentAt: null });
  }, [status.signedIn, setAccountUi]);

  async function run(type, payload) {
    setBusy(true);
    try {
      const result = await accountRequest(type, payload);
      if (result?.error) throw new Error(result.error);
      await refresh();
      return result;
    } catch (err) {
      await showAlert(err.message || "Request failed", { title: "Account" });
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function openPassphraseModal(mode) {
    return new Promise((resolve, reject) => {
      setPassphraseModal({
        mode,
        onDone: (passphrase, remember) => {
          setPassphraseModal(null);
          resolve({ passphrase, rememberOnDevice: remember });
        },
        onCancel: () => {
          setPassphraseModal(null);
          reject(new Error("Cancelled"));
        },
      });
    });
  }

  async function handleGoogleSignIn() {
    await run("AUTH_SIGN_IN_GOOGLE");
    if (!status?.syncEnabled) {
      try {
        const { passphrase, rememberOnDevice } = await openPassphraseModal("setup");
        await run("SYNC_ENABLE", { passphrase, rememberOnDevice });
        await showAlert("Cloud sync is enabled. Your CV and settings are encrypted before upload.", {
          title: "Sync enabled",
        });
      } catch {
        /* user skipped passphrase */
      }
    }
  }

  async function handleSendOtp() {
    if (!otpEmail.trim()) return;
    await run("AUTH_SEND_OTP", { email: otpEmail.trim() });
    setAccountUi((u) => ({ ...u, otpSent: true, otpSentAt: Date.now() }));
    await showAlert(
      "Check your email for a 6-digit code and enter it below. If you only received a confirmation link (e.g. to localhost), update Supabase email templates — see docs/SYNC_AND_AUTH.md → Email OTP.",
      { title: "Email sent" }
    );
  }

  async function handleVerifyOtp() {
    await run("AUTH_VERIFY_OTP", { email: otpEmail.trim(), token: otpCode.trim() });
    await clearAccountUiState();
    setAccountUi({ otpEmail: "", otpCode: "", otpSent: false, otpSentAt: null });
  }

  async function handleEnableSync() {
    const { passphrase, rememberOnDevice } = await openPassphraseModal(
      status?.syncEnabled ? "unlock" : "setup"
    );
    if (status?.syncEnabled) {
      await run("SYNC_UNLOCK", { passphrase, rememberOnDevice });
    } else {
      await run("SYNC_ENABLE", { passphrase, rememberOnDevice });
    }
    await showAlert("Sync encryption unlocked on this device.", { title: "Sync" });
  }

  async function handleSyncNow() {
    let payload = {};
    try {
      const { passphrase } = await openPassphraseModal("unlock");
      payload = { passphrase };
    } catch {
      return;
    }
    await run("SYNC_NOW", payload);
    await showAlert("Sync completed.", { title: "Sync" });
  }

  async function handleSignOut() {
    const ok = await showConfirm("Sign out? Local data stays on this device; cloud sync stops.", {
      title: "Sign out",
      confirmLabel: "Sign out",
    });
    if (!ok) return;
    await run("AUTH_SIGN_OUT");
  }

  async function handleDeleteAccount() {
    const ok = await showConfirm(
      "Permanently delete your cloud account and encrypted data? This cannot be undone. Local data remains.",
      { title: "Delete cloud account", confirmLabel: "Delete", destructive: true }
    );
    if (!ok) return;
    await run("SYNC_DELETE_ACCOUNT");
    await showAlert("Cloud account deleted.", { title: "Account" });
  }

  async function handleResetCloud() {
    const ok = await showConfirm(
      "Delete all encrypted data from the cloud? You will need your sync passphrase to upload again.",
      { title: "Reset cloud data", confirmLabel: "Reset", destructive: true }
    );
    if (!ok) return;
    await run("SYNC_RESET_CLOUD");
    await showAlert("Cloud data cleared.", { title: "Sync" });
  }

  async function handleExport() {
    let payload = {};
    try {
      const { passphrase } = await openPassphraseModal("unlock");
      payload = { passphrase };
    } catch {
      return;
    }
    const data = await run("SYNC_EXPORT", payload);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blitz-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!SUPABASE_CONFIGURED) {
    return (
      <SettingsCard
        id="settings-account"
        title="Account & sync"
        description="Optional encrypted backup across devices."
      >
        <p className="text-sm text-slate-600">
          Cloud sync is not configured. Add <code className="text-xs">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to <code className="text-xs">.env</code>,
          run <code className="text-xs">npm run config:sync</code>, then rebuild (see docs/SYNC_AND_AUTH.md).
        </p>
        <p className="text-sm text-slate-500">
          Blitz works fully offline without an account. Your AI API key never leaves this device.
        </p>
      </SettingsCard>
    );
  }

  const signedIn = Boolean(status?.signedIn);
  const syncEnabled = Boolean(status?.syncEnabled);

  return (
    <>
      <SettingsCard
        id="settings-account"
        title="Account & sync"
        description={
          loading
            ? "Checking sign-in status…"
            : "Encrypt CV and settings in the cloud. AI API keys stay on this device only."
        }
      >
        {loading ? (
          <p className="text-sm text-slate-500">Loading account status…</p>
        ) : (
          <>
            {status?.error && (
              <p className="text-sm text-amber-800 mb-3">
                {status.error}
                <button
                  type="button"
                  className="ml-2 underline"
                  onClick={() => refresh()}
                >
                  Retry
                </button>
              </p>
            )}

            {signedIn ? (
              <p className="text-sm text-green-700 font-medium">Signed in as {status.email}</p>
            ) : (
              <p className="text-sm text-slate-600">
                Continue using Blitz locally, or sign in to sync encrypted data across devices.
              </p>
            )}

            {!signedIn && (
              <div className="space-y-3 mt-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGoogleSignIn}
                  className="w-full sm:w-auto bg-blitz-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blitz-700 disabled:opacity-50"
                >
                  Sign in with Google
                </button>
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <SettingsField label="Email one-time code">
                    <SettingsInput
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </SettingsField>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !otpEmail.trim()}
                      onClick={handleSendOtp}
                      className="border border-slate-300 py-2 px-3 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      Send code
                    </button>
                    {otpSent && (
                      <>
                        <p className="text-xs text-slate-500 w-full">
                          Code sent — you can close the popup and return here to enter it.
                        </p>
                        <SettingsInput
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="6-digit code"
                          className="max-w-[140px]"
                        />
                        <button
                          type="button"
                          disabled={busy || otpCode.length < 4}
                          onClick={handleVerifyOtp}
                          className="bg-blitz-600 text-white py-2 px-3 rounded-lg text-sm disabled:opacity-50"
                        >
                          Verify
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {signedIn && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-500">
                  {syncEnabled
                    ? status.sync?.lastSyncAt
                      ? `Last sync: ${new Date(status.sync.lastSyncAt).toLocaleString()}`
                      : "Sync enabled — waiting for first upload"
                    : "Sign-in complete — enable sync with a passphrase below"}
                  {status.sync?.lastError && (
                    <span className="block text-amber-700 mt-1">Error: {status.sync.lastError}</span>
                  )}
                  {status.sync?.pendingCount > 0 && (
                    <span className="block mt-1">{status.sync.pendingCount} change(s) pending upload</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleEnableSync}
                    className="border border-slate-300 py-2 px-3 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {syncEnabled ? "Unlock sync passphrase" : "Enable encrypted sync"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !syncEnabled}
                    onClick={handleSyncNow}
                    className="bg-blitz-600 text-white py-2 px-3 rounded-lg text-sm disabled:opacity-50"
                  >
                    Sync now
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleExport}
                    className="border border-slate-300 py-2 px-3 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Export data
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSignOut}
                    className="border border-slate-300 py-2 px-3 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Sign out
                  </button>
                </div>
                <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleResetCloud}
                    className="text-sm text-amber-800 hover:underline disabled:opacity-50"
                  >
                    Reset cloud data
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDeleteAccount}
                    className="text-sm text-red-700 hover:underline disabled:opacity-50"
                  >
                    Delete cloud account
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SettingsCard>

      {passphraseModal && (
        <SyncPassphraseModal
          mode={passphraseModal.mode}
          onConfirm={passphraseModal.onDone}
          onCancel={passphraseModal.onCancel}
        />
      )}
    </>
  );
}
