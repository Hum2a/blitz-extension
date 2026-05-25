import { useState, useCallback } from "react";
import { getStorage } from "../lib/storage.js";
import { buildRenderedCvHtml } from "../lib/cv-export.js";
import {
  sanitizeWordImportedHtml,
  countWordHtmlSanitizeFixes,
} from "../lib/word-html-import.js";
import { FadeUp, Btn } from "./motion.jsx";

/**
 * Per-application HTML override for PDF preview/download (does not call AI).
 */
export default function ReviewPdfHtmlEditor({
  application,
  cvDocument,
  tailoredCV,
  pdfHtmlOverride,
  onOverrideChange,
  fullPage = false,
}) {
  const [expanded, setExpanded] = useState(Boolean(pdfHtmlOverride));
  const [html, setHtml] = useState(pdfHtmlOverride || "");
  const [useCustom, setUseCustom] = useState(Boolean(pdfHtmlOverride));
  const [loading, setLoading] = useState(false);
  const [sanitizing, setSanitizing] = useState(false);
  const [sanitizeNote, setSanitizeNote] = useState(null);

  const syncOverride = useCallback(
    (nextHtml, enabled) => {
      const value = enabled && nextHtml?.trim() ? nextHtml.trim() : null;
      onOverrideChange(value);
    },
    [onOverrideChange]
  );

  const loadRendered = async () => {
    setLoading(true);
    try {
      const userProfile = (await getStorage("user_profile")) || {};
      const built = await buildRenderedCvHtml({
        cvDocument,
        tailoredCV,
        userProfile,
      });
      setHtml(built);
      setUseCustom(true);
      syncOverride(built, true);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustom = (enabled) => {
    setUseCustom(enabled);
    if (!enabled) {
      syncOverride(null, false);
    } else if (html.trim()) {
      syncOverride(html, true);
    } else {
      loadRendered();
    }
  };

  return (
    <FadeUp delay={0.12}>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 transition text-sm"
        >
          <span className="font-medium text-slate-800">PDF HTML (download layout)</span>
          <span className="text-slate-400 text-xs">
            {useCustom ? "Custom" : "From template"}
            {expanded ? " ▲" : " ▼"}
          </span>
        </button>

        {expanded && (
          <div className="px-3 pb-3 border-t border-slate-100 space-y-3 text-xs text-slate-600">
            <p className="pt-2 leading-relaxed">
              Edit the exact HTML used for <strong>Preview PDF layout</strong> and{" "}
              <strong>Download PDF</strong>. No AI runs here. For a permanent layout, use{" "}
              <strong>Settings → CV layout &amp; PDF template</strong> (import Word as .htm for
              closest match).
            </p>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => toggleCustom(e.target.checked)}
                className="rounded border-slate-300 text-blitz-600"
              />
              <span className="text-slate-800">Use custom HTML for this application&apos;s PDF</span>
            </label>

            {useCustom && (
              <>
                <div className="flex flex-wrap gap-2 items-center">
                  <Btn
                    type="button"
                    onClick={loadRendered}
                    loading={loading}
                    disabled={loading}
                    className="text-xs border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50"
                  >
                    {loading ? "Loading…" : "Reload from template + data"}
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
                  <Btn
                    type="button"
                    onClick={() => {
                      setHtml("");
                      syncOverride(null, true);
                    }}
                    className="text-xs border border-slate-300 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50"
                  >
                    Clear editor
                  </Btn>
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
          </div>
        )}
      </div>
    </FadeUp>
  );
}
