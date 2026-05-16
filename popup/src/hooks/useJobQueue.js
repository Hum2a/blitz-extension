import { useState, useEffect, useCallback } from "react";
import { getStorage } from "../lib/storage.js";

export function useJobQueue() {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);

  const refresh = useCallback(async () => {
    const [items, isProcessing] = await Promise.all([
      getStorage("job_queue"),
      getStorage("queue_processing"),
    ]);
    setQueue(items || []);
    setProcessing(Boolean(isProcessing));
  }, []);

  useEffect(() => {
    refresh();
    const listener = (msg) => {
      if (msg.type === "QUEUE_UPDATED") refresh();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  return { queue, processing, refresh };
}
