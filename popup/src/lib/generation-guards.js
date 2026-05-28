import { fetchAppConfig } from "./app-config.js";
import { FEATURE_FLAGS, isFeatureDisabled } from "./app-feature-flags.js";
import { canGenerateToday } from "./daily-limit.js";
import { canSubmitApplication } from "./license.js";
import { getAllSettings } from "./storage.js";

/**
 * Central checks before AI generation, queue processing, or form fill.
 * @param {{ source?: string, action?: 'generate'|'queue'|'fill'|'widget' }} options
 */
export async function assertGenerationAllowed(options = {}) {
  const { source = "dashboard", action = "generate" } = options;
  const config = await fetchAppConfig();

  if (config.maintenance_mode) {
    throw new Error("Blitz is in maintenance mode. Try again later.");
  }

  const flags = config.feature_flags;
  if (action === "fill" && isFeatureDisabled(flags, FEATURE_FLAGS.DISABLE_FILL)) {
    throw new Error("Form fill is temporarily disabled. Try again later.");
  }
  if (action === "queue" && isFeatureDisabled(flags, FEATURE_FLAGS.DISABLE_QUEUE)) {
    throw new Error("Job queue is temporarily disabled. Try again later.");
  }
  if (
    (action === "widget" || source === "widget") &&
    isFeatureDisabled(flags, FEATURE_FLAGS.DISABLE_WIDGET)
  ) {
    throw new Error("Widget generation is temporarily disabled. Open Blitz to generate.");
  }
  if (
    (action === "generate" || action === "widget") &&
    isFeatureDisabled(flags, FEATURE_FLAGS.DISABLE_GENERATION)
  ) {
    throw new Error("Application generation is temporarily disabled. Try again later.");
  }

  const settings = await getAllSettings();
  const daily = await canGenerateToday(settings.preferences);
  if (!daily.allowed) {
    throw new Error(
      `Daily generation limit reached (${daily.used}/${daily.limit}). Try again tomorrow or upgrade to Pro.`
    );
  }

  const { allowed, remaining } = await canSubmitApplication({ enforceServer: true });
  if (!allowed) {
    throw new Error(
      remaining === 0
        ? "Free tier limit reached (15 applications). Upgrade to Pro."
        : "Cannot generate — check your license in Settings."
    );
  }

  return { config, daily };
}
