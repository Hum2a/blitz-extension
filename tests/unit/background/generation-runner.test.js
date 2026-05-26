import { beforeEach, describe, expect, it } from "vitest";
import { seedStorage } from "../../helpers/fake-storage.js";
import { isGenerationRunning } from "../../../background/generation-runner.js";

describe("generation-runner", () => {
  beforeEach(() => {
    seedStorage({ generation_status: { active: false } });
  });

  describe("isGenerationRunning", () => {
    it("returns false when idle", async () => {
      expect(await isGenerationRunning()).toBe(false);
    });

    it("returns true when active", async () => {
      seedStorage({ generation_status: { active: true } });
      expect(await isGenerationRunning()).toBe(true);
    });
  });
});
