/**
 * Account + sync actions. Extension pages call lib directly (reliable).
 * Localhost web dashboard messages the background worker.
 */
import { isExtensionPage } from "./extension-env.js";
import { sendExtensionMessage } from "./extension-messages.js";

async function invokeInExtension(type, payload) {
  switch (type) {
    case "ACCOUNT_GET_STATUS":
    case "AUTH_GET_STATUS": {
      const { getAuthStatus } = await import("./auth.js");
      return getAuthStatus();
    }
    case "AUTH_SIGN_IN_GOOGLE": {
      const { signInWithGoogle } = await import("./auth.js");
      return signInWithGoogle();
    }
    case "AUTH_SEND_OTP": {
      const { sendMagicLinkOtp } = await import("./auth.js");
      return sendMagicLinkOtp(payload?.email);
    }
    case "AUTH_VERIFY_OTP": {
      const { verifyMagicLinkOtp } = await import("./auth.js");
      return verifyMagicLinkOtp(payload?.email, payload?.token);
    }
    case "AUTH_SIGN_OUT": {
      const { signOut } = await import("./auth.js");
      return signOut();
    }
    case "SYNC_ENABLE": {
      const { enableCloudSync } = await import("./sync-engine.js");
      return enableCloudSync(payload || {});
    }
    case "SYNC_UNLOCK": {
      const { unlockCloudSync } = await import("./sync-engine.js");
      return unlockCloudSync(payload?.passphrase, payload?.rememberOnDevice !== false);
    }
    case "SYNC_NOW": {
      const { runFullSync } = await import("./sync-engine.js");
      return runFullSync(payload || {});
    }
    case "SYNC_PUSH": {
      const { pushCloudSync } = await import("./sync-engine.js");
      return pushCloudSync(payload || {});
    }
    case "SYNC_PULL": {
      const { pullCloudSync } = await import("./sync-engine.js");
      return pullCloudSync(payload || {});
    }
    case "SYNC_STATUS": {
      const { getSyncStatus } = await import("./sync-engine.js");
      return getSyncStatus();
    }
    case "SYNC_EXPORT": {
      const { exportCloudData } = await import("./sync-engine.js");
      return exportCloudData(payload || {});
    }
    case "SYNC_DELETE_ACCOUNT": {
      const { deleteCloudAccount } = await import("./sync-engine.js");
      return deleteCloudAccount();
    }
    case "SYNC_RESET_CLOUD": {
      const { resetCloudSyncData } = await import("./sync-engine.js");
      return resetCloudSyncData();
    }
    default:
      throw new Error(`Unknown account action: ${type}`);
  }
}

export async function accountRequest(type, payload, { timeoutMs } = {}) {
  if (isExtensionPage()) {
    return invokeInExtension(type, payload);
  }
  const msg = payload !== undefined ? { type, payload } : { type };
  return sendExtensionMessage(msg, timeoutMs);
}
