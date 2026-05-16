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

  return { ...status, refresh };
}
