export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    if (request.method === "GET") {
      return json({
        service: "Blitz License API",
        status: "ok",
        usage: "POST JSON body: { \"key\": \"your-license-key\" }",
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed. Use POST or GET." }, 405);
    }

    let key;
    try {
      const body = await request.json();
      key = body.key?.trim();
    } catch {
      return json({ valid: false, message: "Invalid JSON body" }, 400);
    }

    if (!key) {
      return json({ valid: false, tier: "free", message: "No key provided" });
    }

    const record = await env.LICENSE_KEYS.get(key, { type: "json" });

    if (!record || !record.active) {
      return json({ valid: false, tier: "free", message: "Invalid or inactive license" });
    }

    return json({ valid: true, tier: record.tier || "pro", message: "License valid" });
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
