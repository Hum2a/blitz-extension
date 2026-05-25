export const LEMONSQUEEZY = {
  checkoutMonthly: "https://getblitz.lemonsqueezy.com/checkout/buy/monthly",
  checkoutYearly: "https://getblitz.lemonsqueezy.com/checkout/buy/yearly",
};

export const LICENSE_ENDPOINT = "https://blitz-license.humzab1711.workers.dev";

/**
 * Supabase (Auth + cloud sync). Set both before enabling account features.
 * Anon key is public; never embed the service role key in the extension.
 */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL?.trim() && SUPABASE_ANON_KEY?.trim()
);

/** OAuth redirect for chrome.identity.launchWebAuthFlow */
export function getSupabaseRedirectUrl() {
  return chrome.identity.getRedirectURL();
}
