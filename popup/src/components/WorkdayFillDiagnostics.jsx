import { motion } from "framer-motion";
import {
  FIELD_STATUS_LABELS,
  PAGE_PHASE_LABELS,
  summarizeWorkdayDiagnostics,
} from "../lib/workday-fill-diagnostics.js";

function StatusIcon({ status }) {
  if (status === "filled" || status === "found") {
    return <span className="text-emerald-600 font-bold" aria-hidden>✓</span>;
  }
  if (status === "failed") {
    return <span className="text-red-600 font-bold" aria-hidden>!</span>;
  }
  if (status === "skipped") {
    return <span className="text-slate-400 font-bold" aria-hidden>–</span>;
  }
  return <span className="text-amber-600 font-bold" aria-hidden>?</span>;
}

function phaseBadgeClass(phase) {
  if (phase === "apply_form") return "bg-emerald-100 text-emerald-800";
  if (phase === "job_posting") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function WorkdayFillDiagnostics({ diagnostics, compact = false }) {
  if (!diagnostics) return null;

  const { ready } = summarizeWorkdayDiagnostics(diagnostics);

  return (
    <motion.div
      className={`rounded-lg border text-xs ${
        compact ? "p-3 bg-slate-50 border-slate-200" : "p-4 bg-white border-violet-200 shadow-sm"
      }`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-semibold text-slate-800">Workday fill report</span>
        <span
          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${phaseBadgeClass(
            diagnostics.pagePhase
          )}`}
        >
          {PAGE_PHASE_LABELS[diagnostics.pagePhase] || diagnostics.pagePhase}
        </span>
        {diagnostics.mode === "fill" && (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blitz-100 text-blitz-800">
            After fill
          </span>
        )}
        {ready && diagnostics.mode === "scan" && (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
            Form ready
          </span>
        )}
      </div>

      <p className="text-slate-600 mb-3 leading-snug">{diagnostics.summary}</p>

      <ul className="space-y-1.5 mb-3">
        {diagnostics.fields.map((field) => (
          <li key={field.id} className="flex items-start gap-2">
            <StatusIcon status={field.status} />
            <span className="min-w-0 flex-1">
              <span className="font-medium text-slate-800">{field.label}</span>
              <span className="text-slate-500"> — {FIELD_STATUS_LABELS[field.status] || field.status}</span>
              {field.detail && (
                <span className="block text-[11px] text-slate-500 mt-0.5">{field.detail}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {diagnostics.screening?.expected > 0 && (
        <p className="text-slate-600 mb-2">
          Screening: {diagnostics.screening.matched}/{diagnostics.screening.expected} placed
          {diagnostics.screening.unmatched?.length > 0 && (
            <span className="block text-[11px] text-amber-800 mt-1">
              Unmatched: {diagnostics.screening.unmatched.slice(0, 3).join("; ")}
              {diagnostics.screening.unmatched.length > 3 ? "…" : ""}
            </span>
          )}
        </p>
      )}

      <p className="text-slate-600 mb-2">
        Résumé: {diagnostics.resume?.status?.replace(/_/g, " ") || "—"}
        {diagnostics.resume?.detail && (
          <span className="block text-[11px] text-slate-500">{diagnostics.resume.detail}</span>
        )}
      </p>

      {!compact && (
        <p className="text-[11px] text-slate-500 mb-2">
          Shadow roots: {diagnostics.shadowRootCount} · iframes: {diagnostics.iframeCount}
          {diagnostics.applyButtonFound ? " · Apply button visible" : ""}
        </p>
      )}

      {diagnostics.warnings?.length > 0 && (
        <ul className="mb-2 space-y-1">
          {diagnostics.warnings.map((w, i) => (
            <li key={`w-${i}`} className="text-[11px] text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1">
              {w}
            </li>
          ))}
        </ul>
      )}

      {diagnostics.suggestions?.length > 0 && !compact && (
        <ul className="space-y-1">
          {diagnostics.suggestions.slice(0, 3).map((s, i) => (
            <li key={`s-${i}`} className="text-[11px] text-blitz-800">
              {s}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
