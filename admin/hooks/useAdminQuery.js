import { useCallback, useEffect, useState } from "react";

/**
 * @param {() => Promise<any>} fetcher
 * @param {unknown[]} deps
 */
export function useAdminQuery(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      setError(e.message || "Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
