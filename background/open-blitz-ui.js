/**
 * Open the Blitz popup UI in a tab (reliable from content scripts / service worker).
 * chrome.action.openPopup() only works for a direct toolbar click — not widget messages.
 */
export async function openBlitzExtensionUi() {
  const dashboardUrl = chrome.runtime.getURL("popup/dist/dashboard.html");
  const distPrefix = chrome.runtime.getURL("popup/dist/");

  try {
    const existing = await chrome.tabs.query({ url: `${distPrefix}*` });
    const tab = existing.find((t) => t.url?.startsWith(distPrefix));
    if (tab?.id != null) {
      await chrome.tabs.update(tab.id, { active: true });
      if (tab.windowId != null) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      return { ok: true, mode: "focused", tabId: tab.id };
    }
  } catch {
    /* query can fail on some builds — fall through to create */
  }

  const created = await chrome.tabs.create({ url: dashboardUrl, active: true });
  return { ok: true, mode: "tab", tabId: created.id };
}
