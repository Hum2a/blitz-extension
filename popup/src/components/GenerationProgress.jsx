import { motion } from "framer-motion";
import { GENERATION_STAGES } from "../lib/generation-progress.js";

function StepIcon({ status }) {
  if (status === "done") {
    return (
      <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] shrink-0">
        ✓
      </span>
    );
  }
  if (status === "active") {
    return (
      <motion.span
        className="w-4 h-4 rounded-full border-2 border-blitz-500 border-t-transparent shrink-0"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
      />
    );
  }
  return <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />;
}

export default function GenerationProgress({ progress }) {
  if (!progress) return null;

  const steps = progress.steps?.length
    ? progress.steps
    : GENERATION_STAGES.map((s) => ({ ...s, status: "pending" }));

  return (
    <motion.div
      className="rounded-lg border border-blitz-200 bg-white p-3 space-y-3 shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold text-blitz-800">
            {progress.isComplete ? "Complete" : progress.stageLabel}
          </span>
          <span className="text-slate-500 font-mono">{progress.percent ?? 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blitz-500 to-blitz-700 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent ?? 0}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
        {progress.detail && (
          <p className="text-xs text-slate-700 mt-2 leading-snug">{progress.detail}</p>
        )}
        {progress.subDetail && (
          <p className="text-xs text-slate-500 mt-0.5 font-mono leading-snug">{progress.subDetail}</p>
        )}
      </div>

      <ol className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex gap-2 text-xs ${
              step.status === "active"
                ? "text-blitz-900"
                : step.status === "done"
                  ? "text-slate-600"
                  : "text-slate-400"
            }`}
          >
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <p className={step.status === "active" ? "font-medium" : ""}>{step.label}</p>
              {step.status === "active" && step.detail && (
                <p className="text-slate-600 mt-0.5 leading-snug">{step.detail}</p>
              )}
              {step.status === "active" && step.subDetail && (
                <p className="text-slate-400 mt-0.5 font-mono text-[10px] leading-snug">
                  {step.subDetail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
