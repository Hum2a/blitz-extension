import { useState, useEffect, useCallback } from "react";
import { getAllApplications, addApplication, updateApplication } from "../lib/db.js";

export function useApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const apps = await getAllApplications();
    setApplications(apps);
    setLoading(false);
    return apps;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = (changes, area) => {
      if (area === "local" && changes.applications_updated_at) refresh();
    };
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => chrome.storage?.onChanged?.removeListener(onChanged);
  }, [refresh]);

  const saveApplication = useCallback(
    async (record) => {
      await addApplication(record);
      return refresh();
    },
    [refresh]
  );

  const updateStatus = useCallback(
    async (id, status) => {
      await updateApplication(id, { status });
      return refresh();
    },
    [refresh]
  );

  const updateNotes = useCallback(
    async (id, notes) => {
      await updateApplication(id, { notes });
      return refresh();
    },
    [refresh]
  );

  return { applications, loading, refresh, saveApplication, updateStatus, updateNotes };
}
