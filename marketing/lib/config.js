/** Chrome Web Store listing — set VITE_CHROME_STORE_URL in .env before marketing:build */
export const CHROME_STORE_URL = import.meta.env.VITE_CHROME_STORE_URL?.trim() || "";

export const APP_WORKSPACE_URL = "https://app.blitzai.online";

/** Optional contact for “coming soon” / early access (mailto) */
export const SUPPORT_EMAIL =
  import.meta.env.VITE_SUPPORT_EMAIL?.trim() || "support@getblitz.io";

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Blitz — early access")}`;
