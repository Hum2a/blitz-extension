import { useState, useEffect, useCallback } from "react";
import { HISTORY_EVENT_TYPES } from "../lib/application-store.js";
import {
  listApplicationsBridged,
  addApplicationBridged,
  updateApplicationBridged,
  deleteApplicationBridged,
} from "../lib/history-bridge.js";

export function useApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const apps = await listApplicationsBridged();
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
      await addApplicationBridged(record);
      return refresh();
    },
    [refresh]
  );

  const updateStatus = useCallback(
    async (id, status) => {
      const apps = await listApplicationsBridged();
      const existing = apps.find((a) => a.id === id);
      const events = [
        {
          type: HISTORY_EVENT_TYPES.STATUS_CHANGED,
          at: new Date().toISOString(),
          detail: existing?.status ? `${existing.status} → ${status}` : status,
        },
        ...(existing?.events || []),
      ].slice(0, 50);
      await updateApplicationBridged(id, {
        status,
        events,
        updatedAt: new Date().toISOString(),
      });
      return refresh();
    },
    [refresh]
  );

  const updateNotes = useCallback(
    async (id, notes) => {
      await updateApplicationBridged(id, { notes });
      return refresh();
    },
    [refresh]
  );

  const removeApplication = useCallback(
    async (id) => {
      await deleteApplicationBridged(id);
      return refresh();
    },
    [refresh]
  );

  return {
    applications,
    loading,
    refresh,
    saveApplication,
    updateStatus,
    updateNotes,
    removeApplication,
  };
}
