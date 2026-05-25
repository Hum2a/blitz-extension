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
import SettingsLayout from "./settings/SettingsLayout.jsx";
import SettingsCard, {
  SettingsField,
  SettingsInput,
  SettingsSelect,
} from "./settings/SettingsCard.jsx";
import CvTemplateEditor from "./CvTemplateEditor.jsx";
import AppearanceSettings from "./settings/AppearanceSettings.jsx";
import { useModal } from "../hooks/useModal.js";

export default function Settings({ onSaved, fullPage = false }) {
  const { showAlert } = useModal();
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

  const persistProfileTexts = useCallback(
    async (cvText, linkedinText) => {
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
    },
    [onSaved, refresh]
  );

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

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

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
        err instanceof StorageError ? err.message : err?.message || "Could not save settings";
      setSaveError(msg);
      await showAlert(msg, { title: "Could not save", variant: "error" });
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
      await showAlert(
        result?.ok ? "API key works." : "Unexpected response from API.",
        {
          title: result?.ok ? "Connection OK" : "Unexpected response",
          variant: result?.ok ? "success" : "warning",
        }
      );
    } catch (err) {
      await showAlert(err.message || "API test failed", {
        title: "API test failed",
        variant: "error",
      });
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
        await showAlert("No text found in this PDF. Try a different export or paste manually.", {
          title: "PDF empty",
          variant: "warning",
        });
        return;
      }
      const cvText = field === "cv_text" ? text : form.cv_text ?? "";
      const linkedinText =
        field === "linkedin_profile_text" ? text : form.linkedin_profile_text ?? "";
      setForm((prev) => ({ ...prev, [field]: text }));
      dirtyRef.current = true;
      await persistProfileTexts(cvText, linkedinText);
    } catch (err) {
      const msg = err?.message?.includes("Storage")
        ? err.message
        : "Could not parse PDF. Try pasting the text instead.";
      await showAlert(msg, { title: "PDF import failed", variant: "error" });
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
        await showAlert("License activated.", { title: "Pro activated", variant: "success" });
        onSaved?.();
        refresh();
      } else {
        await showAlert(result?.message || "Invalid license key", {
          title: "Invalid license",
          variant: "error",
        });
      }
    } catch (err) {
      await showAlert(err.message, { title: "License error", variant: "error" });
    } finally {
      setValidatingLicense(false);
    }
  };

  const profile = form.user_profile || {};
  const license = form.license || {};
  const used = license.applicationsUsed ?? 0;
  const isPro = license.tier === "pro";

  const statusBanner = (profileSaveStatus || saveError) && (
    <motion.div
      className={`text-sm px-4 py-3 rounded-lg border ${
        saveError || profileSaveStatus === "error"
          ? "text-red-800 bg-red-50 border-red-200"
          : profileSaveStatus === "saving"
            ? "text-slate-700 bg-slate-50 border-slate-200"
            : "text-green-800 bg-green-50 border-green-200"
      }`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {saveError ||
        (profileSaveStatus === "saving"
          ? "Saving CV & LinkedIn text…"
          : "CV & LinkedIn text saved automatically")}
    </motion.div>
  );

  const footer = (
    <FadeUp delay={0.1}>
      <div className="flex flex-wrap items-center gap-3 pt-2 pb-1 border-t border-slate-200">
        <Btn
          onClick={handleSave}
          className="bg-blitz-600 text-white px-6 py-2.5 rounded-lg font-medium btn-shine"
        >
          Save all settings
        </Btn>
        <p className="text-xs text-slate-500">CV template saves with its own button above.</p>
        <AnimatePresence>
          {saved && (
            <motion.span
              className="text-green-700 text-sm font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Saved.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </FadeUp>
  );

  return (
    <Stagger
      className={`text-sm ${scrollPanelClass(fullPage, "max-h-[480px] overflow-y-auto overflow-x-hidden pr-1")}`}
    >
      <SettingsLayout fullPage={fullPage} footer={footer}>
        {statusBanner}

        <AppearanceSettings fullPage={fullPage} />

        <SettingsCard
          id="settings-ai"
          title="AI & API"
          description="Bring your own key. Blitz sends job data and your CV to the model you choose."
        >
          <SettingsField label="Provider">
            <SettingsSelect
              value={form.ai_config?.provider || "anthropic"}
              onChange={(e) => update("ai_config.provider", e.target.value)}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </SettingsSelect>
          </SettingsField>
          <SettingsField label="API key" hint="Stored locally in your browser only.">
            <SettingsInput
              type="password"
              placeholder="sk-… or Anthropic key"
              value={form.ai_config?.apiKey || ""}
              onChange={(e) => update("ai_config.apiKey", e.target.value)}
            />
          </SettingsField>
          {form.ai_config?.provider === "openai" ? (
            <SettingsField label="Model">
              <SettingsSelect
                value={form.ai_config?.model || "gpt-4o"}
                onChange={(e) => update("ai_config.model", e.target.value)}
                className="font-mono text-xs"
              >
                {OPENAI_MODEL_SUGGESTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </SettingsSelect>
            </SettingsField>
          ) : (
            <>
              <SettingsField label="Model">
                <SettingsSelect
                  value={form.ai_config?.model || ANTHROPIC_DEFAULT_MODEL}
                  onChange={(e) => update("ai_config.model", e.target.value)}
                  className="font-mono text-xs"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label || m.id}
                    </option>
                  ))}
                </SettingsSelect>
              </SettingsField>
              <button
                type="button"
                onClick={refreshModels}
                disabled={modelsLoading || !form.ai_config?.apiKey?.trim()}
                className="text-sm text-blitz-600 font-medium hover:underline disabled:opacity-50"
              >
                {modelsLoading ? "Loading models…" : "Refresh models from API"}
              </button>
            </>
          )}
          <p className="text-xs text-slate-500">
            Retired models (e.g. claude-3-5-sonnet) are remapped automatically — prefer Sonnet 4.6.
          </p>
          <button
            type="button"
            onClick={handleTestKey}
            disabled={testing}
            className="text-sm text-blitz-600 font-medium hover:underline disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test API connection"}
          </button>
        </SettingsCard>

        <SettingsCard
          id="settings-profile"
          title="Profile & CV sources"
          description="Base material for tailoring. CV text is required; LinkedIn export improves screening answers."
          className={fullPage ? "lg:col-span-2" : ""}
        >
          <div className={fullPage ? "grid md:grid-cols-2 gap-6" : "space-y-6"}>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">Master CV</h3>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload("cv_text", setPdfLoading)}
                disabled={pdfLoading}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blitz-50 file:text-blitz-700 file:font-medium"
              />
              {pdfLoading && <p className="text-xs text-slate-500">Parsing PDF…</p>}
              {form.cv_text?.trim() && !pdfLoading && (
                <p className="text-xs text-green-700">
                  {form.cv_text.length.toLocaleString()} characters loaded
                </p>
              )}
              <textarea
                value={form.cv_text || ""}
                onChange={(e) => update("cv_text", e.target.value, { autosaveProfile: true })}
                rows={fullPage ? 10 : 6}
                placeholder="Paste your CV as plain text"
                className="w-full border border-slate-300 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-blitz-200"
              />
            </div>
            <div className="space-y-3 md:border-l md:border-slate-100 md:pl-6">
              <h3 className="text-sm font-semibold text-slate-800">LinkedIn profile</h3>
              <p className="text-xs text-slate-500">
                LinkedIn → Me → More → Save to PDF, then upload here.
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload("linkedin_profile_text", setLinkedinPdfLoading)}
                disabled={linkedinPdfLoading}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-50 file:text-blitz-700 file:font-medium"
              />
              {linkedinPdfLoading && <p className="text-xs text-slate-500">Parsing PDF…</p>}
              {form.linkedin_profile_text?.trim() && (
                <p className="text-xs text-green-700">
                  {form.linkedin_profile_text.length.toLocaleString()} characters
                  {form.linkedin_profile_text.length > 12000 ? " (trimmed for AI)" : ""}
                </p>
              )}
              <textarea
                value={form.linkedin_profile_text || ""}
                onChange={(e) =>
                  update("linkedin_profile_text", e.target.value, { autosaveProfile: true })
                }
                rows={fullPage ? 8 : 4}
                placeholder="Optional LinkedIn export text"
                className="w-full border border-slate-300 rounded-lg p-3 font-mono text-xs focus:ring-2 focus:ring-blitz-200"
              />
              {form.linkedin_profile_text?.trim() ? (
                <button
                  type="button"
                  onClick={async () => {
                    update("linkedin_profile_text", "");
                    await persistProfileTexts(form.cv_text ?? "", "");
                  }}
                  className="text-xs text-slate-500 hover:text-red-600 underline"
                >
                  Clear LinkedIn text
                </button>
              ) : null}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          id="settings-details"
          title="Your details"
          description="Used for screening questions and the contact line on exported CVs."
        >
          <div className={fullPage ? "grid sm:grid-cols-2 gap-4" : "space-y-3"}>
            {[
              ["name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["location", "Location"],
            ].map(([key, label]) => (
              <SettingsField key={key} label={label}>
                <SettingsInput
                  value={profile[key] || ""}
                  onChange={(e) => update(`user_profile.${key}`, e.target.value)}
                />
              </SettingsField>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-blitz-700 uppercase tracking-wide mb-3">Links</p>
            <div className={fullPage ? "grid sm:grid-cols-2 gap-4" : "space-y-3"}>
              {[
                ["github", "GitHub", "https://github.com/username"],
                ["linkedin", "LinkedIn", "https://linkedin.com/in/username"],
                ["portfolio", "Portfolio", "https://yoursite.com"],
              ].map(([key, label, placeholder]) => (
                <SettingsField key={key} label={label}>
                  <SettingsInput
                    type="url"
                    placeholder={placeholder}
                    value={profile[key] || ""}
                    onChange={(e) => update(`user_profile.${key}`, e.target.value)}
                  />
                </SettingsField>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Work preferences
            </p>
            <div className={fullPage ? "grid sm:grid-cols-2 gap-4" : "space-y-3"}>
              {[
                ["rightToWork", "Right to work"],
                ["noticePeriod", "Notice period"],
                ["salaryExpectation", "Salary expectation"],
              ].map(([key, label]) => (
                <SettingsField key={key} label={label}>
                  <SettingsInput
                    value={profile[key] || ""}
                    onChange={(e) => update(`user_profile.${key}`, e.target.value)}
                  />
                </SettingsField>
              ))}
              <SettingsField label="Remote preference">
                <SettingsSelect
                  value={profile.remotePreference || "Hybrid"}
                  onChange={(e) => update("user_profile.remotePreference", e.target.value)}
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </SettingsSelect>
              </SettingsField>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          id="settings-app"
          title="Application behaviour"
          description="How Blitz generates and submits applications."
        >
          <SettingsField label="Cover letter">
            <SettingsSelect
              value={form.preferences?.coverLetterMode || "always"}
              onChange={(e) => update("preferences.coverLetterMode", e.target.value)}
            >
              <option value="always">Always generate</option>
              <option value="never">Never</option>
              <option value="ask">Ask each time</option>
            </SettingsSelect>
          </SettingsField>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.preferences?.autoSubmit ?? false}
              onChange={(e) => update("preferences.autoSubmit", e.target.checked)}
              className="rounded border-slate-300 text-blitz-600 focus:ring-blitz-200"
            />
            <span className="text-sm text-slate-700">
              Auto-submit after fill on LinkedIn (review the page first if unsure)
            </span>
          </label>
        </SettingsCard>

        <SettingsCard
          id="settings-template"
          title="CV layout & PDF template"
          description="Visual editor, raw HTML, or import from Word. Saved separately — syncs across dashboard and extension."
          className={fullPage ? "max-w-none" : ""}
        >
          <CvTemplateEditor fullPage={fullPage} embedded />
        </SettingsCard>

        <SettingsCard
          id="settings-license"
          title="License & billing"
          description="Free tier includes 15 applications. Pro is unlimited."
        >
          <p className="text-sm">
            {isPro ? (
              <span className="text-green-700 font-medium">Pro active — unlimited applications</span>
            ) : (
              <span className="text-slate-700">
                Free tier — <strong>{used}</strong> / {FREE_APPLICATION_LIMIT} applications used
              </span>
            )}
          </p>
          {!isPro && (
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={LEMONSQUEEZY.checkoutMonthly}
                target="_blank"
                rel="noreferrer"
                className="text-center bg-blitz-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blitz-700"
              >
                Upgrade — £8/mo
              </a>
              <a
                href={LEMONSQUEEZY.checkoutYearly}
                target="_blank"
                rel="noreferrer"
                className="text-center border border-blitz-600 text-blitz-700 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-blitz-50"
              >
                Upgrade — £49/yr
              </a>
            </div>
          )}
          <SettingsField label="License key">
            <SettingsInput
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="BLITZ-…"
            />
          </SettingsField>
          <button
            type="button"
            onClick={handleActivateLicense}
            disabled={validatingLicense || !licenseKey.trim()}
            className="w-full sm:w-auto border border-slate-300 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {validatingLicense ? "Validating…" : "Activate license"}
          </button>
        </SettingsCard>
      </SettingsLayout>
    </Stagger>
  );
}
