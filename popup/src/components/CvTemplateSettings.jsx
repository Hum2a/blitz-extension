import { useState, useEffect, useCallback } from "react";
import { getStorage, setStorage } from "../lib/storage.js";
import {
  DEFAULT_CV_HTML_TEMPLATE,
  CV_TEMPLATE_VARIABLES_HELP,
} from "../lib/cv-template-default.js";
import { renderCvHtml } from "../lib/cv-template-engine.js";
import { FadeUp, Btn } from "./motion.jsx";

const SAMPLE_CV_DOCUMENT = {
  fullName: "Your Name",
  contactLine: "City • phone • email | GitHub | Portfolio | LinkedIn",
  summary:
    "Professional summary tailored to the role appears here. Edit this HTML template to match your CV design.",
  education: [
    {
      heading: "University – 2019 – 2023",
      lines: ["MEng Computer Science"],
    },
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
      bullets: [
        "Reduced API latency by 40% by introducing edge caching, improving user experience.",
      ],
      tech: "TypeScript, Node.js, AWS",
    },
  ],
};

export default function CvTemplateSettings({ fullPage = false }) {
  const [template, setTemplate] = useState("");
  const [saved, setSaved] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    getStorage("cv_html_template").then((stored) => {
      setTemplate((stored && String(stored).trim()) || DEFAULT_CV_HTML_TEMPLATE);
    });
  }, []);

  const persist = useCallback(async (value) => {
    await setStorage("cv_html_template", value);
    setSaved(true);
  }, []);

  const onChange = (value) => {
    setTemplate(value);
    setSaved(false);
    setError(null);
  };

  const save = async () => {
    try {
      renderCvHtml(template, SAMPLE_CV_DOCUMENT);
      await persist(template);
    } catch (err) {
      setError(err.message || "Template error");
    }
  };

  const resetDefault = async () => {
    setTemplate(DEFAULT_CV_HTML_TEMPLATE);
    await persist(DEFAULT_CV_HTML_TEMPLATE);
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

  return (
    <FadeUp>
      <div
        className={`bg-white border border-slate-200 rounded-xl p-4 space-y-3 ${fullPage ? "shadow-sm" : ""}`}
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-800">CV HTML template</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Tailored CVs render through this HTML, then convert to PDF for downloads and job uploads.
            Customise layout and CSS here — synced via extension storage (and your web workspace).
          </p>
        </div>

        <textarea
          value={template}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={`w-full border border-slate-300 rounded-lg p-3 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blitz-200 ${
            fullPage ? "min-h-[320px]" : "min-h-[200px]"
          }`}
        />

        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">Template variables</summary>
          <pre className="mt-2 whitespace-pre-wrap bg-slate-50 p-2 rounded border text-[10px]">
            {CV_TEMPLATE_VARIABLES_HELP}
          </pre>
        </details>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={save}
            className="text-xs bg-blitz-600 text-white px-3 py-2 rounded-lg hover:bg-blitz-700"
          >
            {saved ? "Saved" : "Save template"}
          </Btn>
          <Btn
            onClick={openPreview}
            className="text-xs border border-slate-300 px-3 py-2 rounded-lg bg-white hover:bg-slate-50"
          >
            Preview sample
          </Btn>
          <Btn
            onClick={resetDefault}
            className="text-xs border border-slate-300 px-3 py-2 rounded-lg bg-white hover:bg-slate-50"
          >
            Reset to default
          </Btn>
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold text-slate-900">CV preview (sample data)</h4>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-lg leading-none"
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
    </FadeUp>
  );
}
