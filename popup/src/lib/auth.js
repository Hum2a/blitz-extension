import { getStorage, setStorage, mergeStorage } from "./storage.js";
import {
  SUPABASE_CONFIGURED,
  getSupabaseRedirectUrl,
} from "./config.js";
import {
  buildOAuthAuthorizeUrl,
  exchangeCodeForSession,
  refreshSession,
  signInWithOtp,
  verifyEmailOtp,
  authRequest,
} from "./supabase-client.js";

const SESSION_KEY = "auth_session";

function randomVerifier(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function sha256Base64Url(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function parseCallbackCode(callbackUrl) {
  try {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get("code");
    if (code) return code;
    const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    return hashParams.get("code");
  } catch {
    return null;
  }
}

function sessionFromTokenResponse(data) {
  const expiresIn = data.expires_in ?? 3600;
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + expiresIn * 1000,
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  };
}

export async function getAuthSession() {
  return (await getStorage(SESSION_KEY)) || null;
}

export async function saveAuthSession(session) {
  if (!session?.access_token) {
    await setStorage(SESSION_KEY, null, { skipSync: true });
    return null;
  }
  await setStorage(SESSION_KEY, session, { skipSync: true });
  return session;
}

export async function clearAuthSession() {
  await setStorage(SESSION_KEY, null, { skipSync: true });
}

export function isSessionExpired(session) {
  if (!session?.expires_at) return true;
  return Date.now() >= session.expires_at - 60_000;
}

export async function refreshSessionIfNeeded() {
  const session = await getAuthSession();
  if (!session?.refresh_token) return null;
  if (!isSessionExpired(session)) return session;
  try {
    const data = await refreshSession(session.refresh_token);
    const next = sessionFromTokenResponse(data);
    return saveAuthSession(next);
  } catch {
    return session;
  }
}

export async function getValidAccessToken() {
  const session = await refreshSessionIfNeeded();
  return session?.access_token || null;
}

function launchWebAuthFlow(url) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUri) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!redirectUri) {
        reject(new Error("Sign-in was cancelled"));
        return;
      }
      resolve(redirectUri);
    });
  });
}

export async function signInWithGoogle() {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("Supabase is not configured in config.js");
  }
  const codeVerifier = randomVerifier(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const redirectTo = getSupabaseRedirectUrl();
  const url = await buildOAuthAuthorizeUrl("google", { redirectTo, codeChallenge });
  const callbackUrl = await launchWebAuthFlow(url);
  const code = parseCallbackCode(callbackUrl);
  if (!code) throw new Error("No authorization code in redirect");
  const data = await exchangeCodeForSession(code, codeVerifier);
  const session = sessionFromTokenResponse(data);
  await saveAuthSession(session);
  return { session, user: session.user };
}

export async function sendMagicLinkOtp(email) {
  if (!SUPABASE_CONFIGURED) throw new Error("Supabase is not configured in config.js");
  const redirectTo = getSupabaseRedirectUrl();
  await signInWithOtp(email.trim(), redirectTo);
  return { ok: true };
}

export async function verifyMagicLinkOtp(email, token) {
  if (!SUPABASE_CONFIGURED) throw new Error("Supabase is not configured in config.js");
  const data = await verifyEmailOtp(email.trim(), token.trim());
  const session = sessionFromTokenResponse(data);
  await saveAuthSession(session);
  return { session, user: session.user };
}

export async function signOut() {
  const session = await getAuthSession();
  if (session?.access_token && SUPABASE_CONFIGURED) {
    try {
      await authRequest("/logout", {
        method: "POST",
        accessToken: session.access_token,
      });
    } catch {
      /* best-effort */
    }
  }
  await clearAuthSession();
  await mergeStorage(
    {
      sync_enabled: false,
      sync_unlocked: false,
    },
    { skipSync: true }
  );
  const { clearSessionCryptoKey } = await import("./e2ee-crypto.js");
  clearSessionCryptoKey();
  return { ok: true };
}

export async function getAuthStatus() {
  const session = await refreshSessionIfNeeded();
  const syncEnabled = await getStorage("sync_enabled");
  const syncState = await getStorage("sync_state");
  return {
    configured: SUPABASE_CONFIGURED,
    signedIn: Boolean(session?.access_token),
    email: session?.user?.email || null,
    userId: session?.user?.id || null,
    syncEnabled: Boolean(syncEnabled),
    lastSyncAt: syncState?.lastSyncAt || null,
    lastError: syncState?.lastError || null,
  };
}
