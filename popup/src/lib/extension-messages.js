const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * chrome.runtime.sendMessage with timeout (SW may be asleep or slow to wake).
 */
export function sendExtensionMessage(message, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime?.sendMessage) {
      reject(new Error("Extension messaging unavailable"));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("Extension did not respond — reload the extension and try again"));
    }, timeoutMs);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer);
        const err = chrome.runtime.lastError;
        if (err) {
          reject(new Error(err.message || "Extension message failed"));
          return;
        }
        resolve(response);
      });
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}
