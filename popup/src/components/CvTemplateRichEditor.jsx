import { useRef, useEffect, useCallback } from "react";
import { TEMPLATE_VARIABLES } from "../lib/cv-template-utils.js";

function ToolbarButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-8 min-w-8 px-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
    if (snippet.includes("<") && document.queryCommandSupported("insertHTML")) {
      document.execCommand("insertHTML", false, snippet);
    } else {
      document.execCommand("insertText", false, snippet);
    }
    sync();
  };

  const insertLink = () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.isCollapsed) {
      window.alert("Select the link text first (e.g. GitHub), then click Link.");
      return;
    }
    let url = window.prompt("Link URL", "https://");
    if (!url) return;
    url = url.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      url = `https://${url}`;
    }
    exec("createLink", url);
  };

  const removeLink = () => {
    exec("unlink");
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
        <ToolbarButton title="Insert hyperlink (select text first)" onClick={insertLink}>
          <span className="text-blitz-700 font-semibold">Link</span>
        </ToolbarButton>
        <ToolbarButton title="Remove hyperlink" onClick={removeLink}>
          Unlink
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
          className="text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white max-w-[160px]"
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
      <p className="text-[11px] text-slate-500 px-3 py-2 border-t border-slate-100 bg-slate-50/80 leading-relaxed">
        Use <strong>Link</strong> after selecting text (e.g. turn “GitHub” into a hyperlink). Dynamic rows use{" "}
        <code className="text-blitz-700">{"{{{contactLineHtml}}}"}</code> — URLs come from Settings → Your details.
      </p>
    </div>
  );
}
