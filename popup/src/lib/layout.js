/** Popup (420px) vs full website / dashboard layout */
export function isSiteLayout(fullPage) {
  return Boolean(fullPage);
}

export function scrollPanelClass(fullPage, popupClass = "max-h-[440px] overflow-y-auto") {
  return isSiteLayout(fullPage) ? "" : popupClass;
}
