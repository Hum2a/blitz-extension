/**
 * Color themes: each has light + dark palettes mapped to --blitz-* and --slate-* CSS variables.
 * Values are space-separated RGB channels for Tailwind alpha support.
 */

function hslToChannels(h, s, l) {
  const sat = s / 100;
  const lit = l / 100;
  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lit - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `${Math.round((r + m) * 255)} ${Math.round((g + m) * 255)} ${Math.round((b + m) * 255)}`;
}

function primaryScale(hue, sat, mode) {
  const light = mode === "light";
  const levels = light
    ? { 50: 97, 100: 94, 500: 58, 600: 50, 700: 44, 800: 38, 900: 30 }
    : { 50: 22, 100: 28, 500: 62, 600: 56, 700: 50, 800: 44, 900: 38 };
  const s = light ? sat : Math.min(sat + 4, 92);
  const out = {};
  for (const [k, l] of Object.entries(levels)) {
    out[`--blitz-${k}`] = hslToChannels(hue, s, l);
  }
  return out;
}

function neutralScale(hue, mode) {
  const tint = mode === "light" ? 12 : 18;
  if (mode === "light") {
    return {
      "--slate-50": hslToChannels(hue, tint, 98),
      "--slate-100": hslToChannels(hue, tint, 96),
      "--slate-200": hslToChannels(hue, tint, 90),
      "--slate-300": hslToChannels(hue, tint, 82),
      "--slate-400": hslToChannels(hue, tint, 68),
      "--slate-500": hslToChannels(hue, tint, 52),
      "--slate-600": hslToChannels(hue, tint, 42),
      "--slate-700": hslToChannels(hue, tint, 34),
      "--slate-800": hslToChannels(hue, tint, 26),
      "--slate-900": hslToChannels(hue, tint, 16),
      "--slate-950": hslToChannels(hue, tint, 10),
    };
  }
  return {
    "--slate-50": hslToChannels(hue, tint + 6, 9),
    "--slate-100": hslToChannels(hue, tint + 6, 13),
    "--slate-200": hslToChannels(hue, tint + 4, 22),
    "--slate-300": hslToChannels(hue, tint + 2, 32),
    "--slate-400": hslToChannels(hue, tint, 48),
    "--slate-500": hslToChannels(hue, tint - 2, 62),
    "--slate-600": hslToChannels(hue, tint - 4, 72),
    "--slate-700": hslToChannels(hue, tint - 6, 80),
    "--slate-800": hslToChannels(hue, tint - 8, 88),
    "--slate-900": hslToChannels(hue, tint - 10, 96),
    "--slate-950": hslToChannels(hue, tint - 12, 99),
  };
}

function headerGradient(hue, sat, mode) {
  const light = mode === "light";
  const h1 = hue;
  const h2 = (hue + 8) % 360;
  const h3 = (hue - 6 + 360) % 360;
  const s = light ? sat : sat + 6;
  return {
    "--header-a": hslToChannels(h1, s, light ? 42 : 48),
    "--header-b": hslToChannels(h2, s, light ? 50 : 54),
    "--header-c": hslToChannels(h3, s, light ? 44 : 50),
    "--shadow-primary": light ? "47, 74, 196" : "80, 100, 220",
    "--shadow-card": light ? "0.12" : "0.35",
  };
}

function surfaceTokens(hue, mode) {
  const neutrals = neutralScale(hue, mode);
  const light = mode === "light";
  return {
    "--page-bg": neutrals["--slate-50"],
    "--surface": light ? "255 255 255" : neutrals["--slate-100"],
    "--surface-muted": light ? neutrals["--slate-100"] : neutrals["--slate-200"],
    "--surface-header": light ? "255 255 255" : neutrals["--slate-100"],
    "--surface-sidebar": light ? "255 255 255" : neutrals["--slate-100"],
  };
}

function buildVariant(hue, sat, mode) {
  return {
    ...primaryScale(hue, sat, mode),
    ...neutralScale(hue, mode),
    ...headerGradient(hue, sat, mode),
    ...surfaceTokens(hue, mode),
  };
}

/** @type {{ id: string, label: string, hue: number, sat: number, light: Record<string,string>, dark: Record<string,string> }[]} */
export const THEME_CATALOG = [
  { id: "blitz", label: "Blitz Blue", hue: 228, sat: 72 },
  { id: "ocean", label: "Ocean", hue: 205, sat: 78 },
  { id: "sky", label: "Sky", hue: 198, sat: 82 },
  { id: "arctic", label: "Arctic", hue: 192, sat: 55 },
  { id: "forest", label: "Forest", hue: 152, sat: 58 },
  { id: "mint", label: "Mint", hue: 168, sat: 62 },
  { id: "teal", label: "Teal", hue: 178, sat: 70 },
  { id: "lime", label: "Lime", hue: 88, sat: 58 },
  { id: "citrus", label: "Citrus", hue: 48, sat: 85 },
  { id: "amber", label: "Amber", hue: 38, sat: 88 },
  { id: "sunset", label: "Sunset", hue: 24, sat: 90 },
  { id: "coral", label: "Coral", hue: 12, sat: 82 },
  { id: "cherry", label: "Cherry", hue: 348, sat: 72 },
  { id: "rose", label: "Rose", hue: 340, sat: 68 },
  { id: "blush", label: "Blush", hue: 330, sat: 55 },
  { id: "lavender", label: "Lavender", hue: 268, sat: 62 },
  { id: "violet", label: "Violet", hue: 258, sat: 72 },
  { id: "grape", label: "Grape", hue: 282, sat: 68 },
  { id: "neon", label: "Neon", hue: 292, sat: 95 },
  { id: "midnight", label: "Midnight", hue: 235, sat: 45 },
  { id: "earth", label: "Earth", hue: 32, sat: 42 },
  { id: "mono", label: "Mono", hue: 220, sat: 8 },
].map((t) => ({
  ...t,
  light: buildVariant(t.hue, t.sat, "light"),
  dark: buildVariant(t.hue, t.sat, "dark"),
}));

export const THEMES = Object.fromEntries(THEME_CATALOG.map((t) => [t.id, t]));

export const DEFAULT_THEME_ID = "blitz";

export const APPEARANCE_MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function isValidThemeId(id) {
  return id && id in THEMES;
}
