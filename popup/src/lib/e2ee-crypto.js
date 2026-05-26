const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

let sessionCryptoKey = null;

/** Avoid spread on large Uint8Arrays — causes "Maximum call stack size exceeded". */
function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!u8.length) return btoa("");
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < u8.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function utf8Encode(str) {
  return new TextEncoder().encode(str);
}

function utf8Decode(bytes) {
  return new TextDecoder().decode(bytes);
}

async function importPassphraseKey(passphrase, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    utf8Encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function hashForSync(plaintext) {
  const data =
    typeof plaintext === "string" ? utf8Encode(plaintext) : utf8Encode(JSON.stringify(plaintext));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64(new Uint8Array(digest));
}

export function clearSessionCryptoKey() {
  sessionCryptoKey = null;
}

export async function unlockSyncCrypto(passphrase, syncCryptoMeta) {
  if (!passphrase?.trim()) throw new Error("Passphrase required");
  if (!syncCryptoMeta?.salt) throw new Error("Missing sync encryption metadata");
  const salt = base64ToBytes(syncCryptoMeta.salt);
  sessionCryptoKey = await importPassphraseKey(passphrase, salt);
  return true;
}

export async function setupSyncCrypto(passphrase) {
  if (!passphrase?.trim()) throw new Error("Passphrase required");
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  sessionCryptoKey = await importPassphraseKey(passphrase, salt);
  return {
    salt: bytesToBase64(salt),
    encryption_version: "v1",
    createdAt: new Date().toISOString(),
  };
}

async function getActiveKey(passphrase, syncCryptoMeta) {
  if (sessionCryptoKey) return sessionCryptoKey;
  if (passphrase && syncCryptoMeta?.salt) {
    await unlockSyncCrypto(passphrase, syncCryptoMeta);
    return sessionCryptoKey;
  }
  throw new Error("Sync encryption locked — enter your sync passphrase");
}

export async function encryptPayload(plaintext, { passphrase, syncCryptoMeta } = {}) {
  const key = await getActiveKey(passphrase, syncCryptoMeta);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encoded =
    typeof plaintext === "string" ? utf8Encode(plaintext) : utf8Encode(JSON.stringify(plaintext));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const ctBytes = new Uint8Array(ct);
  const tagLen = 16;
  const body = ctBytes.slice(0, ctBytes.length - tagLen);
  const tag = ctBytes.slice(ctBytes.length - tagLen);
  return JSON.stringify({
    v: 1,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(body),
    tag: bytesToBase64(tag),
  });
}

export async function decryptPayload(ciphertextJson, { passphrase, syncCryptoMeta } = {}) {
  const key = await getActiveKey(passphrase, syncCryptoMeta);
  let envelope;
  try {
    envelope = JSON.parse(ciphertextJson);
  } catch {
    throw new Error("Invalid encrypted payload");
  }
  if (envelope.v !== 1) throw new Error("Unsupported encryption version");
  const iv = base64ToBytes(envelope.iv);
  const body = base64ToBytes(envelope.ct);
  const tag = base64ToBytes(envelope.tag);
  const combined = new Uint8Array(body.length + tag.length);
  combined.set(body, 0);
  combined.set(tag, body.length);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  const text = utf8Decode(new Uint8Array(plain));
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
