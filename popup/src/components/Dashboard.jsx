import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApplications } from "../hooks/useApplications.js";
import MatchScoreRing from "./MatchScoreRing.jsx";
import ErrorPanel from "./ErrorPanel.jsx";
import { Stagger, FadeUp, Card, Btn, PulseDots } from "./motion.jsx";

function formatCompany(company) {
  if (company == null || company === "") return null;
  const s = String(company).trim();
  if (!s || s === "true" || s === "false") return null;
  return s;
}

function StatCard({ value, label, delay }) {
  return (
    <Card
      delay={delay}
      className="bg-white rounded-lg border p-3 text-center"
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
  onRefresh,
  onGenerate,
  onReview,
}) {
  const { applications } = useApplications();

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

  const company = formatCompany(pendingJob?.company);
  const hasJob = Boolean(pendingJob?.jobTitle || pendingJob?.jobDescription || company);
  const externalApply = pendingJob?.externalApply === true;
  const linkedinNoEasyApply =
    pendingJob?.platform === "linkedin" && pendingJob?.hasEasyApply === false;
  const canGenerate =
    hasJob && !generating && !detecting && license.allowed && !externalApply && !linkedinNoEasyApply;

  return (
    <Stagger className="space-y-4">
      <FadeUp>
        <Card className="bg-white rounded-lg border border-slate-200 p-4" delay={0}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Current page
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

      <AnimatePresence>
        {application?.matchScore != null && (
          <motion.div
            key="match"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <Card className="bg-white rounded-lg border p-4" delay={0.08}>
              <MatchScoreRing
                score={application.matchScore}
                rationale={application.matchRationale}
                size={80}
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <FadeUp delay={0.12}>
        <div className="flex flex-col gap-2">
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
                  className="w-full bg-blitz-600 hover:bg-blitz-700 text-white font-medium py-2.5 rounded-lg transition btn-shine"
                >
                  Review application
                </Btn>
              </motion.div>
            )}
          </AnimatePresence>
          <Btn
            onClick={onGenerate}
            disabled={!canGenerate}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition btn-shine relative"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={generating ? "gen" : "idle"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="inline-flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <motion.span
                      className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    />
                    Generating…
                  </>
                ) : (
                  "Generate tailored application"
                )}
              </motion.span>
            </AnimatePresence>
          </Btn>
        </div>
      </FadeUp>

      <section className="grid grid-cols-2 gap-3">
        <StatCard value={stats.thisWeek} label="This week" delay={0.14} />
        <StatCard value={`${stats.responseRate}%`} label="Response rate" delay={0.18} />
        <StatCard value={license.used ?? 0} label="Total used" delay={0.22} />
        <StatCard
          value={license.remaining === Infinity ? "∞" : license.remaining}
          label="Remaining (free)"
          delay={0.26}
        />
      </section>
    </Stagger>
  );
}
