import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage, getAllSettings } from "../lib/storage.js";

export function useStorage(key) {
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStorage(key).then((v) => {
      setValue(v);
      setLoading(false);
    });
  }, [key]);

  const update = useCallback(
    async (newValue) => {
      await setStorage(key, newValue);
      setValue(newValue);
    },
    [key]
  );

  return [value, update, loading];
}

export function useAllSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getAllSettings();
    setSettings(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => refresh();
    chrome.storage?.onChanged?.addListener(onChanged);
    return () => chrome.storage?.onChanged?.removeListener(onChanged);
  }, [refresh]);

  return { settings, loading, refresh };
}
