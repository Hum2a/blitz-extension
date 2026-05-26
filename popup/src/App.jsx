import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "./components/Dashboard.jsx";
import ReviewPanel from "./components/ReviewPanel.jsx";
import ApplicationHistory from "./components/ApplicationHistory.jsx";
import ApiUsageHistory from "./components/ApiUsageHistory.jsx";
import JobQueue from "./components/JobQueue.jsx";
import Settings from "./components/Settings.jsx";
import LicenseGate from "./components/LicenseGate.jsx";
import { useLicense } from "./hooks/useLicense.js";
import { getStorage, setStorage } from "./lib/storage.js";
import { scrapeActiveTab } from "./lib/scrape-tab.js";
import { applicationMatchesJob } from "./lib/job-listing.js";
import { logError, pingBackground } from "./lib/runtime-messages.js";
import DebugLog from "./components/DebugLog.jsx";
import { Page, NavTab } from "./components/motion.jsx";
import { progressFromStage } from "./lib/generation-progress.js";
import { GENERATION_STATUS_KEY } from "./lib/generation-status.js";
import { openDashboard } from "./lib/open-dashboard.js";
import { isExtensionPage, isLocalWeb } from "./lib/extension-env.js";
import { getUiState, patchUiState } from "./lib/ui-state.js";
import { fetchAppConfig, compareVersions } from "./lib/app-config.js";
import { recordClientEvent } from "./lib/telemetry.js";
import SiteShell from "./components/site/SiteShell.jsx";

const VIEWS = {
  dashboard: "dashboard",
  review: "review",
  queue: "queue",
  history: "history",
  usage: "usage",
  settings: "settings",
};

