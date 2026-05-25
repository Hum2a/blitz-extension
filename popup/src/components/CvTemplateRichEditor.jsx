import { useRef, useEffect, useCallback } from "react";
import { TEMPLATE_VARIABLES } from "../lib/cv-template-utils.js";

function ToolbarButton({ title, onClick, children, active }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-8 min-w-8 px-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-blitz-100 text-blitz-800"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function CvTemplateRichEditor({ innerHtml, onInnerHtmlChange, fullPage }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML === innerHtml) return;
    el.innerHTML = innerHtml || "<p></p>";
  }, [innerHtml]);

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    sync();
  };

  const sync = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    onInnerHtmlChange(html);
  }, [onInnerHtmlChange]);

  const insertSnippet = (snippet) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand("insertText", false, snippet);
    sync();
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-slate-200 bg-slate-50">
        <ToolbarButton title="Bold" onClick={() => exec("bold")}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => exec("italic")}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Underline" onClick={() => exec("underline")}>
          <span className="underline">U</span>
        </ToolbarButton>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton title="Heading 1" onClick={() => exec("formatBlock", "h1")}>
          H1
        </ToolbarButton>
        <ToolbarButton title="Heading 2" onClick={() => exec("formatBlock", "h2")}>
          H2
        </ToolbarButton>
        <ToolbarButton title="Paragraph" onClick={() => exec("formatBlock", "p")}>
          P
        </ToolbarButton>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <ToolbarButton title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          • List
        </ToolbarButton>
        <span className="w-px h-6 bg-slate-200 mx-1" />
        <select
          className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white max-w-[140px]"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) insertSnippet(v);
            e.target.value = "";
          }}
        >
          <option value="">Insert variable…</option>
          {TEMPLATE_VARIABLES.map((v) => (
            <option key={v.key} value={v.snippet}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        className={`cv-rich-editor px-4 py-3 outline-none text-sm text-slate-800 overflow-y-auto ${
          fullPage ? "min-h-[360px] max-h-[480px]" : "min-h-[220px] max-h-[280px]"
        }`}
        style={{ lineHeight: 1.45 }}
      />
      <p className="text-[11px] text-slate-500 px-3 py-2 border-t border-slate-100 bg-slate-50/80">
        Visual editor changes the CV body only. Keep <code className="text-blitz-700">{"{{tags}}"}</code>{" "}
        for dynamic fields — use HTML mode for full control.
      </p>
    </div>
  );
}
