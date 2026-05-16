import { useState, useEffect } from "react";
import { useAllSettings } from "../hooks/useStorage.js";
import { mergeStorage, getStorage, setStorage } from "../lib/storage.js";
import { extractTextFromPdf } from "../lib/pdf-parse.js";
import { FREE_APPLICATION_LIMIT } from "../lib/license.js";
import { LEMONSQUEEZY } from "../lib/config.js";

export default function Settings({ onSaved }) {
  const { settings, loading, refresh } = useAllSettings();
  const [form, setForm] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [validatingLicense, setValidatingLicense] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
      setLicenseKey(settings.license?.key || "");
    }
  }, [settings]);

  if (loading || !form) {
    return <p className="text-sm text-slate-500">Loading settings…</p>;
  }

  const update = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    await mergeStorage({
      cv_text: form.cv_text,
      user_profile: form.user_profile,
      ai_config: form.ai_config,
      preferences: form.preferences,
    });
    setSaved(true);
    onSaved?.();
    refresh();
  };

  const handleTestKey = async () => {
    setTesting(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: "TEST_API_KEY",
        payload: form.ai_config,
      });
      if (result?.error) throw new Error(result.error);
      alert(result?.ok ? "API key works." : "Unexpected response from API.");
    } catch (err) {
      alert(err.message || "API test failed");
    } finally {
      setTesting(false);
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    try {
      const text = await extractTextFromPdf(file);
      update("cv_text", text);
    } catch (err) {
      alert("Could not parse PDF. Try pasting your CV as text.");
    } finally {
      setPdfLoading(false);
      e.target.value = "";
    }
  };

  const handleActivateLicense = async () => {
    setValidatingLicense(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: "VALIDATE_LICENSE",
        payload: { key: licenseKey },
      });
      if (result?.valid) {
        const license = await getStorage("license");
        await setStorage("license", {
          ...license,
          key: licenseKey,
          tier: result.tier,
          validatedAt: new Date().toISOString(),
        });
        alert("License activated.");
        onSaved?.();
        refresh();
      } else {
        alert(result?.message || "Invalid license key");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setValidatingLicense(false);
    }
  };

  const profile = form.user_profile || {};
  const license = form.license || {};
  const used = license.applicationsUsed ?? 0;
  const isPro = license.tier === "pro";

  return (
    <div className="space-y-4 max-h-[440px] overflow-y-auto text-sm">
      <Section title="AI provider">
        <select
          value={form.ai_config?.provider || "anthropic"}
          onChange={(e) => update("ai_config.provider", e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
        </select>
        <input
          type="password"
          placeholder="API key"
          value={form.ai_config?.apiKey || ""}
          onChange={(e) => update("ai_config.apiKey", e.target.value)}
          className="w-full border rounded p-2 mt-2"
        />
        <input
          type="text"
          placeholder="Model"
          value={form.ai_config?.model || ""}
          onChange={(e) => update("ai_config.model", e.target.value)}
          className="w-full border rounded p-2 mt-2"
        />
        <button
          type="button"
          onClick={handleTestKey}
          disabled={testing}
          className="mt-2 text-blitz-600 underline text-xs"
        >
          {testing ? "Testing…" : "Test API key"}
        </button>
      </Section>

      <Section title="Your CV">
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          disabled={pdfLoading}
          className="w-full text-xs mb-2"
        />
        {pdfLoading && <p className="text-xs text-slate-500 mb-1">Parsing PDF…</p>}
        <textarea
          value={form.cv_text || ""}
          onChange={(e) => update("cv_text", e.target.value)}
          rows={6}
          placeholder="Paste your CV as plain text"
          className="w-full border rounded p-2 font-mono text-xs"
        />
      </Section>

      <Section title="Profile">
        {[
          ["name", "Full name"],
          ["email", "Email"],
          ["phone", "Phone"],
          ["location", "Location"],
          ["rightToWork", "Right to work"],
          ["noticePeriod", "Notice period"],
          ["salaryExpectation", "Salary expectation"],
        ].map(([key, label]) => (
          <input
            key={key}
            type="text"
            placeholder={label}
            value={profile[key] || ""}
            onChange={(e) => update(`user_profile.${key}`, e.target.value)}
            className="w-full border rounded p-2 mb-2"
          />
        ))}
        <select
          value={profile.remotePreference || "Hybrid"}
          onChange={(e) => update("user_profile.remotePreference", e.target.value)}
          className="w-full border rounded p-2"
        >
          <option>Remote</option>
          <option>Hybrid</option>
          <option>On-site</option>
        </select>
      </Section>

      <Section title="Preferences">
        <label className="flex items-center gap-2 mt-2">
          <span>Cover letter</span>
          <select
            value={form.preferences?.coverLetterMode || "always"}
            onChange={(e) => update("preferences.coverLetterMode", e.target.value)}
            className="border rounded p-1 flex-1"
          >
            <option value="always">Always</option>
            <option value="never">Never</option>
            <option value="ask">Ask</option>
          </select>
        </label>
        <label className="flex items-center gap-2 mt-2">
          <span>CV template</span>
          <select
            value={form.preferences?.cvTemplate || "modern"}
            onChange={(e) => update("preferences.cvTemplate", e.target.value)}
            className="border rounded p-1 flex-1"
          >
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
            <option value="classic">Classic</option>
          </select>
        </label>
        <label className="flex items-center gap-2 mt-2 text-xs">
          <input
            type="checkbox"
            checked={form.preferences?.autoSubmit ?? false}
            onChange={(e) => update("preferences.autoSubmit", e.target.checked)}
          />
          Auto-submit after fill (LinkedIn)
        </label>
      </Section>

      <Section title="License">
        <p className="text-xs text-slate-600 mb-2">
          {isPro ? (
            <span className="text-green-700 font-medium">Pro — unlimited applications</span>
          ) : (
            <>
              Free tier — {used} / {FREE_APPLICATION_LIMIT} applications used
            </>
          )}
        </p>
        {!isPro && (
          <div className="flex flex-col gap-2 mb-2">
            <a
              href={LEMONSQUEEZY.checkoutMonthly}
              target="_blank"
              rel="noreferrer"
              className="text-center bg-blitz-600 text-white py-2 rounded text-xs"
            >
              Upgrade — £8/mo
            </a>
            <a
              href={LEMONSQUEEZY.checkoutYearly}
              target="_blank"
              rel="noreferrer"
              className="text-center border border-blitz-600 text-blitz-700 py-2 rounded text-xs"
            >
              Upgrade — £49/yr
            </a>
          </div>
        )}
        <input
          type="text"
          placeholder="License key"
          value={licenseKey}
          onChange={(e) => setLicenseKey(e.target.value)}
          className="w-full border rounded p-2 mb-2"
        />
        <button
          type="button"
          onClick={handleActivateLicense}
          disabled={validatingLicense || !licenseKey.trim()}
          className="w-full border py-2 rounded text-xs disabled:opacity-50"
        >
          {validatingLicense ? "Validating…" : "Activate license"}
        </button>
      </Section>

      <button
        type="button"
        onClick={handleSave}
        className="w-full bg-blitz-600 text-white py-2 rounded-lg font-medium"
      >
        Save settings
      </button>
      {saved && <p className="text-green-600 text-xs text-center">Saved.</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">{title}</h3>
      {children}
    </div>
  );
}

