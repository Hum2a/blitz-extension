import { getStorage, setStorage } from "./storage.js";

const LICENSE_ENDPOINT = "https://license.blitz.workers.dev/validate";
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

  return {
    tier: stored.tier || "free",
    valid: stored.tier === "pro",
    applicationsUsed: stored.applicationsUsed ?? 0,
  };
}

export async function canSubmitApplication() {
  const license = await getStorage("license");
  const status = await checkLicenseStatus();

  if (status.tier === "pro" || status.valid) {
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
