import { useState, useEffect } from "react";
import { useAllSettings } from "../hooks/useStorage.js";
import { mergeStorage } from "../lib/storage.js";

export default function Settings({ onSaved }) {
  const { settings, loading, refresh } = useAllSettings();
  const [form, setForm] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
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

  const profile = form.user_profile || {};

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
