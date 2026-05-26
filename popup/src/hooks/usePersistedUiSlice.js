import { useState, useEffect, useRef, useCallback } from "react";
import { getUiState, patchUiState } from "../lib/ui-state.js";

/**
 * Load/save a slice of {@link UI_STATE_KEY} in chrome.storage.local.
 */
export function usePersistedUiSlice(sliceKey, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const hydrated = useRef(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await getUiState();
      if (cancelled) return;
      const slice = state[sliceKey];
      if (slice != null) {
        setValue(
          typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)
            ? { ...defaultValue, ...slice }
            : slice
        );
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [sliceKey]);

  const persist = useCallback(
    (next) => {
      if (!hydrated.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        patchUiState({ [sliceKey]: next }).catch(() => {});
      }, 80);
    },
    [sliceKey]
  );

  const setPersisted = useCallback(
    (updater) => {
      setValue((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        persist(next);
        return next;
      });
    },
    [persist]
  );

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
    },
    []
  );

  return [value, setPersisted, hydrated];
}
