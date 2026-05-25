/**
 * In-memory chrome.storage.local + runtime messaging for unit tests.
 * Reset between tests via resetChromeMock().
 */

let store = {};
let messageHandler = null;
const RUNTIME_ID = "test-extension-id";

export function getChromeStore() {
  return store;
}

export function setChromeMessageHandler(handler) {
  messageHandler = handler;
}

export function resetChromeMock() {
  store = {};
  messageHandler = null;
}

function invokeCallback(callback, result = undefined, lastError = null) {
  if (typeof callback !== "function") return;
  if (lastError) {
    globalThis.chrome.runtime.lastError = lastError;
  } else {
    delete globalThis.chrome.runtime.lastError;
  }
  callback(result);
}

function installChromeMock() {
  globalThis.chrome = {
    runtime: {
      id: RUNTIME_ID,
      lastError: undefined,
      sendMessage: (message, callback) => {
        const respond = (response) => {
          if (typeof callback === "function") callback(response);
        };
        if (messageHandler) {
          const result = messageHandler(message, { id: RUNTIME_ID }, respond);
          if (result && typeof result.then === "function") {
            result.then(respond).catch((err) => {
              globalThis.chrome.runtime.lastError = { message: err.message };
              if (typeof callback === "function") callback();
            });
          }
        } else if (typeof callback === "function") {
          callback(undefined);
        }
      },
      onMessage: {
        addListener: (fn) => {
          messageHandler = fn;
        },
        removeListener: () => {
          messageHandler = null;
        },
      },
    },
    storage: {
      local: {
        QUOTA_BYTES: 10_485_760,
        get: (keys, callback) => {
          let result;
          if (keys === null || keys === undefined) {
            result = { ...store };
          } else if (typeof keys === "string") {
            result = keys in store ? { [keys]: store[keys] } : {};
          } else if (Array.isArray(keys)) {
            result = {};
            for (const k of keys) {
              if (k in store) result[k] = store[k];
            }
          } else {
            result = {};
          }
          invokeCallback(callback, result);
        },
        set: (items, callback) => {
          Object.assign(store, items);
          invokeCallback(callback);
        },
        remove: (keys, callback) => {
          const list = Array.isArray(keys) ? keys : [keys];
          for (const k of list) delete store[k];
          invokeCallback(callback);
        },
        clear: (callback) => {
          store = {};
          invokeCallback(callback);
        },
        getBytesInUse: (keys, callback) => {
          const json = JSON.stringify(store);
          invokeCallback(callback, new TextEncoder().encode(json).length);
        },
      },
    },
  };
}

installChromeMock();
