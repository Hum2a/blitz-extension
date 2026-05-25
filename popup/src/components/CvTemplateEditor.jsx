import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage } from "../lib/storage.js";
import {
  DEFAULT_CV_HTML_TEMPLATE,
  CV_TEMPLATE_VARIABLES_HELP,
} from "../lib/cv-template-default.js";
import { renderCvHtml } from "../lib/cv-template-engine.js";
import {
  extractCvPageInner,
  extractStyleBlock,
  mergeCvPageInner,
  mergeStyleBlock,
  TEMPLATE_VARIABLES,
} from "../lib/cv-template-utils.js";
import { docxFileToCvTemplate } from "../lib/docx-to-html.js";
import CvTemplateRichEditor from "./CvTemplateRichEditor.jsx";
import { Btn } from "./motion.jsx";

const MODES = [
  { id: "visual", label: "Visual" },
  { id: "html", label: "HTML" },
  { id: "word", label: "Import Word" },
];

const SAMPLE_CV_DOCUMENT = {
  fullName: "Your Name",
  contactLine: "City • phone • email | GitHub | Portfolio | LinkedIn",
  summary:
    "Professional summary tailored to the role appears here. Edit layout visually or in HTML.",
  education: [
    { heading: "University – 2019 – 2023", lines: ["MEng Computer Science"] },
  ],
  skillGroups: [
    { label: "Frontend", value: "TypeScript, React" },
    { label: "Backend", value: "Node.js, PostgreSQL" },
  ],
  careerNote: "See Portfolio for more",
  jobs: [
    {
      company: "Company Name",
      role: "Software Engineer",
      dates: "Jan 2024 – Present",
      location: "London",
      bullets: ["Reduced API latency by 40% by introducing edge caching."],
      tech: "TypeScript, Node.js, AWS",
    },
  ],
};

