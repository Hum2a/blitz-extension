import { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard.jsx";
import ReviewPanel from "./components/ReviewPanel.jsx";
import ApplicationTracker from "./components/ApplicationTracker.jsx";
import Settings from "./components/Settings.jsx";
import LicenseGate from "./components/LicenseGate.jsx";
import { useLicense } from "./hooks/useLicense.js";
import { getStorage } from "./lib/storage.js";

const VIEWS = {
  dashboard: "dashboard",
  review: "review",
  tracker: "tracker",
  settings: "settings",
};

export default function App() {
  const [view, setView] = useState(VIEWS.dashboard);
  const [pendingJob, setPendingJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [generating, setGenerating] = useState(false);
  const license = useLicense();

  useEffect(() => {
    getStorage("pending_job").then(setPendingJob);
    getStorage("pending_application").then(setApplication);

    const listener = (message) => {
      if (message.type === "JOB_DETECTED") {
        setPendingJob(message.payload);
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

  return (
    <div className="flex flex-col min-h-[520px]">
      <header className="bg-blitz-700 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg tracking-tight">Blitz</h1>
        <nav className="flex gap-1 text-sm">
          {[
            [VIEWS.dashboard, "Home"],
            [VIEWS.tracker, "Tracker"],
            [VIEWS.settings, "Settings"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`px-2 py-1 rounded ${
                view === id ? "bg-white/20" : "hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4">
        {view === VIEWS.dashboard && (
          <Dashboard
            pendingJob={pendingJob}
            application={application}
            generating={generating}
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
        )}
        {view === VIEWS.review && (
          <ReviewPanel
            application={application}
            pendingJob={pendingJob}
            onBack={() => setView(VIEWS.dashboard)}
            onRegenerate={async () => {
              setGenerating(true);
              const result = await chrome.runtime.sendMessage({
                type: "GENERATE_APPLICATION",
              });
              if (result?.error) {
                alert(result.error);
              } else {
                setApplication(result);
              }
              setGenerating(false);
            }}
            onApplicationUpdate={setApplication}
            license={license}
          />
        )}
        {view === VIEWS.tracker && <ApplicationTracker />}
        {view === VIEWS.settings && <Settings onSaved={() => license.refresh()} />}
      </main>

      {!license.loading && license.tier === "free" && (
        <footer className="px-4 py-2 text-xs text-slate-500 border-t bg-white">
          {license.remaining} of 15 free applications remaining
        </footer>
      )}
    </div>
  );
}
