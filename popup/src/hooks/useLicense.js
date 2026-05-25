import { useState, useEffect, useCallback } from "react";
import { FREE_APPLICATION_LIMIT } from "../lib/license.js";

export function useLicense() {
  const [status, setStatus] = useState({
    tier: "free",
    used: 0,
    remaining: FREE_APPLICATION_LIMIT,
    allowed: true,
    loading: true,
  });

  const refresh = useCallback(async () => {
    const result = await chrome.runtime.sendMessage({ type: "GET_APPLICATION_COUNT" });
    setStatus({ ...result, loading: false });
    return result;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = (changes, area) => {
      if (area === "local" && changes.license) refresh();
    };
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => chrome.storage?.onChanged?.removeListener(onChanged);
  }, [refresh]);

  return { ...status, refresh };
}
