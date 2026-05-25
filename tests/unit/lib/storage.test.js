import { beforeEach, describe, expect, it } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import {
  DEFAULTS,
  getAllSettings,
  getStorage,
  mergeStorage,
  normalizeAiConfig,
  setStorage,
  StorageError,
} from "../../../popup/src/lib/storage.js";

describe("storage", () => {
  beforeEach(() => {
    seedStorage({});
  });

  describe("getStorage / setStorage", () => {
    it("returns defaults for missing keys", async () => {
      expect(await getStorage("cv_text")).toBe("");
      expect((await getStorage("user_profile")).name).toBe("");
    });

    it("round-trips written values", async () => {
      await setStorage("cv_text", "My CV", { skipSync: true });
      expect(await getStorage("cv_text")).toBe("My CV");
    });

    it("mergeStorage writes multiple keys", async () => {
      await mergeStorage(
        { cv_text: "A", preferences: { dailyLimit: 10 } },
        { skipSync: true }
      );
      expect(await getStorage("cv_text")).toBe("A");
      expect((await getStorage("preferences")).dailyLimit).toBe(10);
    });
  });

  describe("normalizeAiConfig", () => {
    it("remaps retired Anthropic model on read", async () => {
      seedStorage({
        ai_config: {
          provider: "anthropic",
          apiKey: "sk-test",
          model: "claude-3-5-sonnet-20241022",
        },
      });
      const cfg = await getStorage("ai_config");
      expect(cfg.model).toBe("claude-sonnet-4-6");
    });

    it("fills default model per provider when model empty", () => {
      expect(
        normalizeAiConfig({ provider: "openai", apiKey: "k", model: "" }).model
      ).toBe("gpt-4o");
      expect(
        normalizeAiConfig({ provider: "anthropic", apiKey: "k", model: "" }).model
      ).toBe("claude-sonnet-4-6");
    });
  });

  describe("getAllSettings", () => {
    it("merges stored values with DEFAULTS", async () => {
      await setStorage("cv_text", "stored", { skipSync: true });
      const all = await getAllSettings();
      expect(all.cv_text).toBe("stored");
      expect(all.user_profile).toEqual(DEFAULTS.user_profile);
    });
  });

  describe("StorageError", () => {
    it("is a named error", () => {
      const err = new StorageError("fail");
      expect(err.name).toBe("StorageError");
    });
  });
});
