import { useEffect, useState } from "react";
import { motion } from "framer-motion";

function scoreColor(score) {
  if (score >= 70) return { stroke: "#16a34a", text: "text-green-600", label: "Strong match" };
  if (score >= 50) return { stroke: "#d97706", text: "text-amber-600", label: "Moderate match" };
  return { stroke: "#dc2626", text: "text-red-600", label: "Weak match" };
}

export default function MatchScoreRing({ score, size = 72, rationale, showLabel = true }) {
  const target = Math.max(0, Math.min(100, Number(score) || 0));
  const [displayScore, setDisplayScore] = useState(0);
  const { stroke, text, label } = scoreColor(target);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  useEffect(() => {
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return (
    <motion.div
      className={`flex items-center gap-3 ${showLabel ? "" : "justify-center"}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        initial={{ scale: 0.6, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <motion.span
          className={`absolute inset-0 flex items-center justify-center font-bold text-sm ${text}`}
          key={displayScore}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
        >
          {displayScore}%
        </motion.span>
      </motion.div>
      {showLabel && (
        <motion.div
          className="min-w-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className={`text-sm font-semibold ${text}`}>{label}</p>
          {rationale && (
            <motion.p
              className="text-xs text-slate-600 mt-0.5 leading-snug"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              {rationale}
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
