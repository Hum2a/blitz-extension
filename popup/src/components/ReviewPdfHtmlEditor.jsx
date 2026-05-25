import { useState, useCallback, useEffect } from "react";
import {
  sanitizeWordImportedHtml,
  countWordHtmlSanitizeFixes,
} from "../lib/word-html-import.js";
import { FadeUp, Btn } from "./motion.jsx";

/**
 * Per-application PDF layout: applied HTML from tailored CV, or optional manual override.
 */
export default function ReviewPdfHtmlEditor({
  cvDocument,
  tailoredCV,
  pdfHtmlOverride,
  pdfLayoutHtml,
  pdfLayoutUpdatedAt,
  pdfLayoutStale,
  useManualPdfHtml,
  onOverrideChange,
  onApplyLayout,
  applyingLayout = false,
  fullPage = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState(pdfLayoutHtml || pdfHtmlOverride || "");
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizeNote, setSanitizeNote] = useState(null);

  useEffect(() => {
    if (useManualPdfHtml) {
      setHtml(pdfHtmlOverride || "");
    } else {
      setHtml(pdfLayoutHtml || "");
    }
  }, [useManualPdfHtml, pdfHtmlOverride, pdfLayoutHtml]);

  const syncOverride = useCallback(
    (nextHtml, enabled) => {
      onOverrideChange(nextHtml, enabled);
    },
    [onOverrideChange]
  );

  const toggleCustom = (enabled) => {
    if (!enabled) {
      syncOverride(null, false);
      setHtml(pdfLayoutHtml || "");
    } else if (pdfHtmlOverride?.trim()) {
      setHtml(pdfHtmlOverride);
      syncOverride(pdfHtmlOverride, true);
    } else if (pdfLayoutHtml?.trim()) {
      setHtml(pdfLayoutHtml);
      syncOverride(pdfLayoutHtml, true);
    }
  };

  const statusLabel = useManualPdfHtml
    ? "Manual HTML"
    : pdfLayoutHtml
      ? pdfLayoutStale
        ? "Applied (stale)"
        : "Applied"
      : "Not applied";

  return (
    <FadeUp delay={0.12}>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition text-sm"
        >
          <span className="font-medium text-slate-800">PDF HTML (advanced)</span>
          <span className="text-slate-400 text-xs">
            {statusLabel}
            {expanded ? " ▲" : " ▼"}
          </span>
        </button>

        {expanded && (
          <div className="px-3 pb-3 border-t border-slate-100 space-y-3 text-xs text-slate-600">
            <p className="pt-2 leading-relaxed">
              Use the orange <strong>Update PDF from tailored CV</strong> button above for normal
              export. Open this section only to inspect HTML or paste a fully custom layout.
            </p>

            {pdfLayoutHtml && !useManualPdfHtml && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5">
                Applied layout saved
                {pdfLayoutUpdatedAt
                  ? ` · ${new Date(pdfLayoutUpdatedAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}`
                  : ""}
                {pdfLayoutStale ? " · Tailored CV changed since then" : ""}
              </p>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useManualPdfHtml}
                onChange={(e) => toggleCustom(e.target.checked)}
                className="rounded border-slate-300 text-blitz-600"
              />
              <span className="text-slate-800">Use manual HTML instead of applied layout</span>
            </label>

            {useManualPdfHtml && (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <Btn
                    type="button"
                    onClick={onApplyLayout}
                    loading={applyingLayout}
                    disabled={applyingLayout || !tailoredCV?.trim()}
                    className="text-xs border border-amber-400 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                  >
                    {applyingLayout ? "Applying…" : "Apply tailored CV → save layout"}
                  </Btn>
                  <Btn
                    type="button"
                    onClick={async () => {
                      setSanitizing(true);
                      try {
                        const before = countWordHtmlSanitizeFixes(html);
                        const cleaned = sanitizeWordImportedHtml(html);
                        setHtml(cleaned);
                        syncOverride(cleaned, true);
                        setSanitizeNote(
                          before > 0
                            ? `Fixed ${before} encoding issue${before === 1 ? "" : "s"} and list markup.`
                            : "Lists and encoding look OK."
                        );
                      } finally {
                        setSanitizing(false);
                      }
                    }}
                    loading={sanitizing}
                    disabled={sanitizing || !html.trim()}
                    className="text-xs border border-amber-300 bg-amber-50 text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-100"
                  >
                    {sanitizing ? "Fixing…" : "Fix lists & encoding"}
                  </Btn>
                  {sanitizeNote && (
                    <span className="text-[11px] text-amber-800">{sanitizeNote}</span>
                  )}
                </div>
                <textarea
                  value={html}
                  onChange={(e) => {
                    setHtml(e.target.value);
                    syncOverride(e.target.value, true);
                  }}
                  spellCheck={false}
                  className={`w-full border border-slate-300 rounded-lg p-2 font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-blitz-200 ${
                    fullPage ? "min-h-[280px]" : "min-h-[160px]"
                  }`}
                  placeholder="<!DOCTYPE html>… full document for PDF export"
                />
              </>
            )}

            {!useManualPdfHtml && pdfLayoutHtml && (
              <textarea
                readOnly
                value={pdfLayoutHtml}
                className={`w-full border border-slate-200 rounded-lg p-2 font-mono text-[11px] leading-relaxed bg-slate-50 text-slate-600 ${
                  fullPage ? "min-h-[120px]" : "min-h-[80px]"
                }`}
              />
            )}
          </div>
        )}
      </div>
    </FadeUp>
  );
}
