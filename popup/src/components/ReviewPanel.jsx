import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setStorage } from "../lib/storage.js";
import { useApplications } from "../hooks/useApplications.js";
import { persistFilledApplication } from "../lib/application-store.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import CostEstimate from "./CostEstimate.jsx";
import GenerationProgress from "./GenerationProgress.jsx";
import { progressFromStage } from "../lib/generation-progress.js";
import { displayApplicationLabel } from "../lib/application-history-utils.js";
import { scrollPanelClass } from "../lib/layout.js";
import { getStorage } from "../lib/storage.js";
import {
  applyTailoredCvToPdfLayout,
  downloadCvPdf,
  resolvePdfHtmlForExport,
} from "../lib/cv-export.js";
import ReviewPdfHtmlEditor from "./ReviewPdfHtmlEditor.jsx";
import ApplicationVersionsBar from "./ApplicationVersionsBar.jsx";
import { Stagger, FadeUp, Card, Btn } from "./motion.jsx";
import { Modal, ModalButton } from "./Modal.jsx";
import { useModal } from "../hooks/useModal.js";
import {
  archiveDraftToVersions,
  applyVersionToApplication,
  listVersions,
  restoreLatestSnapshot,
} from "../lib/application-versions.js";

export default function ReviewPanel({
  application,
  pendingJob,
  onBack,
  onRegenerate,
  onApplicationUpdate,
  license,
  generating,
  fullPage = false,
  lastGenerationCost,
  generationProgress,
}) {
  const { showAlert } = useModal();
  const { refresh: refreshApplications } = useApplications();
  const [cv, setCv] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState([]);
  const [filling, setFilling] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [cvPreviewOpen, setCvPreviewOpen] = useState(false);
  const [cvPreviewHtml, setCvPreviewHtml] = useState("");
  const [pdfHtmlOverride, setPdfHtmlOverride] = useState(null);
  const [pdfLayoutHtml, setPdfLayoutHtml] = useState(null);
  const [pdfLayoutUpdatedAt, setPdfLayoutUpdatedAt] = useState(null);
  const [useManualPdfHtml, setUseManualPdfHtml] = useState(false);
  const [pdfApplying, setPdfApplying] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("draft");
  const initialCvRef = useRef("");

  const applyToEditor = (app) => {
    const text = app.tailoredCV || "";
    setCv(text);
    initialCvRef.current = text;
    setCoverLetter(app.coverLetter || "");
    setAnswers(app.screeningAnswers || []);
    setPdfHtmlOverride(app.pdfHtmlOverride || null);
    setPdfLayoutHtml(app.pdfLayoutHtml || null);
    setPdfLayoutUpdatedAt(app.pdfLayoutUpdatedAt || null);
    setUseManualPdfHtml(Boolean(app.pdfHtmlOverride?.trim()));
    setActiveVersionId(app.activeVersionId || null);
  };

  const buildDraft = () => ({
    tailoredCV: cv,
    coverLetter,
    screeningAnswers: answers,
    pdfLayoutHtml,
    pdfLayoutUpdatedAt,
    pdfHtmlOverride,
  });

  const persistApplication = async (updated) => {
    onApplicationUpdate(updated);
    await setStorage("pending_application", updated);
  };

  useEffect(() => {
    if (!application) return;
    applyToEditor(application);
  }, [application]);

  const versionList = listVersions(application);

  const handleRestoreVersion = async (versionId) => {
    const archived = archiveDraftToVersions(application, buildDraft());
    const restored = versionId
      ? applyVersionToApplication(archived, versionId)
      : restoreLatestSnapshot(archived);
    applyToEditor(restored);
    await persistApplication(restored);
  };

  const openCompare = () => {
    const items = versionList;
    setCompareLeftId(items.length ? items[items.length - 1].id : "draft");
    setCompareRightId("draft");
    setCompareOpen(true);
  };

  const compareText = (id) => {
    if (id === "draft") return cv;
    const v = versionList.find((x) => x.id === id);
    return v?.tailoredCV || "";
  };

  const handleRegenerateClick = async () => {
    const archived = archiveDraftToVersions(application, buildDraft());
    await persistApplication(archived);
    setActiveVersionId(null);
    await onRegenerate();
  };

  const persistPdfHtmlOverride = async (html, manual = true) => {
    setPdfHtmlOverride(html);
    setUseManualPdfHtml(Boolean(html?.trim() && manual));
    const updated = {
      ...application,
      pdfHtmlOverride: html || undefined,
    };
    onApplicationUpdate(updated);
    await setStorage("pending_application", updated);
  };

  const persistPdfLayout = async (html) => {
    const at = new Date().toISOString();
    setPdfLayoutHtml(html);
    setPdfLayoutUpdatedAt(at);
    setPdfHtmlOverride(null);
    setUseManualPdfHtml(false);
    const updated = {
      ...application,
      pdfLayoutHtml: html,
      pdfLayoutUpdatedAt: at,
      pdfHtmlOverride: undefined,
    };
    onApplicationUpdate(updated);
    await setStorage("pending_application", updated);
  };

  const pdfLayoutStale =
    Boolean(pdfLayoutHtml) &&
    cv.trim() !== (initialCvRef.current || "").trim();

  const handleApplyPdfLayout = async () => {
    setPdfApplying(true);
    try {
      const userProfile = (await getStorage("user_profile")) || {};
      const { cvDocument, tailoredCV } = exportCvPayload();
      const { html } = await applyTailoredCvToPdfLayout({
        cvDocument,
        tailoredCV,
        userProfile,
      });
      await persistPdfLayout(html);
      await showAlert(
        "Your Word CV layout now includes the Tailored CV text. Use Preview or Download PDF.",
        { title: "PDF layout updated", variant: "success" }
      );
    } catch (err) {
      await showAlert(err.message || "Could not update PDF layout", {
        title: "Update failed",
        variant: "error",
      });
    } finally {
      setPdfApplying(false);
    }
  };

  /** Always pass latest textarea + structured AI doc (merged at export time). */
  const exportCvPayload = () => ({
    cvDocument: application?.cvDocument ?? null,
    tailoredCV: cv,
  });

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const userProfile = (await getStorage("user_profile")) || {};
      const label = displayApplicationLabel({
        applicationTitle: application.applicationTitle,
        role: pendingJob?.jobTitle || application.jobData?.jobTitle,
        company: pendingJob?.company || application.jobData?.company,
      });
      const { cvDocument, tailoredCV } = exportCvPayload();
      const { html: pdfHtml } = await resolvePdfHtmlForExport({
        cvDocument,
        tailoredCV,
        userProfile,
        htmlOverride: pdfHtmlOverride,
        useManualOverride: useManualPdfHtml,
      });
      if (!useManualPdfHtml) {
        await persistPdfLayout(pdfHtml);
        initialCvRef.current = cv.trim();
      }
      await downloadCvPdf({
        cvDocument,
        tailoredCV,
        userProfile,
        html: pdfHtml,
        filename: `${label}.pdf`,
      });
    } catch (err) {
      await showAlert(err.message || "Could not generate PDF", {
        title: "PDF export failed",
        variant: "error",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreviewCv = async () => {
    setPdfLoading(true);
    try {
      const userProfile = (await getStorage("user_profile")) || {};
      const { cvDocument, tailoredCV } = exportCvPayload();
      const { html } = await resolvePdfHtmlForExport({
        cvDocument,
        tailoredCV,
        userProfile,
        htmlOverride: pdfHtmlOverride,
        useManualOverride: useManualPdfHtml,
      });
      if (!useManualPdfHtml) {
        await persistPdfLayout(html);
        initialCvRef.current = cv.trim();
      }
      setCvPreviewHtml(html);
      setCvPreviewOpen(true);
    } catch (err) {
      await showAlert(err.message || "Could not preview CV", {
        title: "Preview failed",
        variant: "error",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  if (!application) {
    return (
      <motion.div
        className="text-center py-8 text-slate-600"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p>No application generated yet.</p>
        <Btn onClick={onBack} className="mt-4 text-blitz-600 underline bg-transparent">
          Back to dashboard
        </Btn>
      </motion.div>
    );
  }

  const updateAnswer = (index, field, value) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const handleApprove = async () => {
    if (!license.allowed) {
      await showAlert("Free tier limit reached (15 applications).", {
        title: "Upgrade required",
        variant: "warning",
      });
      return;
    }
    setFilling(true);
    const updated = {
      ...application,
      tailoredCV: cv,
      coverLetter,
      screeningAnswers: answers,
      pdfHtmlOverride: pdfHtmlOverride || undefined,
      pdfLayoutHtml: pdfLayoutHtml || undefined,
      pdfLayoutUpdatedAt: pdfLayoutUpdatedAt || undefined,
    };
    await setStorage("pending_application", updated);
    onApplicationUpdate(updated);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const result = await chrome.runtime.sendMessage({
        type: "FILL_FORM",
        payload: { tabId: tab?.id },
      });
      if (result?.error) throw new Error(result.error);

      await persistFilledApplication(updated, pendingJob, answers);
      await refreshApplications();

      license.refresh();
      await showAlert("Form filled. Review the page and submit when ready.", {
        title: "Form filled",
        variant: "success",
      });
      onBack();
    } catch (err) {
      await showAlert(err.message || "Failed to fill form", {
        title: "Fill failed",
        variant: "error",
      });
    } finally {
      setFilling(false);
    }
  };

  const dailyWarning =
    license.remaining != null &&
    license.remaining !== Infinity &&
    license.remaining <= 3;

  const sidebar = (
    <>
      <FadeUp>
        <Card
          className={`bg-white rounded-xl border p-4 space-y-3 ${fullPage ? "shadow-sm" : ""}`}
          delay={0}
        >
          <h2 className="text-sm font-bold text-slate-900 leading-snug">
            {displayApplicationLabel({
              applicationTitle: application.applicationTitle,
              role: pendingJob?.jobTitle || application.jobData?.jobTitle,
              company: pendingJob?.company || application.jobData?.company,
            })}
          </h2>
          <MatchScoreRing
            score={application.matchScore}
            rationale={application.matchRationale}
            size={fullPage ? 100 : 88}
          />
          {(lastGenerationCost || application.cost) && (
            <CostEstimate actualCost={lastGenerationCost || application.cost} />
          )}
        </Card>
      </FadeUp>
      <motion.div
        className={`flex flex-col gap-2 ${fullPage ? "" : "sticky bottom-0 bg-slate-50/95 backdrop-blur pt-2 pb-1"}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Btn
          onClick={handleApprove}
          disabled={filling}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg btn-shine"
        >
          {filling ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <motion.span
                className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full inline-block"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
              />
              Filling form…
            </span>
          ) : (
            "Approve & fill"
          )}
        </Btn>
        {generating && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Regeneration runs in the background — you can close Blitz and return when it finishes.
            </p>
            <GenerationProgress
              progress={generationProgress || progressFromStage("api", "Regenerating…")}
            />
          </div>
        )}
        <Btn
          onClick={handleApplyPdfLayout}
          loading={pdfApplying}
          disabled={pdfApplying || !cv.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg text-sm btn-shine disabled:opacity-50"
        >
          {pdfApplying ? "Updating PDF layout…" : "Update PDF from tailored CV"}
        </Btn>
        <p className="text-[11px] text-slate-500 leading-snug">
          {useManualPdfHtml ? (
            <>
              Using <strong>manual PDF HTML</strong> (see editor below). Uncheck custom HTML to use
              applied layout.
            </>
          ) : pdfLayoutHtml ? (
            <>
              PDF layout applied
              {pdfLayoutUpdatedAt
                ? ` ${new Date(pdfLayoutUpdatedAt).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`
                : ""}
              .{pdfLayoutStale ? " Tailored CV changed — click Update again." : ""}
            </>
          ) : (
            <>
              Preview and download merge your <strong>Tailored CV</strong> into your Word layout
              automatically. Use <strong>Update PDF from tailored CV</strong> to refresh the HTML
              editor below.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Btn
            onClick={handlePreviewCv}
            loading={pdfLoading}
            disabled={pdfLoading || pdfApplying}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white bg-white"
          >
            {pdfLoading ? "Building…" : "Preview PDF layout"}
          </Btn>
          <Btn
            onClick={handleDownloadPdf}
            loading={pdfLoading}
            disabled={pdfLoading || pdfApplying}
            className="flex-1 border border-blitz-300 text-blitz-700 py-2 rounded-lg text-sm hover:bg-blitz-50 bg-white"
          >
            {pdfLoading ? "Building PDF…" : "Download PDF"}
          </Btn>
        </div>
        <div className="flex gap-2">
          <Btn
            onClick={handleRegenerateClick}
            disabled={generating}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white bg-white disabled:opacity-50"
          >
            {generating ? "Regenerating…" : "Regenerate"}
          </Btn>
          <Btn
            onClick={onBack}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white bg-white"
          >
            Skip
          </Btn>
        </div>
      </motion.div>
    </>
  );

  const editors = (
    <div className="space-y-4">
      <ApplicationVersionsBar
        versions={application?.versions}
        activeVersionId={activeVersionId}
        hasLatestSnapshot={Boolean(application?.latestSnapshot)}
        onRestoreLatest={() => handleRestoreVersion(null)}
        onRestore={handleRestoreVersion}
        onCompare={openCompare}
      />
      <div className={`grid gap-4 ${fullPage ? "grid-cols-1" : "grid-cols-1 gap-3"}`}>
        {[
          ["Tailored CV", cv, setCv, fullPage ? 14 : 8, "font-mono"],
          ["Cover letter", coverLetter, setCoverLetter, fullPage ? 10 : 6, ""],
        ].map(([label, value, setter, rows, extra], i) => (
          <FadeUp key={label} delay={0.06 + i * 0.05}>
            <motion.label className="block" whileFocus={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
              <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
              <motion.textarea
                value={value}
                onChange={(e) => setter(e.target.value)}
                rows={rows}
                className={`mt-1 w-full text-sm border rounded-lg p-3 focus:ring-2 focus:ring-blitz-200 focus:border-blitz-400 transition-shadow ${extra}`}
                layout
              />
            </motion.label>
          </FadeUp>
        ))}
      </div>
      <ReviewPdfHtmlEditor
        application={application}
        cvDocument={application?.cvDocument ?? null}
        tailoredCV={cv}
        pdfHtmlOverride={pdfHtmlOverride}
        pdfLayoutHtml={pdfLayoutHtml}
        pdfLayoutUpdatedAt={pdfLayoutUpdatedAt}
        pdfLayoutStale={pdfLayoutStale}
        useManualPdfHtml={useManualPdfHtml}
        onOverrideChange={persistPdfHtmlOverride}
        onApplyLayout={handleApplyPdfLayout}
        applyingLayout={pdfApplying}
        fullPage={fullPage}
      />
      {answers.length > 0 && (
        <FadeUp delay={0.15}>
          <p className="text-[11px] text-slate-500 mb-2 leading-snug">
            These answers were generated in one AI call when you tailored the application (not when
            you opened Review). Edit them before Approve &amp; fill, or turn off Screening Q&amp;A
            under Prompt content (cost) before regenerating.
          </p>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Screening Q&A</h3>
          <div className="space-y-2">
            {answers.map((a, i) => (
              <motion.div
                key={i}
                className="border rounded-lg p-3 bg-white text-sm"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ borderColor: "#3b5bdb", boxShadow: "0 4px 12px rgba(59,91,219,0.08)" }}
              >
                <p className="font-medium text-slate-700 mb-1">{a.question}</p>
                <textarea
                  value={a.answer}
                  onChange={(e) => updateAnswer(i, "answer", e.target.value)}
                  rows={2}
                  className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-blitz-300"
                />
              </motion.div>
            ))}
          </div>
        </FadeUp>
      )}
    </div>
  );

  return (
    <Stagger className={`space-y-3 ${scrollPanelClass(fullPage)}`}>
      <AnimatePresence>
        {dailyWarning && (
          <motion.div
            key="warn"
            className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-2 rounded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {license.remaining} free application{license.remaining === 1 ? "" : "s"} left.
          </motion.div>
        )}
      </AnimatePresence>

      {fullPage ? (
        <div className="grid lg:grid-cols-12 gap-8 -mt-2">
          <aside className="lg:col-span-4 space-y-4">{sidebar}</aside>
          <div className="lg:col-span-8">{editors}</div>
        </div>
      ) : (
        <>
          {sidebar}
          {editors}
        </>
      )}

      <Modal
        open={cvPreviewOpen}
        onClose={() => setCvPreviewOpen(false)}
        title="Formatted CV (HTML)"
        size="lg"
        footer={<ModalButton onClick={() => setCvPreviewOpen(false)}>Close</ModalButton>}
      >
        <iframe
          title="CV preview"
          srcDoc={cvPreviewHtml}
          className="w-full min-h-[480px] border-0 bg-slate-100 rounded-lg"
          sandbox="allow-same-origin"
        />
      </Modal>

      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Compare CV versions"
        size="lg"
        footer={<ModalButton onClick={() => setCompareOpen(false)}>Close</ModalButton>}
      >
        <div className="flex flex-wrap gap-3 mb-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-slate-600">Left</span>
            <select
              value={compareLeftId}
              onChange={(e) => setCompareLeftId(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="draft">Current draft</option>
              {versionList.map((v, i) => (
                <option key={v.id} value={v.id}>
                  v{i + 1} — {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-slate-600">Right</span>
            <select
              value={compareRightId}
              onChange={(e) => setCompareRightId(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="draft">Current draft</option>
              {versionList.map((v, i) => (
                <option key={v.id} value={v.id}>
                  v{i + 1} — {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <textarea
            readOnly
            value={compareText(compareLeftId)}
            className="w-full h-64 text-xs font-mono border rounded-lg p-2 bg-slate-50"
          />
          <textarea
            readOnly
            value={compareText(compareRightId)}
            className="w-full h-64 text-xs font-mono border rounded-lg p-2 bg-slate-50"
          />
        </div>
      </Modal>
    </Stagger>
  );
}
