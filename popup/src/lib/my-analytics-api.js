import { SUPABASE_CONFIGURED, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getValidAccessToken } from "./auth.js";

/** Aggregated account/sync/telemetry for the signed-in user (metadata only). */
export async function fetchMyCloudAnalytics() {
  if (!SUPABASE_CONFIGURED) return { signed_in: false, configured: false };

  const token = await getValidAccessToken();
  if (!token) return { signed_in: false, configured: true };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_analytics`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Analytics request failed (${res.status})`);
  }

  return res.json();
}
