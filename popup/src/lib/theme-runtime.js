import { DEFAULT_THEME_ID, THEMES, isValidThemeId } from "./themes.js";

export const DEFAULT_APPEARANCE = {
  mode: "system",
  theme: DEFAULT_THEME_ID,
};

export function resolveMode(mode) {
  if (mode === "dark" || mode === "light") return mode;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
    return "dark";
  }
  return "light";
}

export function getThemeVars(themeId, resolvedMode) {
  const theme = THEMES[isValidThemeId(themeId) ? themeId : DEFAULT_THEME_ID];
  return theme[resolvedMode] || theme.light;
}

/** Apply theme CSS variables to document root. */
export function applyAppearance(appearance) {
  const mode = appearance?.mode ?? DEFAULT_APPEARANCE.mode;
  const themeId = isValidThemeId(appearance?.theme) ? appearance.theme : DEFAULT_THEME_ID;
  const resolved = resolveMode(mode);

  const root = document.documentElement;
  root.dataset.theme = themeId;
  root.dataset.mode = resolved;
  root.dataset.appearanceMode = mode;
  root.style.colorScheme = resolved;

  const vars = getThemeVars(themeId, resolved);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export async function readAppearanceFromStorage() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return { ...DEFAULT_APPEARANCE };
  }
  const { appearance } = await chrome.storage.local.get("appearance");
  return {
    ...DEFAULT_APPEARANCE,
    ...(appearance && typeof appearance === "object" ? appearance : {}),
  };
}

export async function initAppearanceFromStorage() {
  const appearance = await readAppearanceFromStorage();
  applyAppearance(appearance);
  return appearance;
}

let systemListenerAttached = false;

/** Re-resolve when mode is "system" and OS preference changes. */
export function attachSystemModeListener(getAppearance) {
  if (systemListenerAttached || typeof window === "undefined") return;
  systemListenerAttached = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    const appearance = getAppearance?.() ?? DEFAULT_APPEARANCE;
    if (appearance.mode === "system") applyAppearance(appearance);
  };
  mq.addEventListener("change", onChange);
}
