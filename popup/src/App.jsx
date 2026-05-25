import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Dashboard from "./components/Dashboard.jsx";
import ReviewPanel from "./components/ReviewPanel.jsx";
import ApplicationTracker from "./components/ApplicationTracker.jsx";
import JobQueue from "./components/JobQueue.jsx";
import Settings from "./components/Settings.jsx";
import LicenseGate from "./components/LicenseGate.jsx";
import { useLicense } from "./hooks/useLicense.js";
import { getStorage, setStorage } from "./lib/storage.js";
import { scrapeActiveTab } from "./lib/scrape-tab.js";
import { logError, pingBackground } from "./lib/runtime-messages.js";
import DebugLog from "./components/DebugLog.jsx";
import { Page, NavTab } from "./components/motion.jsx";

const VIEWS = {
  dashboard: "dashboard",
  review: "review",
  queue: "queue",
  tracker: "tracker",
  settings: "settings",
};

export default function App() {
  const [view, setView] = useState(VIEWS.dashboard);
  const [pendingJob, setPendingJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState(null);
  const [detectErrorDetails, setDetectErrorDetails] = useState(null);
  const license = useLicense();

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
        await logError("scrapeActiveTab", new Error(job.error), { ping });
        setDetectError(job.error);
        setDetectErrorDetails({ ping, url: job.url });
      } else if (job) {
        setPendingJob(job);
        await setStorage("pending_job", job);
      }
    } catch (err) {
      await logError("refreshJobFromTab", err);
      setDetectError(err.message || "Could not read this tab");
      setDetectErrorDetails({ stack: err.stack });
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    getStorage("pending_application").then(setApplication);
    refreshJobFromTab();

    const listener = (message) => {
      if (message.type === "JOB_DETECTED") {
        setPendingJob(message.payload);
        setDetectError(null);
      }
      if (message.type === "APPLICATION_READY") {
        setApplication(message.payload);
        setGenerating(false);
        setView(VIEWS.review);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const showPaywall = !license.loading && !license.allowed && license.tier !== "pro";

  if (showPaywall && view !== VIEWS.settings) {
    return <LicenseGate onSettings={() => setView(VIEWS.settings)} />;
  }

  const navItems = [
    [VIEWS.dashboard, "Home"],
    [VIEWS.queue, "Queue"],
    [VIEWS.tracker, "Tracker"],
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
        onRefresh={refreshJobFromTab}
        license={license}
        onGenerate={async () => {
          setGenerating(true);
          try {
            const result = await chrome.runtime.sendMessage({
              type: "GENERATE_APPLICATION",
            });
            if (result?.error) throw new Error(result.error);
            setApplication(result);
            setView(VIEWS.review);
          } catch (err) {
            alert(err.message);
          } finally {
            setGenerating(false);
          }
        }}
        onReview={() => setView(VIEWS.review)}
      />
    ),
    [VIEWS.review]: (
      <ReviewPanel
        application={application}
        pendingJob={pendingJob}
        onBack={() => setView(VIEWS.dashboard)}
        onRegenerate={async () => {
          setGenerating(true);
          const result = await chrome.runtime.sendMessage({
            type: "GENERATE_APPLICATION",
          });
          if (result?.error) alert(result.error);
          else setApplication(result);
          setGenerating(false);
        }}
        onApplicationUpdate={setApplication}
        license={license}
      />
    ),
    [VIEWS.queue]: (
      <JobQueue
        onReviewItem={(app, job) => {
          setApplication(app);
          setPendingJob(job);
          setView(VIEWS.review);
        }}
      />
    ),
    [VIEWS.tracker]: <ApplicationTracker />,
    [VIEWS.settings]: <Settings onSaved={() => license.refresh()} />,
  };

  return (
    <motion.div
      className="flex flex-col min-h-[520px] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.header
        className="header-shine text-white px-4 py-3 flex items-center justify-between shadow-lg"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <motion.h1
          className="font-bold text-lg tracking-tight"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          Blitz
        </motion.h1>
        <nav className="flex gap-1 text-sm">
          {navItems.map(([id, label]) => (
            <NavTab key={id} active={view === id} onClick={() => setView(id)}>
              {label}
            </NavTab>
          ))}
        </nav>
      </motion.header>

      <main className="flex-1 p-4 relative">
        <AnimatePresence mode="wait">
          <Page key={view} className="w-full">
            {viewContent[view]}
          </Page>
        </AnimatePresence>
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
