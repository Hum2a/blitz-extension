import { getStorage, setStorage } from "./storage.js";
import { sendExtensionMessage } from "./extension-env.js";

const MAX_LOG = 20;

export async function logError(context, error, extra = {}) {
  const entry = {
    at: new Date().toISOString(),
    context,
    message: error?.message || String(error),
    stack: error?.stack || null,
    extra,
  };
  const log = (await getStorage("debug_log")) || [];
  log.unshift(entry);
  await setStorage("debug_log", log.slice(0, MAX_LOG));
  return entry;
}

export async function getErrorLog() {
  return (await getStorage("debug_log")) || [];
}

export async function clearErrorLog() {
  await setStorage("debug_log", []);
}

/**
 * Send message to background service worker with proper lastError handling.
 */
export async function sendRuntimeMessage(message) {
  let response;
  try {
    response = await sendExtensionMessage(message);
  } catch (err) {
    const msg = err?.message || "Extension messaging failed";
    throw enrichMessageError(msg, message.type);
  }

  if (response?.error) {
    const err = new Error(response.error);
    err.response = response;
    throw err;
  }

  return response;
}

function enrichMessageError(msg, type) {
  if (msg.includes("Unknown message type") || msg.includes("Receiving end does not exist")) {
    return new Error(
      `${msg}\n\nTip: Go to chrome://extensions and click Reload on Blitz, then refresh this job tab. (message: ${type})`
    );
  }
  return new Error(msg);
}

export async function pingBackground() {
  return sendRuntimeMessage({ type: "PING" });
}
