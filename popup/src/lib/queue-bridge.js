import { isExtensionPage, isWebDashboard, sendExtensionMessage } from "./extension-env.js";
import { getStorage, setStorage } from "./storage.js";
import { sendRuntimeMessage } from "./runtime-messages.js";

export async function fetchQueueState() {
  if (isExtensionPage()) {
    const [queue, processing, paused] = await Promise.all([
      getStorage("job_queue"),
      getStorage("queue_processing"),
      getStorage("queue_paused"),
    ]);
    return {
      queue: queue || [],
      processing: Boolean(processing),
      paused: Boolean(paused),
    };
  }
  if (isWebDashboard()) {
    return sendExtensionMessage({ type: "GET_QUEUE" });
  }
  return { queue: [], processing: false, paused: false };
}

export async function addQueueItems(items) {
  if (isExtensionPage()) {
    return sendRuntimeMessage({ type: "ADD_QUEUE_URLS", payload: { items } });
  }
  if (isWebDashboard()) {
    return sendExtensionMessage({ type: "ADD_QUEUE_URLS", payload: { items } });
  }
  const existing = (await getStorage("job_queue")) || [];
  await setStorage("job_queue", [...existing, ...items]);
  return { ok: true, added: items.length, duplicates: [] };
}

export async function processQueueBridged() {
  if (isExtensionPage() || isWebDashboard()) {
    return sendRuntimeMessage({ type: "PROCESS_QUEUE" });
  }
  return { ok: false };
}

export async function pauseQueueBridged() {
  if (isExtensionPage() || isWebDashboard()) {
    return sendRuntimeMessage({ type: "PAUSE_QUEUE" });
  }
  await setStorage("queue_paused", true);
  return { ok: true };
}

export async function resumeQueueBridged() {
  if (isExtensionPage() || isWebDashboard()) {
    return sendRuntimeMessage({ type: "RESUME_QUEUE" });
  }
  await setStorage("queue_paused", false);
  return { ok: true };
}

export async function retryQueueFailedBridged() {
  if (isExtensionPage() || isWebDashboard()) {
    return sendRuntimeMessage({ type: "RETRY_QUEUE_FAILED" });
  }
  return { ok: false, count: 0 };
}

export async function clearQueueBridged() {
  if (isExtensionPage() || isWebDashboard()) {
    return sendRuntimeMessage({ type: "CLEAR_QUEUE" });
  }
  await setStorage("job_queue", []);
  return { ok: true };
}
