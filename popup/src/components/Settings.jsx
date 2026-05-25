import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAllSettings } from "../hooks/useStorage.js";
import { Stagger, FadeUp, Btn, PulseDots } from "./motion.jsx";
import {
  mergeStorage,
  getStorage,
  setStorage,
  saveProfileTexts,
  StorageError,
} from "../lib/storage.js";
import { extractTextFromPdf } from "../lib/pdf-parse.js";
import { FREE_APPLICATION_LIMIT } from "../lib/license.js";
import { LEMONSQUEEZY } from "../lib/config.js";
import {
  ANTHROPIC_MODEL_SUGGESTIONS,
  OPENAI_MODEL_SUGGESTIONS,
  ANTHROPIC_DEFAULT_MODEL,
} from "../lib/models.js";

import { scrollPanelClass } from "../lib/layout.js";

export default function Settings({ onSaved, fullPage = false }) {
  const { settings, loading, refresh } = useAllSettings();
  const [form, setForm] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [validatingLicense, setValidatingLicense] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [linkedinPdfLoading, setLinkedinPdfLoading] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef(null);
  const [availableModels, setAvailableModels] = useState(ANTHROPIC_MODEL_SUGGESTIONS);
  const [modelsLoading, setModelsLoading] = useState(false);

  const refreshModels = useCallback(async () => {
    if (form?.ai_config?.provider !== "anthropic") return;
    if (!form?.ai_config?.apiKey?.trim()) {
      setAvailableModels(ANTHROPIC_MODEL_SUGGESTIONS);
      return;
    }
    setModelsLoading(true);
    try {
      const result = await chrome.runtime.sendMessage({
        type: "LIST_ANTHROPIC_MODELS",
        payload: { apiKey: form.ai_config.apiKey },
      });
      if (result?.models?.length) {
        setAvailableModels(result.models);
        const ids = result.models.map((m) => m.id);
        if (form.ai_config.model && !ids.includes(form.ai_config.model)) {
          setForm((prev) => ({
            ...prev,
            ai_config: { ...prev.ai_config, model: result.models[0].id },
          }));
          setSaved(false);
        }
      }
    } catch {
      setAvailableModels(ANTHROPIC_MODEL_SUGGESTIONS);
    } finally {
      setModelsLoading(false);
    }
  }, [form?.ai_config?.apiKey, form?.ai_config?.provider, form?.ai_config?.model]);

  useEffect(() => {
    if (form?.ai_config?.provider === "anthropic" && form?.ai_config?.apiKey?.trim()) {
      refreshModels();
    } else if (form?.ai_config?.provider === "openai") {
      setAvailableModels(OPENAI_MODEL_SUGGESTIONS);
    }
  }, [form?.ai_config?.provider, form?.ai_config?.apiKey, refreshModels]);

  useEffect(() => {
    if (settings && !dirtyRef.current) {
      setForm(settings);
      setLicenseKey(settings.license?.key || "");
    }
  }, [settings]);

  const persistProfileTexts = useCallback(async (cvText, linkedinText) => {
    setProfileSaveStatus("saving");
    setSaveError(null);
    try {
      await saveProfileTexts({
        cv_text: cvText,
        linkedin_profile_text: linkedinText,
      });
      setProfileSaveStatus("saved");
      dirtyRef.current = false;
      onSaved?.();
      refresh();
      setTimeout(() => setProfileSaveStatus(null), 2500);
    } catch (err) {
      const msg =
        err instanceof StorageError
          ? err.message
          : err?.message || "Could not save profile text";
      setSaveError(msg);
      setProfileSaveStatus("error");
    }
  }, [onSaved, refresh]);

  const scheduleProfileAutosave = useCallback(
    (nextForm) => {
      dirtyRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        persistProfileTexts(nextForm.cv_text ?? "", nextForm.linkedin_profile_text ?? "");
      }, 800);
    },
    [persistProfileTexts]
  );

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  if (loading || !form) {
    return (
      <div className="py-12 flex justify-center">
        <PulseDots label="Loading settings…" />
      </div>
    );
  }

  const update = (path, value, { autosaveProfile = false } = {}) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      if (autosaveProfile) scheduleProfileAutosave(next);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveError(null);
    try {
      await mergeStorage({
        cv_text: form.cv_text ?? "",
        linkedin_profile_text: form.linkedin_profile_text ?? "",
        user_profile: form.user_profile,
        ai_config: form.ai_config,
        preferences: form.preferences,
      });
      dirtyRef.current = false;
      setSaved(true);
      setProfileSaveStatus("saved");
      onSaved?.();
      refresh();
      setTimeout(() => {
        setSaved(false);
        setProfileSaveStatus(null);
      }, 2500);
    } catch (err) {
      const msg =
        err instanceof StorageError
          ? err.message
          : err?.message || "Could not save settings";
      setSaveError(msg);
      alert(msg);
    }
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

  const handlePdfUpload = (field, setLoading) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setSaveError(null);
    try {
      const text = await extractTextFromPdf(file);
      if (!text?.trim()) {
        alert("No text found in this PDF. Try a different export or paste manually.");
        return;
      }
      const cvText = field === "cv_text" ? text : form.cv_text ?? "";
      const linkedinText =
        field === "linkedin_profile_text" ? text : form.linkedin_profile_text ?? "";
      setForm((prev) => ({
        ...prev,
        [field]: text,
      }));
      dirtyRef.current = true;
      await persistProfileTexts(cvText, linkedinText);
    } catch (err) {
      const msg = err?.message?.includes("Storage")
        ? err.message
        : "Could not parse PDF. Try pasting the text instead.";
      alert(msg);
    } finally {
      setLoading(false);
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
    <Stagger
      className={`space-y-4 text-sm pr-1 ${scrollPanelClass(fullPage, "max-h-[480px] overflow-y-auto overflow-x-hidden")} ${fullPage ? "max-w-3xl" : ""}`}
    >
      <Section title="AI provider" index={0}>
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
        {form.ai_config?.provider === "openai" ? (
          <select
            value={form.ai_config?.model || "gpt-4o"}
            onChange={(e) => update("ai_config.model", e.target.value)}
            className="w-full border rounded p-2 mt-2 font-mono text-xs"
          >
            {OPENAI_MODEL_SUGGESTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <select
              value={form.ai_config?.model || ANTHROPIC_DEFAULT_MODEL}
              onChange={(e) => update("ai_config.model", e.target.value)}
              className="w-full border rounded p-2 mt-2 font-mono text-xs"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label || m.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refreshModels}
              disabled={modelsLoading || !form.ai_config?.apiKey?.trim()}
              className="mt-1 text-xs text-blitz-600 underline disabled:opacity-50"
            >
              {modelsLoading ? "Loading models…" : "Refresh models from API"}
            </button>
          </>
        )}
        <p className="text-xs text-slate-500 mt-1">
          Older models (e.g. claude-3-5-sonnet) are retired — use Sonnet 4.6 or refresh from API.
        </p>
        <button
          type="button"
          onClick={handleTestKey}
          disabled={testing}
          className="mt-2 text-blitz-600 underline text-xs"
        >
          {testing ? "Testing…" : "Test API key"}
        </button>
      </Section>

      {(profileSaveStatus || saveError) && (
        <motion.p
          className={`text-xs text-center px-2 py-1 rounded ${
            saveError || profileSaveStatus === "error"
              ? "text-red-700 bg-red-50"
              : profileSaveStatus === "saving"
                ? "text-slate-600 bg-slate-100"
                : "text-green-700 bg-green-50"
          }`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {saveError ||
            (profileSaveStatus === "saving"
              ? "Saving CV & profile…"
              : "CV & profile saved automatically")}
        </motion.p>
      )}

      <Section title="Your CV" index={1}>
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload("cv_text", setPdfLoading)}
          disabled={pdfLoading}
          className="w-full text-xs mb-2"
        />
        {pdfLoading && <p className="text-xs text-slate-500 mb-1">Parsing & saving PDF…</p>}
        {form.cv_text?.trim() && !pdfLoading && (
          <p className="text-xs text-green-700 mb-1">
            {form.cv_text.length.toLocaleString()} characters
          </p>
        )}
        <textarea
          value={form.cv_text || ""}
          onChange={(e) => update("cv_text", e.target.value, { autosaveProfile: true })}
          rows={6}
          placeholder="Paste your CV as plain text"
          className="w-full border rounded p-2 font-mono text-xs"
        />
      </Section>

      <Section title="LinkedIn profile" index={2}>
        <p className="text-xs text-slate-500 mb-2">
          Export your profile as PDF from LinkedIn (Me → More → Save to PDF), then upload here.
          Blitz uses this alongside your CV for tailoring and screening answers.
        </p>
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload("linkedin_profile_text", setLinkedinPdfLoading)}
          disabled={linkedinPdfLoading}
          className="w-full text-xs mb-2"
        />
        {linkedinPdfLoading && (
          <p className="text-xs text-slate-500 mb-1">Parsing & saving LinkedIn PDF…</p>
        )}
        {form.linkedin_profile_text?.trim() && (
          <p className="text-xs text-green-700 mb-1">
            {form.linkedin_profile_text.length.toLocaleString()} characters loaded
            {form.linkedin_profile_text.length > 12000 ? " (will be trimmed for AI)" : ""}
          </p>
        )}
        <textarea
          value={form.linkedin_profile_text || ""}
          onChange={(e) =>
            update("linkedin_profile_text", e.target.value, { autosaveProfile: true })
          }
          rows={4}
          placeholder="LinkedIn profile text (optional)"
          className="w-full border rounded p-2 font-mono text-xs"
        />
        {form.linkedin_profile_text?.trim() ? (
          <button
            type="button"
            onClick={async () => {
              update("linkedin_profile_text", "");
              await persistProfileTexts(form.cv_text ?? "", "");
            }}
            className="mt-1 text-xs text-slate-500 underline"
          >
            Clear LinkedIn profile
          </button>
        ) : null}
      </Section>

      <Section title="Profile" index={3}>
        {[
          ["name", "Full name"],
          ["email", "Email"],
          ["phone", "Phone"],
          ["location", "Location"],
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

        <p className="text-xs font-semibold text-blitz-700 uppercase tracking-wide mt-3 mb-2">
          Links
        </p>
        {[
          ["github", "GitHub", "https://github.com/username"],
          ["linkedin", "LinkedIn profile URL", "https://linkedin.com/in/username"],
          ["portfolio", "Portfolio / website", "https://yoursite.com"],
        ].map(([key, label, placeholder]) => (
          <label key={key} className="block mb-2">
            <span className="text-xs text-slate-600 font-medium">{label}</span>
            <input
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder={placeholder}
              value={profile[key] || ""}
              onChange={(e) => update(`user_profile.${key}`, e.target.value)}
              className="w-full border rounded p-2 mt-0.5 text-xs"
            />
          </label>
        ))}

        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-2">
          Work preferences
        </p>
        {[
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

      <Section title="Preferences" index={4}>
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

      <Section title="License" index={5}>
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

      <FadeUp delay={0.3}>
        <Btn
          onClick={handleSave}
          className="w-full bg-blitz-600 text-white py-2 rounded-lg font-medium btn-shine"
        >
          Save settings
        </Btn>
        <AnimatePresence>
          {saved && (
            <motion.p
              className="text-green-600 text-xs text-center mt-2"
              initial={{ opacity: 0, y: -6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
            >
              Saved.
            </motion.p>
          )}
        </AnimatePresence>
      </FadeUp>
    </Stagger>
  );
}

function Section({ title, children, index = 0 }) {
  return (
    <FadeUp delay={index * 0.05}>
      <motion.div
        className="rounded-lg p-1 -mx-1"
        whileHover={{ backgroundColor: "rgba(240, 244, 255, 0.6)" }}
        transition={{ duration: 0.2 }}
      >
        <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">{title}</h3>
        {children}
      </motion.div>
    </FadeUp>
  );
}

