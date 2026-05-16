function scoreColor(score) {
  if (score >= 70) return { stroke: "#16a34a", text: "text-green-600", label: "Strong match" };
  if (score >= 50) return { stroke: "#d97706", text: "text-amber-600", label: "Moderate match" };
  return { stroke: "#dc2626", text: "text-red-600", label: "Weak match" };
}

export default function MatchScoreRing({ score, size = 72, rationale, showLabel = true }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const { stroke, text, label } = scoreColor(value);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`flex items-center gap-3 ${showLabel ? "" : "justify-center"}`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${text}`}>
          {value}%
        </span>
      </div>
      {showLabel && (
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${text}`}>{label}</p>
          {rationale && <p className="text-xs text-slate-600 mt-0.5 leading-snug">{rationale}</p>}
        </div>
      )}
    </div>
  );
}

