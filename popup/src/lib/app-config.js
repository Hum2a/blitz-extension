import { SUPABASE_CONFIGURED, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let cache = { at: 0, data: null };
const TTL_MS = 5 * 60 * 1000;

const DEFAULT_CONFIG = {
  maintenance_mode: false,
  banner_message: null,
  min_extension_version: null,
  feature_flags: {},
};

export async function fetchAppConfig() {
  if (!SUPABASE_CONFIGURED) return DEFAULT_CONFIG;
  if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_app_config`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return DEFAULT_CONFIG;
    cache = { at: Date.now(), data: { ...DEFAULT_CONFIG, ...data } };
    return cache.data;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function compareVersions(a, b) {
  const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}
