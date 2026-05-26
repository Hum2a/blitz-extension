import { SUPABASE_CONFIGURED, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getAuthSession } from "./auth.js";

/** Usage events — no CV/PII in meta. */
export async function recordClientEvent(eventType, meta = {}) {
  if (!SUPABASE_CONFIGURED || !eventType) return;
  try {
    const session = await getAuthSession();
    if (!session?.access_token || !session?.user?.id) return;

    await fetch(`${SUPABASE_URL}/rest/v1/client_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: session.user.id,
          event_type: eventType,
          meta: sanitizeMeta(meta),
        },
      ]),
    });
  } catch {
    /* telemetry must not break UX */
  }
}

function sanitizeMeta(meta) {
  const safe = {};
  const allowed = ["platform", "version", "view", "tier", "doc_count", "app_count", "error_code"];
  for (const key of allowed) {
    if (meta[key] !== undefined) safe[key] = meta[key];
  }
  return safe;
}
