import { describe, expect, it } from "vitest";
import {
  clearSessionCryptoKey,
  decryptPayload,
  encryptPayload,
  hashForSync,
  setupSyncCrypto,
  unlockSyncCrypto,
} from "../../../popup/src/lib/e2ee-crypto.js";

describe("e2ee-crypto", () => {
  const passphrase = "test-passphrase-123";

  it("hashes plaintext deterministically", async () => {
    const a = await hashForSync("hello");
    const b = await hashForSync("hello");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("encrypts and decrypts sync payloads", async () => {
    clearSessionCryptoKey();
    const meta = await setupSyncCrypto(passphrase);
    const plaintext = { cv_text: "secret cv", nested: { x: 1 } };

    const encrypted = await encryptPayload(plaintext, { passphrase, syncCryptoMeta: meta });
    const envelope = JSON.parse(encrypted);
    expect(envelope.iv).toBeTruthy();
    expect(envelope.ct).toBeTruthy();

    clearSessionCryptoKey();
    await unlockSyncCrypto(passphrase, meta);
    const decrypted = await decryptPayload(encrypted, { passphrase, syncCryptoMeta: meta });
    expect(decrypted).toEqual(plaintext);
  });

  it("rejects decrypt with wrong passphrase", async () => {
    const meta = await setupSyncCrypto(passphrase);
    const encrypted = await encryptPayload({ a: 1 }, { passphrase, syncCryptoMeta: meta });
    clearSessionCryptoKey();
    await expect(
      decryptPayload(encrypted, { passphrase: "wrong-pass", syncCryptoMeta: meta })
    ).rejects.toThrow();
  });
});
