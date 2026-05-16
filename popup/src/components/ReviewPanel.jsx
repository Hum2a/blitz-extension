import { useState, useEffect } from "react";
import { setStorage } from "../lib/storage.js";
import { useApplications } from "../hooks/useApplications.js";

export default function ReviewPanel({
  application,
  pendingJob,
  onBack,
  onRegenerate,
  onApplicationUpdate,
  license,
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
      <div className="text-center py-8 text-slate-600">
        <p>No application generated yet.</p>
        <button type="button" onClick={onBack} className="mt-4 text-blitz-600 underline">
          Back to dashboard
        </button>
      </div>
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
    <div className="space-y-3 max-h-[440px] overflow-y-auto">
      {dailyWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-2 rounded">
          {license.remaining} free application{license.remaining === 1 ? "" : "s"} left.
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-blitz-700">{application.matchScore}%</span>
        <span className="text-sm text-slate-600">{application.matchRationale}</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Tailored CV</span>
          <textarea
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            rows={8}
            className="mt-1 w-full text-sm border rounded-lg p-2 font-mono"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500 uppercase">Cover letter</span>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={6}
            className="mt-1 w-full text-sm border rounded-lg p-2"
          />
        </label>
      </div>

      {answers.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase">Screening Q&A</h3>
          {answers.map((a, i) => (
            <div key={i} className="border rounded p-2 bg-white text-sm">
              <p className="font-medium text-slate-700 mb-1">{a.question}</p>
              <textarea
                value={a.answer}
                onChange={(e) => updateAnswer(i, "answer", e.target.value)}
                rows={2}
                className="w-full border rounded p-1 text-sm"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sticky bottom-0 bg-slate-50 pt-2 pb-1">
        <button
          type="button"
          onClick={handleApprove}
          disabled={filling}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg"
        >
          {filling ? "Filling form…" : "Approve & fill"}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex-1 border border-slate-300 py-2 rounded-lg text-sm hover:bg-white"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