export default function CvTemplateEditor({ fullPage = false, embedded = false }) {
  const [template, setTemplate] = useState("");
  const [mode, setMode] = useState("visual");
  const [saved, setSaved] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState(null);
  const [cssBlock, setCssBlock] = useState("");
  const [wordLoading, setWordLoading] = useState(false);
  const [importNotes, setImportNotes] = useState(null);

  useEffect(() => {
    getStorage("cv_html_template").then((stored) => {
      const t = (stored && String(stored).trim()) || DEFAULT_CV_HTML_TEMPLATE;
      setTemplate(t);
      setCssBlock(extractStyleBlock(t));
    });
  }, []);

  const persist = useCallback(async (value) => {
    await setStorage("cv_html_template", value);
    setSaved(true);
  }, []);

  const setFullTemplate = (value) => {
    setTemplate(value);
    setCssBlock(extractStyleBlock(value));
    setSaved(false);
    setError(null);
  };

  const innerHtml = extractCvPageInner(template);

  const setInnerHtml = (html) => {
    setFullTemplate(mergeCvPageInner(template, html));
  };

  const setCss = (css) => {
    setCssBlock(css);
    setFullTemplate(mergeStyleBlock(template, css));
  };

  const validateAndSave = async () => {
    try {
      renderCvHtml(template, SAMPLE_CV_DOCUMENT);
      await persist(template);
      setError(null);
    } catch (err) {
      setError(err.message || "Template error");
    }
  };

  const resetDefault = async () => {
    setFullTemplate(DEFAULT_CV_HTML_TEMPLATE);
    await persist(DEFAULT_CV_HTML_TEMPLATE);
    setImportNotes(null);
    setError(null);
  };

  const openPreview = () => {
    try {
      const html = renderCvHtml(template, SAMPLE_CV_DOCUMENT);
      setPreviewHtml(html);
      setPreviewOpen(true);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not render preview");
    }
  };

  const handleWordUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      setError("Please upload a .docx Word file.");
      e.target.value = "";
      return;
    }
    setWordLoading(true);
    setError(null);
    try {
      const { html, warnings } = await docxFileToCvTemplate(file);
      setFullTemplate(html);
      setMode("html");
      setImportNotes(
        warnings.length
          ? `Imported with notes: ${warnings.slice(0, 3).join("; ")}`
          : "Imported from Word. Replace your name and job text with {{variables}} (see HTML or Insert variable in Visual)."
      );
      setSaved(false);
    } catch (err) {
      setError(err.message || "Could not read Word file");
    } finally {
      setWordLoading(false);
      e.target.value = "";
    }
  };

  const insertIntoHtml = (snippet) => {
    setFullTemplate(`${template}\n${snippet}`);
  };

  const wrapperClass = embedded
    ? "space-y-4"
    : `bg-white border border-slate-200 rounded-xl p-4 space-y-4 ${fullPage ? "shadow-sm" : ""}`;

  return (
    <div className={wrapperClass}>
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">CV layout template</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
              Controls PDF appearance. Saved to extension storage and synced with the web workspace.
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${
              saved
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {saved ? "Saved" : "Unsaved changes"}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m.id
                ? "bg-white text-blitz-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "visual" && (
        <div className="space-y-4">
          <CvTemplateRichEditor
            innerHtml={innerHtml}
            onInnerHtmlChange={setInnerHtml}
            fullPage={fullPage}
          />
          <details className="group">
            <summary className="text-sm font-medium text-slate-700 cursor-pointer">
              Page styles (CSS)
            </summary>
            <textarea
              value={cssBlock}
              onChange={(e) => setCss(e.target.value)}
              spellCheck={false}
              className="mt-2 w-full border border-slate-300 rounded-lg p-3 font-mono text-xs min-h-[120px] focus:ring-2 focus:ring-blitz-200"
            />
          </details>
        </div>
      )}

      {mode === "html" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <select
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) insertIntoHtml(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">Insert block at end…</option>
              {TEMPLATE_VARIABLES.map((v) => (
                <option key={v.key} value={v.snippet}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={template}
            onChange={(e) => setFullTemplate(e.target.value)}
            spellCheck={false}
            className={`w-full border border-slate-300 rounded-lg p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blitz-200 ${
              fullPage ? "min-h-[400px]" : "min-h-[220px]"
            }`}
          />
        </div>
      )}

      {mode === "word" && (
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
          <p className="text-sm font-medium text-slate-800">Upload a Word CV (.docx)</p>
          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Blitz converts your document to HTML and applies default PDF styling. You will need to
            add <code className="text-blitz-700">{"{{variables}}"}</code> for tailored content — switch
            to Visual or HTML to adjust.
          </p>
          <label className="inline-block mt-4">
            <span className="cursor-pointer bg-blitz-600 hover:bg-blitz-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg">
              {wordLoading ? "Converting…" : "Choose .docx file"}
            </span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              disabled={wordLoading}
              onChange={handleWordUpload}
            />
          </label>
          {importNotes && (
            <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-3 mt-4 text-left max-w-lg mx-auto">
              {importNotes}
            </p>
          )}
        </div>
      )}

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-700 text-sm">
          Template variable reference
        </summary>
        <pre className="mt-2 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border text-[11px] leading-relaxed">
          {CV_TEMPLATE_VARIABLES_HELP}
        </pre>
      </details>

      {error && (
        <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Btn
          onClick={validateAndSave}
          className="text-sm bg-blitz-600 text-white px-4 py-2 rounded-lg hover:bg-blitz-700"
        >
          Save template
        </Btn>
        <Btn
          onClick={openPreview}
          className="text-sm border border-slate-300 px-4 py-2 rounded-lg bg-white hover:bg-slate-50"
        >
          Preview with sample data
        </Btn>
        <Btn
          onClick={resetDefault}
          className="text-sm border border-slate-300 px-4 py-2 rounded-lg bg-white hover:bg-slate-50"
        >
          Reset to default
        </Btn>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold text-slate-900">CV preview (sample data)</h4>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-lg leading-none px-2"
              >
                ×
              </button>
            </div>
            <iframe
              title="CV template preview"
              srcDoc={previewHtml}
              className="flex-1 w-full min-h-[480px] border-0 bg-slate-100"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
