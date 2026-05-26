import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_CONFIGURED } from "./config.js";

function assertConfigured() {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("Cloud sync is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in config.js.");
  }
}

function authHeaders(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function restHeaders(accessToken, extra = {}) {
  return {
    ...authHeaders(accessToken),
    Accept: "application/json",
    ...extra,
  };
}

export async function authRequest(
  path,
  { method = "GET", body, accessToken, fetchImpl = fetch } = {}
) {
  assertConfigured();
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetchImpl(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.msg || data.error_description || data.error || res.statusText;
    throw new Error(msg || `Auth request failed (${res.status})`);
  }
  return data;
}

export async function buildOAuthAuthorizeUrl(provider, { redirectTo, codeChallenge }) {
  assertConfigured();
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    apikey: SUPABASE_ANON_KEY,
  });
  return `${SUPABASE_URL}/auth/v1/authorize?${params}`;
}

export async function exchangeCodeForSession(code, codeVerifier) {
  return authRequest("/token?grant_type=pkce", {
    method: "POST",
    body: { auth_code: code, code_verifier: codeVerifier },
  });
}

const AUTH_FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshSession(refreshToken) {
  return authRequest("/token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: refreshToken },
    fetchImpl: fetchWithTimeout,
  });
}

export async function signInWithOtp(email, redirectTo) {
  return authRequest("/otp", {
    method: "POST",
    body: { email, create_user: true, options: { email_redirect_to: redirectTo } },
  });
}

export async function verifyEmailOtp(email, token) {
  return authRequest("/verify", {
    method: "POST",
    body: { type: "email", email, token },
  });
}

export async function restSelect(table, accessToken, { query = "", prefer } = {}) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: "GET",
    headers: restHeaders(accessToken, prefer ? { Prefer: prefer } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `REST select failed (${res.status})`);
  }
  return res.json();
}

export async function restUpsert(table, accessToken, rows, { onConflict } = {}) {
  assertConfigured();
  const prefer = onConflict
    ? `resolution=merge-duplicates,return=representation`
    : "return=representation";
  const conflictQuery = onConflict
    ? `?on_conflict=${encodeURIComponent(onConflict)}`
    : "";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${conflictQuery}`, {
    method: "POST",
    headers: {
      ...restHeaders(accessToken),
      Prefer: prefer,
    },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `REST upsert failed (${res.status})`);
  }
  if (res.status === 204) return [];
  return res.json();
}

export async function restDelete(table, accessToken, query) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: "DELETE",
    headers: restHeaders(accessToken),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `REST delete failed (${res.status})`);
  }
}

export async function invokeEdgeFunction(name, accessToken, body) {
  assertConfigured();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      Accept: "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Function ${name} failed (${res.status})`);
  }
  return data;
}

export { SUPABASE_CONFIGURED };
