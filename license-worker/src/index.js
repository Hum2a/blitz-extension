export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(request),
      });
    }

    if (request.method === "GET") {
      return json(
        request,
        {
          service: "Blitz License API",
          status: "ok",
          usage: "POST JSON body: { \"key\": \"your-license-key\" }",
        }
      );
    }

    if (request.method !== "POST") {
      return json(request, { error: "Method not allowed. Use POST or GET." }, 405);
    }

    let key;
    try {
      const body = await request.json();
      key = body.key?.trim();
    } catch {
      return json(request, { valid: false, message: "Invalid JSON body" }, 400);
    }

    if (!key) {
      return json(request, { valid: false, tier: "free", message: "No key provided" });
    }

    const record = await env.LICENSE_KEYS.get(key, { type: "json" });

    if (!record || !record.active) {
      return json(request, {
        valid: false,
        tier: "free",
        message: "Invalid or inactive license",
      });
    }

    return json(request, {
      valid: true,
      tier: record.tier || "pro",
      message: "License valid",
    });
  },
};

const ALLOWED_ORIGIN_PATTERNS = [
  /^chrome-extension:\/\//,
  /^https:\/\/app\.blitzai\.online$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function corsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "";
  const allowed = ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (allowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return headers;
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}
