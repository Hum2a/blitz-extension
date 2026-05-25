import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sendExtensionMessage } from "../lib/extension-env.js";
import { useJobQueue } from "../hooks/useJobQueue.js";
import { Card, Btn, FadeUp } from "./motion.jsx";

function statusBadge(tab) {
  if (tab.capturable) {
    return { label: "Ready", className: "bg-emerald-100 text-emerald-800" };
  }
  const pt = tab.context?.pageType;
  if (pt === "job_list" || pt === "search") {
    return { label: "Select job", className: "bg-amber-100 text-amber-800" };
  }
  if (pt === "single_job") {
    return { label: "Incomplete", className: "bg-amber-100 text-amber-800" };
  }
  if (pt === "unknown") {
    return { label: "Reload tab", className: "bg-slate-100 text-slate-600" };
  }
  if (!tab.platform) {
    return { label: "Unsupported", className: "bg-slate-100 text-slate-500" };
  }
  return { label: "Not ready", className: "bg-slate-100 text-slate-600" };
}

function TabRow({ tab, selected, inQueue, onToggle, onActivate }) {
  const badge = statusBadge(tab);
  const subtitle =
    tab.jobData?.jobTitle ||
    tab.jobData?.company ||
    tab.context?.hint ||
    tab.url;

  return (
    <motion.li
      layout
      className={`flex items-start gap-3 p-3 rounded-lg border transition ${
        tab.capturable && selected
          ? "border-blitz-300 bg-blitz-50/50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 shrink-0"
        checked={selected}
        disabled={!tab.capturable || inQueue}
        onChange={() => onToggle(tab.tabId)}
        aria-label={`Select ${tab.title}`}
      />
      {tab.favIconUrl ? (
        <img src={tab.favIconUrl} alt="" className="w-5 h-5 mt-0.5 shrink-0 rounded" />
      ) : (
        <span className="w-5 h-5 mt-0.5 shrink-0 rounded bg-slate-200" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onActivate(tab.tabId)}
          className="text-left w-full group"
          title="Switch to this browser tab"
        >
          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blitz-700">
            {tab.title}
            {tab.active && (
              <span className="ml-1.5 text-[10px] font-semibold uppercase text-blitz-600">
                Active
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
        </button>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${badge.className}`}>
            {badge.label}
          </span>
          {tab.platform && (
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {tab.platform}
            </span>
          )}
          {inQueue && (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blitz-100 text-blitz-700">
              In queue
            </span>
          )}
          {tab.history && (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">
              {tab.history.status === "applied" ? "Applied" : "Generated"}
            </span>
          )}
        </div>
        {tab.scrapeError && !tab.capturable && (
          <p className="text-[11px] text-slate-500 mt-1">{tab.scrapeError}</p>
        )}
      </div>
    </motion.li>
  );
}

export default function WorkspaceTabJobs({ onViewQueue, compact = false }) {
  const { queue, refresh: refreshQueue } = useJobQueue();
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState(null);

  const queuedUrls = useMemo(() => new Set(queue.map((i) => i.url)), [queue]);

  const loadTabs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAddMessage(null);
    try {
      const result = await sendExtensionMessage({ type: "LIST_JOB_TABS" });
      const list = result?.tabs || [];
      setTabs(list);
      const capturableIds = list.filter((t) => t.capturable && !queuedUrls.has(t.url)).map((t) => t.tabId);
      setSelected(new Set(capturableIds));
    } catch (err) {
      setError(err.message || "Could not list browser tabs");
      setTabs([]);
    } finally {
      setLoading(false);
    }
  }, [queuedUrls]);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  const capturableTabs = tabs.filter((t) => t.capturable && !queuedUrls.has(t.url));
  const selectedCapturable = [...selected].filter((id) =>
    capturableTabs.some((t) => t.tabId === id)
  );

  const toggle = (tabId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  const selectAllReady = () => {
    setSelected(new Set(capturableTabs.map((t) => t.tabId)));
  };

  const clearSelection = () => setSelected(new Set());

  const addToQueue = async () => {
    if (selectedCapturable.length === 0) return;
    setAdding(true);
    setAddMessage(null);
    try {
      const result = await sendExtensionMessage({
        type: "ADD_TABS_TO_QUEUE",
        payload: { tabIds: selectedCapturable },
      });
      if (!result?.ok) {
        setAddMessage(result?.error || "Nothing added");
        return;
      }
      setAddMessage(`Added ${result.added} job${result.added === 1 ? "" : "s"} to queue`);
      refreshQueue();
      await loadTabs();
    } catch (err) {
      setAddMessage(err.message);
    } finally {
      setAdding(false);
    }
  };

  const activateTab = async (tabId) => {
    try {
      await chrome.tabs.update(tabId, { active: true });
      const tab = tabs.find((t) => t.tabId === tabId);
      if (tab?.windowId != null) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    } catch {
      /* extension page may lack tabs permission on localhost — ignore */
    }
  };

  if (tabs.length === 0 && !loading && !error) {
    return (
      <FadeUp>
        <Card className="bg-white border rounded-xl p-5 shadow-sm" delay={0}>
          <h2 className="text-sm font-semibold text-slate-800">Open job tabs</h2>
          <p className="text-xs text-slate-600 mt-1">
            Open Greenhouse, LinkedIn Jobs, Indeed, or Workday listings in your browser, then refresh
            to queue several at once.
          </p>
          <Btn onClick={loadTabs} className="mt-3 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded">
            Refresh tabs
          </Btn>
        </Card>
      </FadeUp>
    );
  }

  return (
    <FadeUp>
      <Card
        className={`bg-white border rounded-xl shadow-sm ${compact ? "p-4" : "p-5"}`}
        delay={0}
        hover={false}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Open job tabs</h2>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              See every supported job tab, which are ready to tailor, and add multiple to the bulk
              queue in one step.
            </p>
          </div>
          <Btn
            onClick={loadTabs}
            disabled={loading}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded shrink-0"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Btn>
        </div>

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-3">
            {error}
          </p>
        )}

        <ul className={`space-y-2 ${compact ? "max-h-64" : "max-h-80"} overflow-y-auto pr-1`}>
          <AnimatePresence initial={false}>
            {tabs.map((tab) => (
              <TabRow
                key={tab.tabId}
                tab={tab}
                selected={selected.has(tab.tabId)}
                inQueue={queuedUrls.has(tab.url)}
                onToggle={toggle}
                onActivate={activateTab}
              />
            ))}
          </AnimatePresence>
        </ul>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <Btn
            onClick={addToQueue}
            disabled={adding || selectedCapturable.length === 0}
            className="text-sm px-4 py-2 bg-blitz-600 hover:bg-blitz-700 disabled:bg-slate-300 text-white rounded-lg"
          >
            {adding
              ? "Adding…"
              : `Add ${selectedCapturable.length || ""} to queue`.trim()}
          </Btn>
          <button
            type="button"
            onClick={selectAllReady}
            className="text-xs text-blitz-700 hover:underline"
          >
            Select all ready ({capturableTabs.length})
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-slate-500 hover:underline"
          >
            Clear
          </button>
          {onViewQueue && (
            <button
              type="button"
              onClick={onViewQueue}
              className="text-xs text-slate-600 hover:underline ml-auto"
            >
              Go to queue →
            </button>
          )}
        </div>

        <AnimatePresence>
          {addMessage && (
            <motion.p
              className="text-xs text-slate-600 mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {addMessage}
            </motion.p>
          )}
        </AnimatePresence>
      </Card>
    </FadeUp>
  );
}
