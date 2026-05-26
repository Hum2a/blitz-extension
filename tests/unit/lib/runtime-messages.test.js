import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import { setChromeMessageHandler } from "../../setup/chrome-mock.js";
import {
  clearErrorLog,
  getErrorLog,
  logError,
  sendRuntimeMessage,
} from "../../../popup/src/lib/runtime-messages.js";

describe("runtime-messages", () => {
  const originalLocation = globalThis.location;

  beforeEach(() => {
    seedStorage({});
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "chrome-extension:", hostname: "test" },
      writable: true,
      configurable: true,
    });
    setChromeMessageHandler((msg, _sender, respond) => {
      if (msg.type === "PING") respond({ ok: true });
      else respond({ error: `Unknown message type: ${msg.type}` });
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  describe("logError", () => {
    it("prepends to debug_log in storage", async () => {
      await logError("test", new Error("boom"), { code: 1 });
      const log = await getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].context).toBe("test");
      expect(log[0].message).toBe("boom");
      expect(log[0].extra.code).toBe(1);
    });

    it("clears debug log", async () => {
      await logError("x", new Error("a"));
      await clearErrorLog();
      expect(await getErrorLog()).toEqual([]);
    });
  });

  describe("sendRuntimeMessage", () => {
    it("returns handler response", async () => {
      const res = await sendRuntimeMessage({ type: "PING" });
      expect(res.ok).toBe(true);
    });

    it("throws on error response with enriched message", async () => {
      await expect(sendRuntimeMessage({ type: "NOPE" })).rejects.toThrow(
        /Unknown message type/i
      );
    });
  });
});
