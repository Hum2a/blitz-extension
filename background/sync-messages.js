import {
  signInWithGoogle,
  sendMagicLinkOtp,
  verifyMagicLinkOtp,
  signOut,
  getAuthStatus,
} from "../popup/src/lib/auth.js";
import {
  enableCloudSync,
  unlockCloudSync,
  schedulePush,
  pushCloudSync,
  pullCloudSync,
  runFullSync,
  getSyncStatus,
  linkLicenseToAccount,
  deleteCloudAccount,
  exportCloudData,
  resetCloudSyncData,
  registerSyncAlarm,
  handleSyncAlarm,
} from "../popup/src/lib/sync-engine.js";
import { refreshSessionIfNeeded } from "../popup/src/lib/auth.js";

export async function handleSyncAuthMessage(message) {
  switch (message.type) {
    case "AUTH_SIGN_IN_GOOGLE":
      return signInWithGoogle();

    case "AUTH_SEND_OTP":
      return sendMagicLinkOtp(message.payload?.email);

    case "AUTH_VERIFY_OTP":
      return verifyMagicLinkOtp(message.payload?.email, message.payload?.token);

    case "AUTH_SIGN_OUT":
      return signOut();

    case "AUTH_GET_STATUS":
      return getAuthStatus();

    case "SYNC_ENABLE":
      return enableCloudSync({
        passphrase: message.payload?.passphrase,
        rememberOnDevice: message.payload?.rememberOnDevice !== false,
      });

    case "SYNC_UNLOCK":
      return unlockCloudSync(
        message.payload?.passphrase,
        message.payload?.rememberOnDevice !== false
      );

    case "SYNC_SCHEDULE_PUSH":
      await schedulePush();
      return { ok: true };

    case "SYNC_PUSH":
      return pushCloudSync({ passphrase: message.payload?.passphrase });

    case "SYNC_PULL":
      return pullCloudSync({ passphrase: message.payload?.passphrase });

    case "SYNC_NOW":
      return runFullSync({ passphrase: message.payload?.passphrase });

    case "SYNC_STATUS":
      return getSyncStatus();

    case "SYNC_LINK_LICENSE":
      return linkLicenseToAccount(message.payload?.key);

    case "SYNC_DELETE_ACCOUNT":
      return deleteCloudAccount();

    case "SYNC_EXPORT":
      return exportCloudData({ passphrase: message.payload?.passphrase });

    case "SYNC_RESET_CLOUD":
      return resetCloudSyncData();

    default:
      return null;
  }
}

export function initSyncBackground() {
  registerSyncAlarm();
  refreshSessionIfNeeded().catch(() => {});
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "blitz-sync-retry") {
      handleSyncAlarm().catch(() => {});
    }
  });
}
