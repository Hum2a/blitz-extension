import {
  PROMPT_PART_OPTIONS,
  DEFAULT_PROMPT_PARTS,
  normalizePromptParts,
} from "../../lib/prompt-parts.js";

const GROUPS = ["System", "Input", "Input & output", "Output"];

export default function PromptPartsSettings({ preferences, onChange, compact = false }) {
  const parts = normalizePromptParts(preferences || {});
  const coverLockedOff = preferences?.coverLetterMode === "never";

  const setPart = (key, value) => {
    onChange({
      ...preferences,
      promptParts: {
        ...DEFAULT_PROMPT_PARTS,
        ...preferences?.promptParts,
        [key]: value,
      },
    });
  };

  const resetParts = () => {
    onChange({
      ...preferences,
      promptParts: { ...DEFAULT_PROMPT_PARTS },
    });
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {!compact && (
        <p className="text-xs text-slate-600 leading-relaxed">
          Choose what Blitz sends to the AI. Fewer parts = lower cost per application. Job listing
          and base CV are recommended for quality.
        </p>
      )}
      {GROUPS.map((group) => {
        const options = PROMPT_PART_OPTIONS.filter((o) => o.group === group);
        if (!options.length) return null;
        return (
          <div key={group}>
            {!compact && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
                {group}
              </p>
            )}
            <ul className={compact ? "space-y-1.5" : "space-y-2"}>
              {options.map((opt) => {
                const disabled = opt.key === "includeCoverLetter" && coverLockedOff;
                const checked = parts[opt.key];
                return (
                  <li key={opt.key}>
                    <label
                      className={`flex items-start gap-2.5 cursor-pointer ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => setPart(opt.key, e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blitz-600 focus:ring-blitz-200"
                      />
                      <span>
                        <span className="text-sm text-slate-800 block">{opt.label}</span>
                        <span className="text-[11px] text-slate-500">{opt.hint}</span>
                        {disabled && (
                          <span className="text-[11px] text-amber-700 block">
                            Off — cover letter set to Never in Application behaviour
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <button
        type="button"
        onClick={resetParts}
        className="text-xs text-blitz-600 hover:underline"
      >
        Reset to defaults
      </button>
    </div>
  );
}
