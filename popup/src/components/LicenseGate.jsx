import { useState } from "react";
import { setStorage, getStorage } from "../lib/storage.js";

export default function LicenseGate({ onSettings }) {
  const [key, setKey] = useState("");
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: "VALIDATE_LICENSE",
        payload: { key },
      });
      if (result?.valid) {
        const license = await getStorage("license");
        await setStorage("license", {
          ...license,
          key,
          tier: result.tier,
          validatedAt: new Date().toISOString(),
        });
        window.location.reload();
      } else {
        alert(result?.message || "Invalid license key");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="p-6 text-center min-h-[520px] flex flex-col justify-center">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        You&apos;ve used your 15 free applications
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Upgrade to Pro for unlimited applications, or enter your license key.
      </p>
      <a
        href="https://getblitz.lemonsqueezy.com/checkout"
        target="_blank"
        rel="noreferrer"
        className="block w-full bg-blitz-600 text-white py-2.5 rounded-lg font-medium mb-4 hover:bg-blitz-700"
      >
        Upgrade to Pro — £8/mo or £49/year
      </a>
      <div className="space-y-2">
        <input
          type="text"
          placeholder="License key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm"
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={validating || !key.trim()}
          className="w-full border border-slate-300 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {validating ? "Validating…" : "Activate license"}
        </button>
      </div>
      <button type="button" onClick={onSettings} className="mt-4 text-xs text-slate-500 underline">
        Settings
      </button>
    </div>
  );
}
