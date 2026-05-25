import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setStorage } from "../lib/storage.js";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import CostEstimate from "./CostEstimate.jsx";
import { Stagger, FadeUp, Card, Btn } from "./motion.jsx";

export default function ReviewPanel({
  application,
  pendingJob,
  onBack,
  onRegenerate,
  onApplicationUpdate,
  license,
  lastGenerationCost,
}) {
  const { saveApplication } = useApplications();
  const [cv, setCv] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState([]);
  const [filling, setFilling] = useState(false);

  useEffect(() => {
    if (!application) return;
    setCv(application.tailoredCV || "");
    setCoverLetter(application.coverLetter || "");
    setAnswers(application.screeningAnswers || []);
  }, [application]);

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
      alert("Free tier limit reached (15 applications).");
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
      alert("Form filled. Review the page and submit when ready.");
      onBack();
    } catch (err) {
      alert(err.message || "Failed to fill form");
    } finally {
      setFilling(false);
    }
  };

  const dailyWarning =
    license.remaining != null &&
    license.remaining !== Infinity &&
    license.remaining <= 3;

  return (
    <Stagger className="space-y-3 max-h-[440px] overflow-y-auto">
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

      <FadeUp>
        <Card className="bg-white rounded-lg border p-3 space-y-3" delay={0}>
          <MatchScoreRing
            score={application.matchScore}
            rationale={application.matchRationale}
            size={88}
          />
          {(lastGenerationCost || application.cost) && (
            <CostEstimate actualCost={lastGenerationCost || application.cost} />
          )}
        </Card>
      </FadeUp>

      <div className="grid grid-cols-1 gap-3">
        {[
          ["Tailored CV", cv, setCv, 8, "font-mono"],
          ["Cover letter", coverLetter, setCoverLetter, 6, ""],
        ].map(([label, value, setter, rows, extra], i) => (
          <FadeUp key={label} delay={0.06 + i * 0.05}>
            <motion.label
              className="block"
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
              <motion.textarea
                value={value}
                onChange={(e) => setter(e.target.value)}
                rows={rows}
                className={`mt-1 w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blitz-200 focus:border-blitz-400 transition-shadow ${extra}`}
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
                className="border rounded p-2 bg-white text-sm"
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
                  className="w-full border rounded p-1 text-sm focus:ring-1 focus:ring-blitz-300"
                />
              </motion.div>
            ))}
          </div>
        </FadeUp>
      )}

      <motion.div
        className="flex flex-col gap-2 sticky bottom-0 bg-slate-50/95 backdrop-blur pt-2 pb-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Btn
          onClick={handleApprove}
          disabled={filling}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg btn-shine"
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
        <div className="flex gap-2">
          <Btn
            onClick={onRegenerate}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white bg-white"
          >
            Regenerate
          </Btn>
          <Btn
            onClick={onBack}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white bg-white"
          >
            Skip
          </Btn>
        </div>
      </motion.div>
    </Stagger>
  );
}
