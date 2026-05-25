import { useState } from "react";

export default function SyncPassphraseModal({ mode, onConfirm, onCancel }) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);

  const isSetup = mode === "setup";
  const mismatch = isSetup && confirm && passphrase !== confirm;
  const canSubmit =
    passphrase.length >= 8 && (!isSetup || (confirm === passphrase && confirm.length >= 8));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-labelledby="sync-passphrase-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 id="sync-passphrase-title" className="text-lg font-semibold text-slate-900">
          {isSetup ? "Create sync passphrase" : "Enter sync passphrase"}
        </h2>
        <p className="text-sm text-slate-600">
          {isSetup
            ? "This encrypts your CV and profile before upload. Blitz cannot recover it if you forget it."
            : "Required to decrypt cloud data on this device."}
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
        {isSetup && (
          <label className="block text-sm font-medium text-slate-700">
            Confirm passphrase
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        )}
        {mismatch && <p className="text-sm text-red-600">Passphrases do not match</p>}
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="rounded border-slate-300"
          />
          Remember on this device (until extension reload)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => onConfirm(passphrase, remember)}
            className="px-4 py-2 text-sm bg-blitz-600 text-white rounded-lg disabled:opacity-50"
          >
            {isSetup ? "Enable sync" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
