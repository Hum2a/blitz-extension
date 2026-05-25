import { useMemo, useEffect, useState } from "react";
import CostEstimate from "./CostEstimate.jsx";
import GenerationProgress from "./GenerationProgress.jsx";
import { progressFromStage } from "../lib/generation-progress.js";
import { AnimatePresence, motion } from "framer-motion";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import ErrorPanel from "./ErrorPanel.jsx";
import { Stagger, FadeUp, Card, Btn, PulseDots } from "./motion.jsx";
import RecentApplications from "./RecentApplications.jsx";
import WorkspaceTabJobs from "./WorkspaceTabJobs.jsx";
import { scrollPanelClass } from "../lib/layout.js";

function formatCompany(company) {
  if (company == null || company === "") return null;
  const s = String(company).trim();
  if (!s || s === "true" || s === "false") return null;
  return s;
}

function StatCard({ value, label, delay, large }) {
  return (
    <Card
      delay={delay}
      className={`bg-white border p-3 text-center ${large ? "rounded-xl shadow-sm p-4" : "rounded-lg"}`}
      hover
    >
      <motion.p
        className="text-2xl font-bold text-blitz-700"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22, delay: delay + 0.1 }}
      >
        {value}
      </motion.p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}

export default function Dashboard({
  pendingJob,
  application,
  generating,
  license,
  detecting,
  detectError,
  detectErrorDetails,
  generateError,
  onDismissGenerateError,
  lastGenerationCost,
  generationProgress,
  onRefresh,
  onGenerate,
  onReview,
  onViewHistory,
  onViewQueue,
  fullPage = false,
}) {
  const { applications } = useApplications();
  const [costEstimate, setCostEstimate] = useState(null);
  const [costLoading, setCostLoading] = useState(false);

  const company = formatCompany(pendingJob?.company);
  const hasJob = Boolean(pendingJob?.jobTitle || pendingJob?.jobDescription || company);

  useEffect(() => {
    if (!hasJob) {
      setCostEstimate(null);
      return;
    }
    let cancelled = false;
    setCostLoading(true);
    chrome.runtime
      .sendMessage({ type: "ESTIMATE_GENERATION_COST" })
      .then((result) => {
        if (cancelled) return;
        if (chrome.runtime.lastError) {
          setCostEstimate({ error: chrome.runtime.lastError.message });
          return;
        }
        setCostEstimate(result?.error ? { error: result.error } : result);
      })
      .catch((err) => {
        if (!cancelled) setCostEstimate({ error: err.message });
      })
      .finally(() => {
        if (!cancelled) setCostLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasJob, pendingJob?.url, pendingJob?.jobTitle, pendingJob?.jobDescription]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = applications.filter(
      (a) => new Date(a.appliedAt).getTime() >= weekAgo
    );
    const applied = applications.filter((a) => a.status === "applied").length;
    const positive = applications.filter((a) =>
      ["interview", "offer"].includes(a.status)
    ).length;
    const responseRate =
      applied > 0 ? Math.round((positive / applications.length) * 100) : 0;
    return { thisWeek: thisWeek.length, responseRate };
  }, [applications]);

  const externalApply = pendingJob?.externalApply === true;
  const linkedinNoEasyApply =
    pendingJob?.platform === "linkedin" && pendingJob?.hasEasyApply === false;
  const canGenerate =
    hasJob && !generating && !detecting && license.allowed && !externalApply && !linkedinNoEasyApply;

  const jobCard = (
    <FadeUp>
      <Card
        className={`bg-white rounded-xl border border-slate-200 p-5 ${fullPage ? "shadow-sm" : "rounded-lg p-4"}`}
        delay={0}
      >
          <div className="flex items-center justify-between mb-2">
            <h2
              className={`font-semibold text-slate-500 uppercase tracking-wide ${
                fullPage ? "text-xs" : "text-sm"
              }`}
            >
              {fullPage ? "Active job tab" : "Current page"}
            </h2>
            <motion.button
              type="button"
              onClick={onRefresh}
              disabled={detecting}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-xs text-blitz-600 underline disabled:opacity-50"
            >
              {detecting ? "Reading…" : "Refresh"}
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {detectError && (
              <motion.div
                key="error"
                className="mb-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <ErrorPanel
                  title="Could not read this page"
                  error={detectError}
                  details={detectErrorDetails}
                />
              </motion.div>
            )}

            {detecting && !pendingJob && (
              <motion.div key="loading" exit={{ opacity: 0 }}>
                <PulseDots label="Reading job from this tab…" />
                <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-blitz-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}

            {hasJob && !detecting ? (
              <motion.div
                key="job"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              >
                <motion.p
                  className="font-medium text-slate-900"
                  layout
                >
                  {pendingJob.jobTitle || "Job listing"}
                </motion.p>
                <AnimatePresence>
                  {company && (
                    <motion.p
                      className="text-sm text-slate-600 mt-0.5"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {company}
                    </motion.p>
                  )}
                </AnimatePresence>
                <div className="flex flex-wrap gap-2 mt-2">
                  <motion.span
                    className="text-xs bg-blitz-100 text-blitz-700 px-2 py-0.5 rounded capitalize"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                  >
                    {pendingJob.platform}
                  </motion.span>
                  {pendingJob.applyType && (
                    <motion.span
                      className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: "spring" }}
                    >
                      {pendingJob.applyType === "external" ? "External apply" : "Indeed apply"}
                    </motion.span>
                  )}
                </div>
                <AnimatePresence>
                  {externalApply && (
                    <motion.p
                      className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      Applies on company site — Blitz cannot auto-fill this role.
                    </motion.p>
                  )}
                  {linkedinNoEasyApply && (
                    <motion.p
                      className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      No Easy Apply on this listing.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : !detecting && !detectError ? (
              <motion.p
                key="empty"
                className="text-sm text-slate-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Open a job on Greenhouse, LinkedIn, Indeed, or Workday, then click Refresh.
              </motion.p>
            ) : null}
          </AnimatePresence>
        </Card>
    </FadeUp>
  );

  const matchCard = (
    <AnimatePresence>
      {application?.matchScore != null && (
        <motion.div
          key="match"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <Card className="bg-white rounded-xl border p-4 shadow-sm" delay={0.08}>
            <MatchScoreRing
              score={application.matchScore}
              rationale={application.matchRationale}
              size={fullPage ? 96 : 80}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const actionsBlock = (
    <>
      {generateError && (
        <ErrorPanel
          title="Generation failed"
          error={generateError}
          onDismiss={onDismissGenerateError}
        />
      )}
      <FadeUp delay={0.12}>
        <Card className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3" delay={0.1} hover={false}>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Generate
          </h3>
          <CostEstimate
            estimate={costEstimate}
            actualCost={lastGenerationCost}
            loading={costLoading && hasJob}
          />
          <AnimatePresence>
            {application && (
              <motion.div
                key="review-btn"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <Btn
                  onClick={onReview}
                  className="w-full bg-blitz-600 hover:bg-blitz-700 text-white font-medium py-3 rounded-lg transition btn-shine"
                >
                  Review application
                </Btn>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="relative w-full">
            <Btn
              onClick={onGenerate}
              disabled={!canGenerate || generating}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition btn-shine relative overflow-hidden"
            >
              {generating && (
                <motion.div
                  className="absolute inset-0 bg-blitz-600/30"
                  initial={{ width: "0%" }}
                  animate={{ width: `${generationProgress?.percent ?? 5}%` }}
                  transition={{ duration: 0.3 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center justify-center gap-2">
                {generating ? (
                  <>
                    <motion.span
                      className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    />
                    Generating…{" "}
                    {generationProgress?.percent != null ? `${generationProgress.percent}%` : ""}
                  </>
                ) : (
                  "Generate tailored application"
                )}
              </span>
            </Btn>
          </div>
          <AnimatePresence>
            {generating && (
              <motion.div
                key="gen-progress"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <GenerationProgress
                  progress={generationProgress || progressFromStage("validate", "Connecting…")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </FadeUp>
    </>
  );

  const statsSection = (
    <section className={`grid gap-3 ${fullPage ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
      <StatCard value={stats.thisWeek} label="This week" delay={0.14} large={fullPage} />
      <StatCard value={`${stats.responseRate}%`} label="Response rate" delay={0.18} large={fullPage} />
      <StatCard value={license.used ?? 0} label="Total used" delay={0.22} large={fullPage} />
      <StatCard
        value={license.remaining === Infinity ? "∞" : license.remaining}
        label="Remaining (free)"
        delay={0.26}
        large={fullPage}
      />
    </section>
  );

  const recentSection =
    onViewHistory && (
      <RecentApplications onViewHistory={onViewHistory} limit={fullPage ? 8 : 4} />
    );

  if (fullPage) {
    return (
      <div className="space-y-8 -mt-2">
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            {jobCard}
            {matchCard}
            {actionsBlock}
          </div>
          <div className="lg:col-span-7 space-y-6">
            {statsSection}
            {recentSection}
          </div>
        </div>
        <WorkspaceTabJobs onViewQueue={onViewQueue} />
      </div>
    );
  }

  return (
    <Stagger className={`space-y-4 ${scrollPanelClass(false)}`}>
      {jobCard}
      {matchCard}
      {actionsBlock}
      {statsSection}
      {recentSection}
    </Stagger>
  );
}
