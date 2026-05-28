/**
 * Remote feature flags from app_config.feature_flags (admin Config page).
 * Keys like `disable_generation`: set to true to turn a capability off.
 */

export const FEATURE_FLAGS = {
  DISABLE_GENERATION: "disable_generation",
  DISABLE_QUEUE: "disable_queue",
  DISABLE_WIDGET: "disable_widget",
  DISABLE_FILL: "disable_fill",
};

export function isFeatureDisabled(featureFlags, key) {
  if (!key) return false;
  const flags = featureFlags && typeof featureFlags === "object" ? featureFlags : {};
  if (!(key in flags)) return false;
  const val = flags[key];
  return val === true || val === "true" || val === 1;
}

export function isFeatureEnabled(featureFlags, key, defaultEnabled = true) {
  if (isFeatureDisabled(featureFlags, key)) return false;
  if (!key) return defaultEnabled;
  const flags = featureFlags && typeof featureFlags === "object" ? featureFlags : {};
  if (!(key in flags)) return defaultEnabled;
  return defaultEnabled;
}
