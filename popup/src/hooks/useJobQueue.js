import { useState, useEffect, useCallback } from "react";
import { fetchQueueState } from "../lib/queue-bridge.js";

export function useJobQueue() {
  const [queue, setQueue] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);

  const refresh = useCallback(async () => {
    const state = await fetchQueueState();
    setQueue(state.queue || []);
    setProcessing(Boolean(state.processing));
    setPaused(Boolean(state.paused));
  }, []);

  useEffect(() => {
    refresh();
    const listener = (msg) => {
      if (msg.type === "QUEUE_UPDATED") refresh();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  return { queue, processing, paused, refresh };
}
