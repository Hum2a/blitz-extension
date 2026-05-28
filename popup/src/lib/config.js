import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.secrets.js";

export { SUPABASE_URL, SUPABASE_ANON_KEY };

export const LEMONSQUEEZY = {
  checkoutMonthly: "https://getblitz.lemonsqueezy.com/checkout/buy/monthly",
  checkoutYearly: "https://getblitz.lemonsqueezy.com/checkout/buy/yearly",
  /** Lemon Squeezy customer portal — manage/cancel subscription */
  customerPortal: "https://getblitz.lemonsqueezy.com/billing",
};

export const LICENSE_ENDPOINT = "https://license.blitzai.online";

/**
 * Supabase (Auth + cloud sync). Values come from .env via config.secrets.js (gitignored).
 * Anon key is public in the built extension; never put the service role key here.
 */
export const SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL?.trim() && SUPABASE_ANON_KEY?.trim()
);

/** OAuth redirect for chrome.identity.launchWebAuthFlow */
export function getSupabaseRedirectUrl() {
  return chrome.identity.getRedirectURL();
}
