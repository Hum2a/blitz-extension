import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUiState,
  patchUiState,
  OTP_PENDING_MAX_MS,
  UI_STATE_KEY,
} from "../../../popup/src/lib/ui-state.js";

vi.mock("../../../popup/src/lib/storage.js", () => ({
  getStorage: vi.fn(),
  setStorage: vi.fn(),
}));

import { getStorage, setStorage } from "../../../popup/src/lib/storage.js";

describe("ui-state", () => {
  beforeEach(() => {
    vi.mocked(getStorage).mockReset();
    vi.mocked(setStorage).mockReset();
    vi.mocked(getStorage).mockResolvedValue(null);
  });

  it("returns defaults when nothing stored", async () => {
    const state = await getUiState();
    expect(state.popupView).toBeNull();
    expect(state.account.otpSent).toBe(false);
  });

  it("expires stale otpSent flag", async () => {
    vi.mocked(getStorage).mockResolvedValue({
      account: {
        otpEmail: "a@b.com",
        otpSent: true,
        otpSentAt: Date.now() - OTP_PENDING_MAX_MS - 1000,
      },
    });
    const state = await getUiState();
    expect(state.account.otpSent).toBe(false);
    expect(state.account.otpEmail).toBe("a@b.com");
  });

  it("patchUiState writes with skipSync", async () => {
    await patchUiState({ popupView: "settings", account: { otpEmail: "x@y.z" } });
    expect(setStorage).toHaveBeenCalledWith(
      UI_STATE_KEY,
      expect.objectContaining({
        popupView: "settings",
        account: expect.objectContaining({ otpEmail: "x@y.z" }),
      }),
      { skipSync: true }
    );
  });
});
