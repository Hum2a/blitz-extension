import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUsd, formatTokens } from "../lib/cost-estimate.js";

export default function CostEstimate({ estimate, actualCost, loading }) {
  const [expanded, setExpanded] = useState(false);
  const data = actualCost || estimate;

  useEffect(() => {
    if (actualCost) setExpanded(true);
  }, [actualCost]);

  if (loading) {
    return (
      <p className="text-xs text-slate-500 animate-pulse py-1">Calculating API cost estimate…</p>
    );
  }

  if (!data) return null;

  if (data.error) {
    return <p className="text-xs text-slate-500 py-1">{data.error}</p>;
  }

  const isActual = Boolean(actualCost);
  const breakdown = data.breakdown || [
    {
      label: "Input (CV + job + profile)",
      tokens: data.inputTokens,
      costUsd: data.inputCostUsd,
    },
    {
      label: isActual ? "Output (application)" : "Output (est.)",
      tokens: data.outputTokens ?? data.outputTokensEstimate,
      costUsd: data.outputCostUsd,
    },
  ];

  return (
    <motion.div
      className="rounded-lg border border-slate-200 bg-slate-50/80 text-xs overflow-hidden"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/60 transition"
      >
        <span className="text-slate-600">
          {isActual ? "Last generation cost" : "Est. cost per application"}
        </span>
        <span className="font-semibold text-blitz-700 shrink-0">
          {formatUsd(data.totalCostUsd)}
          {!isActual && <span className="font-normal text-slate-400"> approx</span>}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200 px-3 pb-2"
          >
            <p className="text-slate-500 pt-2 mb-1">
              {data.provider} · <span className="font-mono">{data.model}</span>
              {isActual ? " · billed from API usage" : " · prices are approximate"}
            </p>
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-1 font-normal">Part</th>
                  <th className="py-1 font-normal text-right">Tokens</th>
                  <th className="py-1 font-normal text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((row) => (
                  <tr key={row.label} className="text-slate-700">
                    <td className="py-0.5 pr-2">{row.label}</td>
                    <td className="py-0.5 text-right font-mono">{formatTokens(row.tokens)}</td>
                    <td className="py-0.5 text-right font-mono">{formatUsd(row.costUsd)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="pt-1">Total</td>
                  <td className="pt-1 text-right font-mono">
                    {formatTokens(
                      (data.inputTokens || 0) + (data.outputTokens ?? data.outputTokensEstimate ?? 0)
                    )}
                  </td>
                  <td className="pt-1 text-right font-mono">{formatUsd(data.totalCostUsd)}</td>
                </tr>
              </tbody>
            </table>
            {!isActual && (
              <p className="text-slate-400 mt-2 leading-snug">
                Larger CVs and job descriptions increase input cost. Output is estimated ~6.5k tokens;
                actual may vary.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
