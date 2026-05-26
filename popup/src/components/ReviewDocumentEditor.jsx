import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { normalizeEditorHtml } from "../lib/document-rich-text.js";
import {
  downloadEditorPdf,
  downloadEditorWord,
  downloadEditorHtmlFile,
  bodyHtmlForExport,
  wrapEditorHtmlForPrint,
} from "../lib/document-export.js";
import { Modal, ModalButton } from "./Modal.jsx";
import { useModal } from "../hooks/useModal.js";
import { Btn } from "./motion.jsx";

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

export default function ReviewDocumentEditor({
  label,
  value,
  onChange,
  fullPage = false,
  exportBasename = "Document",
  onExportPdfWithLayout,
  mono = false,
}) {
  const { showAlert } = useModal();
  const editorRef = useRef(null);
  const [viewMode, setViewMode] = useState("rich");
  const [htmlSource, setHtmlSource] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [exporting, setExporting] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");

  const normalizedHtml = normalizeEditorHtml(value);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || viewMode !== "rich") return;
    if (el.innerHTML === normalizedHtml) return;
    el.innerHTML = normalizedHtml;
  }, [normalizedHtml, viewMode]);

  useEffect(() => {
    if (viewMode === "html") {
      setHtmlSource(bodyHtmlForExport(value) || "");
    }
  }, [viewMode, value]);

  const sync = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    onChange(html);
  }, [onChange]);

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    sync();
  };

  const applyHtmlSource = () => {
    onChange(htmlSource);
    setViewMode("rich");
  };

  const insertLink = async () => {
    const sel = window.getSelection();
    if (!sel?.rangeCount || sel.isCollapsed) {
      await showAlert("Select the link text first, then click Link.", {
        title: "Select text first",
        variant: "warning",
      });
      return;
    }
    setLinkUrl("https://");
    setLinkModalOpen(true);
  };

  const applyLink = () => {
    let url = linkUrl.trim();
    if (!url) {
      setLinkModalOpen(false);
      return;
    }
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      url = `https://${url}`;
    }
    exec("createLink", url);
    setLinkModalOpen(false);
  };

  const runExport = async (fn) => {
    setExporting(true);
    try {
      const current = viewMode === "html" ? htmlSource : value;
      await fn(current);
    } catch (err) {
      await showAlert(err.message || "Export failed", {
        title: "Export failed",
        variant: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePreview = () => {
    const body = bodyHtmlForExport(viewMode === "html" ? htmlSource : value);
    if (!body) return;
    setPreviewHtml(wrapEditorHtmlForPrint(body, exportBasename));
    setPreviewOpen(true);
  };

  return (
    <motion.div className="block" layout>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setViewMode("rich")}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              viewMode === "rich"
                ? "bg-blitz-600 text-white border-blitz-600"
                : "bg-white text-slate-600 border-slate-300 hover:border-blitz-400"
            }`}
          >
            Rich text
          </button>
          <button
            type="button"
            onClick={() => setViewMode("html")}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              viewMode === "html"
                ? "bg-blitz-600 text-white border-blitz-600"
                : "bg-white text-slate-600 border-slate-300 hover:border-blitz-400"
            }`}
          >
            HTML
          </button>
        </div>
      </div>

      <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
        {viewMode === "rich" && (
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
            <ToolbarButton title="Insert hyperlink" onClick={insertLink}>
              <span className="text-blitz-700 font-semibold">Link</span>
            </ToolbarButton>
            <ToolbarButton title="Remove hyperlink" onClick={() => exec("unlink")}>
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
          </div>
        )}

        {viewMode === "rich" ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={sync}
            className={`cv-rich-editor px-4 py-3 outline-none text-sm text-slate-800 overflow-y-auto ${
              mono ? "font-mono text-[13px]" : ""
            } ${fullPage ? "min-h-[320px] max-h-[520px]" : "min-h-[200px] max-h-[300px]"}`}
            style={{ lineHeight: 1.45 }}
          />
        ) : (
          <div className="p-2">
            <textarea
              value={htmlSource}
              onChange={(e) => setHtmlSource(e.target.value)}
              className={`w-full text-xs font-mono border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blitz-200 ${
                fullPage ? "min-h-[320px]" : "min-h-[200px]"
              }`}
              spellCheck={false}
            />
            <div className="flex justify-end mt-2">
              <Btn
                type="button"
                onClick={applyHtmlSource}
                className="text-xs px-3 py-1.5 bg-blitz-600 text-white rounded-lg hover:bg-blitz-700"
              >
                Apply HTML to editor
              </Btn>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-slate-100 bg-slate-50/90">
          <Btn
            type="button"
            onClick={handlePreview}
            disabled={exporting}
            className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Preview
          </Btn>
          <Btn
            type="button"
            onClick={() =>
              runExport(async (v) => {
                if (onExportPdfWithLayout) {
                  await onExportPdfWithLayout(v);
                } else {
                  await downloadEditorPdf(v, exportBasename);
                }
              })
            }
            disabled={exporting}
            className="text-xs px-2.5 py-1 border border-blitz-300 text-blitz-700 rounded-md bg-white hover:bg-blitz-50 disabled:opacity-50"
          >
            {exporting ? "…" : "PDF"}
          </Btn>
          <Btn
            type="button"
            onClick={() => runExport((v) => downloadEditorWord(v, exportBasename))}
            disabled={exporting}
            className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Word
          </Btn>
          <Btn
            type="button"
            onClick={() => runExport((v) => downloadEditorHtmlFile(v, exportBasename))}
            disabled={exporting}
            className="text-xs px-2.5 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            .html
          </Btn>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
        Format with the toolbar, switch to <strong>HTML</strong> to edit source, or export as PDF / Word
        (.doc) / HTML. Form fill still uses plain text derived from this content.
      </p>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`${label} — preview`}
        size="lg"
        footer={<ModalButton onClick={() => setPreviewOpen(false)}>Close</ModalButton>}
      >
        <iframe
          title={`${label} preview`}
          srcDoc={previewHtml}
          className="w-full min-h-[480px] border-0 bg-slate-100 rounded-lg"
          sandbox="allow-same-origin"
        />
      </Modal>

      <Modal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Insert hyperlink"
        closeOnBackdrop={false}
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setLinkModalOpen(false)}>
              Cancel
            </ModalButton>
            <ModalButton variant="primary" onClick={applyLink}>
              Insert link
            </ModalButton>
          </>
        }
      >
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blitz-200"
          onKeyDown={(e) => {
            if (e.key === "Enter") applyLink();
          }}
        />
      </Modal>
    </motion.div>
  );
}
