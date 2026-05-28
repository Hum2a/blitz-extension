/**
 * Restrict which extension message types each sender may invoke.
 * - Extension pages (chrome-extension://…): full access
 * - Content scripts (tab + job-board page URL): job/widget events only
 * - External web (localhost dashboard via externally_connectable): allowlisted ops
 */

export const CONTENT_SCRIPT_MESSAGE_TYPES = new Set([
  "JOB_DETECTED",
  "BLITZ_PAGE_STATE",
  "APPLICATION_SUBMITTED",
  "WIDGET_GENERATE",
  "WIDGET_OPEN_REVIEW",
  "OPEN_BLITZ",
  "GET_JOB_HISTORY_MATCH",
]);

/** Messages permitted from localhost web dashboard (onMessageExternal). */
export const EXTERNAL_WEB_MESSAGE_TYPES = new Set([
  "PING",
  "SCRAPE_ACTIVE_TAB",
  "ESTIMATE_GENERATION_COST",
  "GENERATE_APPLICATION",
  "GET_GENERATION_STATUS",
  "LOAD_HISTORY_APPLICATION",
  "VALIDATE_LICENSE",
  "GET_APPLICATION_COUNT",
  "GENERATE_PDF",
  "FILL_FORM",
  "LIST_JOB_TABS",
  "ADD_QUEUE_URLS",
  "ADD_TABS_TO_QUEUE",
  "GET_QUEUE",
  "PROCESS_QUEUE",
  "PAUSE_QUEUE",
  "RESUME_QUEUE",
  "RETRY_QUEUE_FAILED",
  "CLEAR_QUEUE",
  "LIST_APPLICATION_HISTORY",
  "GET_JOB_HISTORY_MATCH",
  "PATCH_APPLICATION_HISTORY",
  "DELETE_APPLICATION_HISTORY",
  "LIST_ANTHROPIC_MODELS",
  "OPEN_BLITZ",
  "AUTH_SIGN_IN_GOOGLE",
  "AUTH_SEND_OTP",
  "AUTH_VERIFY_OTP",
  "AUTH_SIGN_OUT",
  "AUTH_GET_STATUS",
  "ACCOUNT_GET_STATUS",
  "SYNC_ENABLE",
  "SYNC_UNLOCK",
  "SYNC_NOW",
  "SYNC_PUSH",
  "SYNC_PULL",
  "SYNC_STATUS",
  "SYNC_SCHEDULE_PUSH",
  "SYNC_EXPORT",
  "SYNC_DELETE_ACCOUNT",
  "SYNC_RESET_CLOUD",
  "SYNC_LINK_LICENSE",
]);

/** Never allow from external web — use extension Settings instead. */
export const EXTERNAL_BLOCKED_MESSAGE_TYPES = new Set(["TEST_API_KEY"]);

export function extensionPageUrlPrefix(extensionId) {
  return `chrome-extension://${extensionId}/`;
}

export function isExtensionPageSender(sender, extensionId = chrome.runtime.id) {
  const prefix = extensionPageUrlPrefix(extensionId);
  return Boolean(sender?.url?.startsWith(prefix));
}

export function isContentScriptSender(sender, extensionId = chrome.runtime.id) {
  return Boolean(sender?.tab?.id) && !isExtensionPageSender(sender, extensionId);
}

/**
 * @param {{ type?: string }} message
 * @param {chrome.runtime.MessageSender} sender
 * @param {{ external?: boolean }} options
 */
export function assertMessageAllowed(message, sender, { external = false } = {}) {
  const type = message?.type;
  if (!type) {
    throw new Error("Missing message type");
  }

  if (external) {
    if (EXTERNAL_BLOCKED_MESSAGE_TYPES.has(type)) {
      throw new Error("This action is only available inside the Blitz extension");
    }
    if (!EXTERNAL_WEB_MESSAGE_TYPES.has(type)) {
      throw new Error(`Message not allowed from web dashboard: ${type}`);
    }
    return;
  }

  if (isExtensionPageSender(sender)) {
    return;
  }

  if (isContentScriptSender(sender)) {
    if (CONTENT_SCRIPT_MESSAGE_TYPES.has(type)) {
      return;
    }
    throw new Error(`Message not allowed from content script: ${type}`);
  }

  throw new Error(`Message not allowed: ${type}`);
}
