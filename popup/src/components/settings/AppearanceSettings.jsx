import { motion } from "framer-motion";
import { useAppearance } from "../../hooks/useAppearance.js";
import { APPEARANCE_MODES, THEME_CATALOG } from "../../lib/themes.js";
import { FadeUp } from "../motion.jsx";
import SettingsCard from "./SettingsCard.jsx";

function ThemeSwatch({ theme, selected, onSelect }) {
  const { hue, sat, label, id } = theme;
  const ring = selected ? "ring-2 ring-offset-2 ring-blitz-600 ring-offset-slate-50" : "ring-1 ring-slate-200";
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      title={label}
      className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-blitz-500 ${ring}`}
      aria-pressed={selected}
      aria-label={`${label} theme`}
    >
      <span
        className="h-10 w-10 rounded-full shadow-sm border border-white/20"
        style={{
          background: `linear-gradient(135deg, hsl(${hue} ${sat}% 55%), hsl(${(hue + 24) % 360} ${Math.min(sat + 8, 95)}% 42%))`,
        }}
      />
      <span className="text-[10px] font-medium text-slate-600 group-hover:text-slate-900 leading-tight text-center max-w-[4.5rem] truncate">
        {label}
      </span>
    </button>
  );
}

export default function AppearanceSettings({ fullPage = false }) {
  const { appearance, ready, setMode, setTheme } = useAppearance();

  if (!ready) {
    return (
      <SettingsCard title="Appearance" description="Loading theme…">
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
      </SettingsCard>
    );
  }

  return (
    <SettingsCard
      id="settings-appearance"
      title="Appearance"
      description="Light or dark mode, plus 20+ accent color themes. Syncs across popup and dashboard."
    >
      <FadeUp>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Mode</p>
            <div
              className="appearance-mode-toggle inline-flex rounded-lg border p-1 gap-0.5"
              role="radiogroup"
              aria-label="Color mode"
            >
              {APPEARANCE_MODES.map((m) => {
                const active = appearance.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMode(m.id)}
                    className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-blitz-50 text-blitz-800 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Color theme
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Each theme has light and dark variants that follow your mode setting.
            </p>
            <div
              className={`grid gap-2 ${
                fullPage
                  ? "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7"
                  : "grid-cols-4"
              }`}
            >
              {THEME_CATALOG.map((t) => (
                <ThemeSwatch
                  key={t.id}
                  theme={t}
                  selected={appearance.theme === t.id}
                  onSelect={setTheme}
                />
              ))}
            </div>
          </div>

          <motion.div
            className="rounded-xl border border-slate-200 overflow-hidden"
            layout
            key={`${appearance.theme}-${appearance.mode}`}
          >
            <div className="header-shine px-4 py-3 text-white text-sm font-semibold">
              Preview header
            </div>
            <div className="p-4 bg-white space-y-2">
              <p className="text-slate-900 font-medium">Card title</p>
              <p className="text-slate-500 text-xs">Muted body text and borders use your theme.</p>
              <button
                type="button"
                className="text-sm font-medium text-white bg-blitz-600 hover:bg-blitz-700 px-3 py-1.5 rounded-lg btn-shine"
              >
                Primary button
              </button>
            </div>
          </motion.div>
        </div>
      </FadeUp>
    </SettingsCard>
  );
}
