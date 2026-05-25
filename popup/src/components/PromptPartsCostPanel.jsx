import { useCallback, useEffect, useState } from "react";
import { getStorage, mergeStorage } from "../lib/storage.js";
import PromptPartsSettings from "./settings/PromptPartsSettings.jsx";

/**
 * Inline prompt-part toggles on the dashboard; saves to storage and refreshes cost estimate.
 */
export default function PromptPartsCostPanel({
  onPartsChange,
  fullPage = false,
  partCosts = null,
  costLoading = false,
}) {
  const [preferences, setPreferences] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const prefs = (await getStorage("preferences")) || {};
    setPreferences(prefs);
  }, []);

  useEffect(() => {
    load();
    const onStorage = (changes, area) => {
      if (area === "local" && changes.preferences) {
        setPreferences(changes.preferences.newValue ?? {});
      }
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [load]);

  const updatePreferences = async (next) => {
    setPreferences(next);
    await mergeStorage({ preferences: next });
    onPartsChange?.();
  };

  if (!preferences) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white/60 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50/80 transition rounded-lg"
      >
        <span className="font-medium text-slate-700">Prompt content (cost)</span>
        <span className="text-slate-400">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100">
          <PromptPartsSettings
            preferences={preferences}
            onChange={updatePreferences}
            compact={!fullPage}
            partCosts={partCosts}
            costLoading={costLoading}
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Changes apply to the next generate. Also in Settings → Application behaviour.
          </p>
        </div>
      )}
    </div>
  );
}
