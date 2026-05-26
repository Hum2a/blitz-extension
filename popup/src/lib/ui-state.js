/**
 * Ephemeral popup UI (local only, never synced).
 * Survives popup close so OTP sign-in and navigation are not lost.
 */
import { getStorage, setStorage } from "./storage.js";

export const UI_STATE_KEY = "ui_state";

/** Keep pending OTP UI until Supabase code expiry (~1h); avoid accidental resend. */
export const OTP_PENDING_MAX_MS = 55 * 60 * 1000;

const DEFAULT_ACCOUNT_UI = {
  otpEmail: "",
  otpCode: "",
  otpSent: false,
  otpSentAt: null,
};

function normalizeAccountUi(account) {
  if (!account || typeof account !== "object") {
    return { ...DEFAULT_ACCOUNT_UI };
  }
  const otpEmail = typeof account.otpEmail === "string" ? account.otpEmail : "";
  const otpCode = typeof account.otpCode === "string" ? account.otpCode : "";
  let otpSent = Boolean(account.otpSent);
  const otpSentAt =
    typeof account.otpSentAt === "number" && account.otpSentAt > 0 ? account.otpSentAt : null;

  if (otpSent && otpSentAt && Date.now() - otpSentAt > OTP_PENDING_MAX_MS) {
    otpSent = false;
  }

  return { otpEmail, otpCode, otpSent, otpSentAt: otpSent ? otpSentAt : null };
}

export async function getUiState() {
  const raw = await getStorage(UI_STATE_KEY);
  if (!raw || typeof raw !== "object") {
    return { popupView: null, account: { ...DEFAULT_ACCOUNT_UI } };
  }
  const popupView =
    typeof raw.popupView === "string" && raw.popupView.trim() ? raw.popupView.trim() : null;
  return {
    popupView,
    account: normalizeAccountUi(raw.account),
  };
}

export async function patchUiState(patch) {
  const current = await getUiState();
  const next = { ...current };
  if (patch && "popupView" in patch) {
    next.popupView = patch.popupView ?? null;
  }
  if (patch?.account) {
    next.account = normalizeAccountUi({ ...current.account, ...patch.account });
  }
  await setStorage(UI_STATE_KEY, next, { skipSync: true });
}

export async function clearAccountUiState() {
  await patchUiState({ account: { ...DEFAULT_ACCOUNT_UI } });
}

export { DEFAULT_ACCOUNT_UI };
