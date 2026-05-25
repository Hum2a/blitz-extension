import { useState, useEffect, useCallback } from "react";
import { listApiUsage } from "../lib/api-usage-log.js";

export function useApiUsage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listApiUsage();
    setRecords(rows);
    setLoading(false);
    return rows;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = (changes, area) => {
      if (area === "local" && changes.api_usage_updated_at) refresh();
    };
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => chrome.storage?.onChanged?.removeListener(onChanged);
  }, [refresh]);

  return { records, loading, refresh };
}