export default function App({ fullPage = false, bridgeMode = false }) {
  const [view, setView] = useState(VIEWS.dashboard);
  const popupViewHydrated = useRef(false);
  const [pendingJob, setPendingJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState(null);
  const [detectErrorDetails, setDetectErrorDetails] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [lastGenerationCost, setLastGenerationCost] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(null);
  const license = useLicense();
  const [appBanner, setAppBanner] = useState(null);

  const navigate = useCallback(
    (nextView) => {
      setView(nextView);
      if (!fullPage && popupViewHydrated.current && VIEWS[nextView]) {
        patchUiState({ popupView: nextView }).catch(() => {});
      }
    },
    [fullPage]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const config = await fetchAppConfig();
      if (cancelled) return;
      const manifest = chrome.runtime.getManifest?.();
      const currentVersion = manifest?.version || "0";
      const needsUpdate =
        config.min_extension_version &&
        compareVersions(currentVersion, config.min_extension_version) < 0;
      if (config.maintenance_mode || config.banner_message || needsUpdate) {
        const parts = [];
        if (config.maintenance_mode) parts.push("Blitz is in maintenance mode.");
        if (config.banner_message) parts.push(config.banner_message);
        if (needsUpdate) {
          parts.push(`Please update Blitz to ${config.min_extension_version} or newer.`);
        }
        setAppBanner(parts.join(" "));
      }
      recordClientEvent("extension_opened", {
        version: currentVersion,
        view: fullPage ? "dashboard" : "popup",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [fullPage]);

  useEffect(() => {
    if (fullPage) return;
    let cancelled = false;
    (async () => {
      const ui = await getUiState();
      if (cancelled) return;
      if (ui.popupView && VIEWS[ui.popupView]) {
        setView(ui.popupView);
      }
      popupViewHydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [fullPage]);

  const reconcileApplication = async (job) => {
    const stored = await getStorage("pending_application");
    if (!stored) {
      setApplication(null);
      return;
    }
    if (!job || !applicationMatchesJob(stored, job)) {
      await setStorage("pending_application", null);
      setApplication(null);
      return;
    }
    setApplication(stored);
  };

  const loadFromHistory = async (record) => {
    try {
      const result = await chrome.runtime.sendMessage({
        type: "LOAD_HISTORY_APPLICATION",
        payload: { record },
      });
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      if (result?.error) throw new Error(result.error);
      setPendingJob(result.job);
      setApplication(result.application);
      await setStorage("pending_job", result.job);
      await setStorage("pending_application", result.application);
      navigate(VIEWS.review);
    } catch (err) {
      setGenerateError(err.message || "Could not load application");
      navigate(VIEWS.dashboard);
    }
  };

  const applyPendingJob = async (job, { persist = true } = {}) => {
    setPendingJob(job ?? null);
    if (persist && job) await setStorage("pending_job", job);
    await reconcileApplication(job ?? null);
  };

  const refreshJobFromTab = async () => {
    setDetecting(true);
    setDetectError(null);
    setDetectErrorDetails(null);
    try {
      let ping = null;
      try {
        ping = await pingBackground();
      } catch (pingErr) {
        await logError("ping", pingErr);
        setDetectError(pingErr.message);
        setDetectErrorDetails({ hint: "Reload Blitz at chrome://extensions" });
        return;
      }

      const job = await scrapeActiveTab();
      if (job?.error) {
        const stored = await getStorage("pending_job");
        const hasStoredJob = Boolean(stored?.jobTitle || stored?.jobDescription);
        const workspaceOnly =
          job.code === "no_job_tab" ||
          job.code === "extension_ui" ||
          (job.error && /dashboard\.html|chrome:\/\/extensions/i.test(job.error));

        if (hasStoredJob) {
          await applyPendingJob(stored, { persist: false });
          if (workspaceOnly) {
            setDetectError(null);
            setDetectErrorDetails(null);
          } else {
            setDetectError(
              "Could not refresh from the job tab — showing the last job Blitz detected."
            );
            setDetectErrorDetails({ ping, url: job.url, tabId: job.tabId });
          }
        } else {
          await logError("scrapeActiveTab", new Error(job.error), { ping, url: job.url });
          setDetectError(job.error);
          setDetectErrorDetails({ ping, url: job.url, tabId: job.tabId });
        }
      } else if (job) {
        await applyPendingJob(job);
        setDetectError(null);
        setDetectErrorDetails(null);
      }
    } catch (err) {
      await logError("refreshJobFromTab", err);
      setDetectError(err.message || "Could not read this tab");
      setDetectErrorDetails({ stack: err.stack });
    } finally {
      setDetecting(false);
    }
  };

  const applyGenerationStatus = (status) => {
    if (!status) return;
    if (status.active) {
      setGenerating(true);
      if (status.progress) setGenerationProgress(status.progress);
      setGenerateError(null);
      return;
    }
    if (status.error) {
      setGenerating(false);
      setGenerationProgress(null);
      setGenerateError(status.error);
      return;
    }
    if (!status.active && !status.error) {
      setGenerating(false);
    }
  };

  const syncFromStorage = async (changes) => {
    if (changes?.pending_job) {
      const job = changes.pending_job.newValue ?? null;
      setPendingJob(job);
      await reconcileApplication(job);
    } else if (!changes || changes.pending_job === undefined) {
      const job = await getStorage("pending_job");
      setPendingJob(job);
      await reconcileApplication(job);
    }
    if (changes?.[GENERATION_STATUS_KEY]) {
      applyGenerationStatus(changes[GENERATION_STATUS_KEY].newValue);
    } else if (!changes || changes[GENERATION_STATUS_KEY] === undefined) {
      const genStatus = await getStorage(GENERATION_STATUS_KEY);
      applyGenerationStatus(genStatus);
    }
    if (changes?.pending_application) {
      const app = changes.pending_application.newValue ?? null;
      const job =
        changes.pending_job?.newValue ?? (await getStorage("pending_job"));
      if (app && job && !applicationMatchesJob(app, job)) {
        setApplication(null);
      } else {
        setApplication(app);
      }
    } else if (!changes || changes.pending_application === undefined) {
      const [app, job] = await Promise.all([
        getStorage("pending_application"),
        getStorage("pending_job"),
      ]);
      if (app && job && !applicationMatchesJob(app, job)) {
        setApplication(null);
      } else {
        setApplication(app);
      }
    }
  };

  useEffect(() => {
    if (
      view === VIEWS.review &&
      application &&
      pendingJob &&
      !applicationMatchesJob(application, pendingJob)
    ) {
      navigate(VIEWS.dashboard);
    }
  }, [view, application, pendingJob, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [job, app, genStatus] = await Promise.all([
        getStorage("pending_job"),
        getStorage("pending_application"),
        getStorage(GENERATION_STATUS_KEY),
      ]);
      if (cancelled) return;
      if (job?.jobTitle || job?.jobDescription) {
        setPendingJob(job);
        if (app && applicationMatchesJob(app, job)) setApplication(app);
      }
      applyGenerationStatus(genStatus);
      refreshJobFromTab();
    })();

    const onStorage = (ch, area) => {
      if (area === "local") syncFromStorage(ch);
    };
    chrome.storage.onChanged.addListener(onStorage);

    const listener = (message) => {
      if (message.type === "JOB_DETECTED") {
        applyPendingJob(message.payload);
        setDetectError(null);
      }
      if (message.type === "APPLICATION_SUBMITTED") {
        setStorage("pending_application", null);
        setApplication(null);
      }
      if (message.type === "GENERATION_PROGRESS") {
        setGenerationProgress(message.payload);
      }
      if (message.type === "APPLICATION_READY") {
        setApplication(message.payload);
        setGenerating(false);
        setGenerationProgress(null);
        setGenerateError(null);
        if (message.payload?.cost) setLastGenerationCost(message.payload.cost);
        navigate(VIEWS.review);
      }
      if (message.type === "GENERATION_FAILED") {
        setGenerating(false);
        setGenerationProgress(null);
        setGenerateError(message.payload?.error || "Generation failed");
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(listener);
      chrome.storage.onChanged.removeListener(onStorage);
    };
  }, []);

  const showPaywall = !license.loading && !license.allowed && license.tier !== "pro";

  if (showPaywall && view !== VIEWS.settings) {
    return <LicenseGate onSettings={() => navigate(VIEWS.settings)} />;
  }

  const navItems = [
    [VIEWS.dashboard, "Home"],
    [VIEWS.queue, "Queue"],
    [VIEWS.history, "History"],
    [VIEWS.usage, "API usage"],
    [VIEWS.settings, "Settings"],
  ];

  const viewContent = {
    [VIEWS.dashboard]: (
      <Dashboard
        pendingJob={pendingJob}
        application={application}
        generating={generating}
        detecting={detecting}
        detectError={detectError}
            detectErrorDetails={detectErrorDetails}
            generateError={generateError}
            onDismissGenerateError={() => setGenerateError(null)}
            lastGenerationCost={lastGenerationCost}
            generationProgress={generationProgress}
            onRefresh={refreshJobFromTab}
            license={license}
            onGenerate={async () => {
              setGenerating(true);
              setGenerateError(null);
              setGenerationProgress(progressFromStage("validate", "Starting…"));
              try {
                const result = await chrome.runtime.sendMessage({
                  type: "GENERATE_APPLICATION",
                  payload: { jobData: pendingJob },
                });
                if (chrome.runtime.lastError) {
                  throw new Error(chrome.runtime.lastError.message);
                }
                if (result?.error) {
                  throw new Error(
                    typeof result.error === "string" ? result.error : JSON.stringify(result.error)
                  );
                }
                if (result?.started) {
                  return;
                }
                if (result?.tailoredCV || result?.jobData) {
                  setLastGenerationCost(result.cost ?? null);
                  setApplication(result);
                  navigate(VIEWS.review);
                  setGenerating(false);
                  setGenerationProgress(null);
                }
              } catch (err) {
                setGenerateError(err.message || "Generation failed");
                setGenerating(false);
                setGenerationProgress(null);
              }
            }}
        onReview={() => navigate(VIEWS.review)}
        onViewHistory={() => navigate(VIEWS.history)}
        onViewQueue={() => navigate(VIEWS.queue)}
        onLoadFromHistory={loadFromHistory}
        fullPage={fullPage}
      />
    ),
    [VIEWS.review]: (
      <ReviewPanel
        application={application}
        pendingJob={pendingJob}
        fullPage={fullPage}
        onBack={() => navigate(VIEWS.dashboard)}
        generating={generating}
        lastGenerationCost={lastGenerationCost}
        generationProgress={generationProgress}
        onRegenerate={async () => {
          setGenerating(true);
          setGenerateError(null);
          setGenerationProgress(progressFromStage("validate", "Regenerating…"));
          try {
            const result = await chrome.runtime.sendMessage({
              type: "GENERATE_APPLICATION",
              payload: { jobData: pendingJob },
            });
            if (chrome.runtime.lastError) throw new Error(chrome.runtime.lastError.message);
            if (result?.error) throw new Error(result.error);
            if (result?.started) return;
            if (result?.tailoredCV || result?.jobData) {
              setLastGenerationCost(result.cost ?? null);
              setApplication(result);
              setGenerating(false);
              setGenerationProgress(null);
            }
          } catch (err) {
            setGenerateError(err.message);
            setGenerating(false);
            setGenerationProgress(null);
          }
        }}
        onApplicationUpdate={setApplication}
        license={license}
      />
    ),
    [VIEWS.queue]: (
      <JobQueue
        fullPage={fullPage}
        onReviewItem={(app, job) => {
          setApplication(app);
          setPendingJob(job);
          navigate(VIEWS.review);
        }}
      />
    ),
    [VIEWS.history]: (
      <ApplicationHistory fullPage={fullPage} onOpenReview={loadFromHistory} />
    ),
    [VIEWS.usage]: <ApiUsageHistory fullPage={fullPage} />,
    [VIEWS.settings]: (
      <Settings fullPage={fullPage} onSaved={() => license.refresh()} />
    ),
  };

  const mainContent = (
    <AnimatePresence mode="wait">
      <Page key={view} className="w-full">
        {viewContent[view]}
      </Page>
    </AnimatePresence>
  );

  if (fullPage) {
    return (
      <SiteShell
        view={view}
        onNavigate={navigate}
        license={license}
        bridgeMode={bridgeMode || isLocalWeb()}
        reviewBack={() => navigate(VIEWS.dashboard)}
      >
        {mainContent}
      </SiteShell>
    );
  }

  return (
    <motion.div
      className="blitz-popup flex flex-col overflow-hidden bg-slate-50 min-h-[520px] w-[420px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.header
        className="header-shine text-white px-4 py-3 flex items-center justify-between shadow-lg gap-2"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <motion.h1
          className="font-bold text-lg tracking-tight shrink-0"
          animate={fullPage ? undefined : { scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          Blitz
        </motion.h1>
        <nav className="flex gap-1 text-sm items-center flex-wrap justify-end">
          {navItems.map(([id, label]) => (
            <NavTab key={id} active={view === id} onClick={() => navigate(id)}>
              {label}
            </NavTab>
          ))}
          {isExtensionPage() && (
            <button
              type="button"
              onClick={openDashboard}
              className="text-xs px-2 py-1 rounded bg-white/15 hover:bg-white/25 ml-1"
              title="Open full dashboard in a tab"
            >
              Dashboard
            </button>
          )}
        </nav>
      </motion.header>

      <main className="flex-1 p-4 relative">
        {appBanner && (
          <div className="app-banner" role="status">
            {appBanner}
          </div>
        )}
        {mainContent}
      </main>

      <motion.footer
        className="px-4 py-2 border-t bg-white space-y-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <AnimatePresence>
          {!license.loading && license.tier === "free" && (
            <motion.p
              key="footer-tier"
              className="text-xs text-slate-500 text-center"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {license.remaining} of 15 free applications remaining
            </motion.p>
          )}
        </AnimatePresence>
        <DebugLog />
      </motion.footer>
    </motion.div>
  );
}
