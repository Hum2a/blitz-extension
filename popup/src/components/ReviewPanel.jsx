import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setStorage } from "../lib/storage.js";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import CostEstimate from "./CostEstimate.jsx";
import GenerationProgress from "./GenerationProgress.jsx";
import { progressFromStage } from "../lib/generation-progress.js";
import { displayApplicationLabel } from "../lib/application-history-utils.js";
import { scrollPanelClass } from "../lib/layout.js";
import { getStorage } from "../lib/storage.js";
import { buildRenderedCvHtml, downloadCvPdf } from "../lib/cv-export.js";
import { Stagger, FadeUp, Card, Btn } from "./motion.jsx";
import { Modal, ModalButton } from "./Modal.jsx";
import { useModal } from "../hooks/useModal.js";

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
  const { saveApplication } = useApplications();
  const [cv, setCv] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState([]);
  const [filling, setFilling] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [cvPreviewOpen, setCvPreviewOpen] = useState(false);
  const [cvPreviewHtml, setCvPreviewHtml] = useState("");
  const initialCvRef = useRef("");

  useEffect(() => {
    if (!application) return;
    const text = application.tailoredCV || "";
    setCv(text);
    initialCvRef.current = text;
    setCoverLetter(application.coverLetter || "");
    setAnswers(application.screeningAnswers || []);
  }, [application]);

  const cvDocumentForExport = () =>
    cv === initialCvRef.current ? application?.cvDocument : null;

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const userProfile = (await getStorage("user_profile")) || {};
      const label = displayApplicationLabel({
        applicationTitle: application.applicationTitle,
        role: pendingJob?.jobTitle || application.jobData?.jobTitle,
        company: pendingJob?.company || application.jobData?.company,
      });
      await downloadCvPdf({
        cvDocument: cvDocumentForExport(),
        tailoredCV: cv,
        userProfile,
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
    try {
      const userProfile = (await getStorage("user_profile")) || {};
      const html = await buildRenderedCvHtml({
        cvDocument: cvDocumentForExport(),
        tailoredCV: cv,
        userProfile,
      });
      setCvPreviewHtml(html);
      setCvPreviewOpen(true);
    } catch (err) {
      await showAlert(err.message || "Could not preview CV", {
        title: "Preview failed",
        variant: "error",
      });
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

      await saveApplication({
        id: crypto.randomUUID(),
        applicationTitle: displayApplicationLabel({
          applicationTitle: application.applicationTitle,
          role: pendingJob?.jobTitle || application.jobData?.jobTitle,
          company: pendingJob?.company || application.jobData?.company,
        }),
        company: pendingJob?.company || application.jobData?.company || "",
        role: pendingJob?.jobTitle || application.jobData?.jobTitle || "",
        url: pendingJob?.url || application.jobData?.url || "",
        platform: pendingJob?.platform || "greenhouse",
        appliedAt: new Date().toISOString(),
        status: "applied",
        matchScore: application.matchScore,
        cvSnapshot: cv,
        coverLetterSnapshot: coverLetter,
        screeningAnswers: answers,
        notes: "",
      });

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
          <GenerationProgress
            progress={generationProgress || progressFromStage("api", "Regenerating…")}
          />
        )}
        <div className="flex gap-2">
          <Btn
            onClick={handlePreviewCv}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white bg-white"
          >
            Preview PDF layout
          </Btn>
          <Btn
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex-1 border border-blitz-300 text-blitz-700 py-2 rounded-lg text-sm hover:bg-blitz-50 bg-white disabled:opacity-50"
          >
            {pdfLoading ? "Building PDF…" : "Download PDF"}
          </Btn>
        </div>
        <div className="flex gap-2">
          <Btn
            onClick={onRegenerate}
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
      {answers.length > 0 && (
        <FadeUp delay={0.15}>
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
    </Stagger>
  );
}
