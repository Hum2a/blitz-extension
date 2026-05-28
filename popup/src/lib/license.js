import { getStorage, setStorage } from "./storage.js";
import { LICENSE_ENDPOINT } from "./config.js";
export const FREE_APPLICATION_LIMIT = 15;

export async function validateLicense(key) {
  try {
    const res = await fetch(LICENSE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return await res.json();
  } catch {
    return { valid: false, tier: "free", message: "Could not reach license server" };
  }
}

function isEntitlementExpired(expiresAt) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return Number.isFinite(t) && t < Date.now();
}

export async function checkLicenseStatus() {
  const stored = await getStorage("license");
  if (!stored?.key) {
    return { tier: "free", valid: false, applicationsUsed: stored?.applicationsUsed ?? 0 };
  }

  const lastCheck = stored.validatedAt ? new Date(stored.validatedAt) : null;
  const hoursSince = lastCheck
    ? (Date.now() - lastCheck.getTime()) / 1000 / 3600
    : Infinity;

  if (hoursSince > 24) {
    const result = await validateLicense(stored.key);
    const updated = {
      ...stored,
      tier: result.valid ? result.tier : "free",
      validatedAt: new Date().toISOString(),
    };
    await setStorage("license", updated);
    return { ...result, applicationsUsed: stored.applicationsUsed ?? 0 };
  }

  const tier = stored.tier || "free";
  const proActive =
    tier === "pro" && !isEntitlementExpired(stored.expiresAt);

  return {
    tier: proActive ? "pro" : "free",
    valid: proActive,
    applicationsUsed: stored.applicationsUsed ?? 0,
  };
}

/**
 * When signed in, refresh tier from server before generation (prevents local storage tampering).
 */
export async function refreshLicenseFromServer() {
  try {
    const { getValidAccessToken } = await import("./auth.js");
    const token = await getValidAccessToken();
    if (!token) return;
    const { pullLicenseEntitlement } = await import("./sync-engine.js");
    await pullLicenseEntitlement(token);
  } catch {
    /* optional */
  }
}

export async function canSubmitApplication({ enforceServer = false } = {}) {
  if (enforceServer) {
    await refreshLicenseFromServer();
  }

  const license = await getStorage("license");
  const status = await checkLicenseStatus();

  if (status.tier === "pro" && status.valid) {
    return { allowed: true, remaining: Infinity };
  }

  const used = license?.applicationsUsed ?? 0;
  const remaining = Math.max(0, FREE_APPLICATION_LIMIT - used);
  return { allowed: remaining > 0, remaining, used };
}

export async function incrementApplicationCount() {
  const license = await getStorage("license");
  const updated = {
    ...license,
    applicationsUsed: (license?.applicationsUsed ?? 0) + 1,
  };
  await setStorage("license", updated);
  return updated.applicationsUsed;
}
