import { useState, useEffect, useCallback, useRef } from "react";
import { getStorage, mergeStorage } from "../lib/storage.js";
import {
  applyAppearance,
  attachSystemModeListener,
  DEFAULT_APPEARANCE,
  initAppearanceFromStorage,
} from "../lib/theme-runtime.js";
import { isValidThemeId } from "../lib/themes.js";

function normalizeAppearance(raw) {
  return {
    mode: ["light", "dark", "system"].includes(raw?.mode) ? raw.mode : DEFAULT_APPEARANCE.mode,
    theme: isValidThemeId(raw?.theme) ? raw.theme : DEFAULT_APPEARANCE.theme,
  };
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await initAppearanceFromStorage();
      if (!cancelled) {
        const normalized = normalizeAppearance(stored);
        setAppearance(normalized);
        setReady(true);
      }
    })();
    attachSystemModeListener(() => appearanceRef.current);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyAppearance(appearance);
  }, [appearance, ready]);

  useEffect(() => {
    const onChanged = (changes, area) => {
      if (area !== "local" || !changes.appearance) return;
      const next = normalizeAppearance(changes.appearance.newValue);
      setAppearance(next);
    };
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => chrome.storage?.onChanged?.removeListener(onChanged);
  }, []);

  const setMode = useCallback(async (mode) => {
    const next = normalizeAppearance({ ...appearanceRef.current, mode });
    setAppearance(next);
    applyAppearance(next);
    await mergeStorage({ appearance: next });
  }, []);

  const setTheme = useCallback(async (theme) => {
    const next = normalizeAppearance({ ...appearanceRef.current, theme });
    setAppearance(next);
    applyAppearance(next);
    await mergeStorage({ appearance: next });
  }, []);

  const updateAppearance = useCallback(async (patch) => {
    const next = normalizeAppearance({ ...appearanceRef.current, ...patch });
    setAppearance(next);
    applyAppearance(next);
    await mergeStorage({ appearance: next });
  }, []);

  return {
    appearance,
    ready,
    setMode,
    setTheme,
    updateAppearance,
  };
}

/** Load appearance once before React paint (popup / dashboard entry). */
export async function bootstrapAppearance() {
  const stored = await getStorage("appearance");
  const normalized = normalizeAppearance(stored);
  applyAppearance(normalized);
  return normalized;
}
