import { motion } from "framer-motion";
import { AnimatePresence } from "../motion.jsx";
import { SITE_VIEWS, SITE_NAV_ORDER } from "../../lib/site-views.js";
import { isExtensionPage } from "../../lib/extension-env.js";
import SitePageHeader from "./SitePageHeader.jsx";
import DebugLog from "../DebugLog.jsx";

function NavIcon({ name }) {
  const paths = {
    workspace: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z"
      />
    ),
    queue: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M4 6h16M4 12h16M4 18h10"
      />
    ),
    history: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    usage: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    settings: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10.3 4.2a1.5 1.5 0 012.4 0l.4.6a1.5 1.5 0 001.8.6l.7-.2a1.5 1.5 0 011.7 1.7l-.2.7a1.5 1.5 0 00.6 1.8l.6.4a1.5 1.5 0 010 2.4l-.6.4a1.5 1.5 0 00-.6 1.8l.2.7a1.5 1.5 0 01-1.7 1.7l-.7-.2a1.5 1.5 0 00-1.8.6l-.4.6a1.5 1.5 0 01-2.4 0l-.4-.6a1.5 1.5 0 00-1.8-.6l-.7.2a1.5 1.5 0 01-1.7-1.7l.2-.7a1.5 1.5 0 00-.6-1.8l-.6-.4a1.5 1.5 0 010-2.4l.6-.4a1.5 1.5 0 00.6-1.8l-.2-.7a1.5 1.5 0 011.7-1.7l.7.2a1.5 1.5 0 001.8-.6l.4-.6z"
      />
    ),
  };
  const key =
    name === "dashboard"
      ? "workspace"
      : name === "queue"
        ? "queue"
        : name === "history"
          ? "history"
          : name === "usage"
            ? "usage"
            : "settings";
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      {paths[key]}
    </svg>
  );
}

function LicenseBadge({ license }) {
  if (license.loading) {
    return (
      <span className="text-xs text-slate-400 px-3 py-1.5 rounded-full border border-slate-200">
        Loading…
      </span>
    );
  }
  const isPro = license.tier === "pro";
  const remaining = license.remaining;
  const label = isPro
    ? "Pro"
    : remaining === Infinity
      ? "Pro"
      : `${remaining} left`;
  return (
    <span
      className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
        isPro
          ? "bg-blitz-50 text-blitz-800 border-blitz-200"
          : "bg-slate-50 text-slate-700 border-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

function SidebarLink({ viewId, active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`site-nav-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? "site-nav-link-active" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      }`}
    >
      <NavIcon name={viewId} />
      {label}
    </button>
  );
}

export default function SiteShell({
  view,
  onNavigate,
  license,
  bridgeMode = false,
  reviewBack,
  children,
}) {
  const page = SITE_VIEWS[view] || SITE_VIEWS.dashboard;
  const inExtension = isExtensionPage();

  return (
    <div className="blitz-site min-h-screen flex flex-col bg-slate-50">
      <header className="blitz-site-header site-topbar sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <span className="site-logo-mark flex h-9 w-9 items-center justify-center rounded-xl bg-blitz-600 text-white font-bold text-sm shadow-sm group-hover:bg-blitz-700 transition-colors">
              B
            </span>
            <span className="hidden sm:block text-left">
              <span className="block font-bold text-slate-900 leading-none tracking-tight">Blitz</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Job application workspace</span>
            </span>
          </button>

          <nav className="flex lg:hidden items-center gap-1 overflow-x-auto no-scrollbar">
            {SITE_NAV_ORDER.map((id) => {
              if (id === "dashboard" && view === "review") return null;
              const meta = SITE_VIEWS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${
                    view === id || (view === "review" && id === "dashboard")
                      ? "bg-blitz-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <LicenseBadge license={license} />
            {inExtension && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Extension live
              </span>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {bridgeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-amber-200/80 bg-amber-50/90"
          >
            <p className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2 text-xs text-amber-900 text-center sm:text-left">
              Connected to your Chrome extension · data stays on your device · keep Blitz installed
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex max-w-[1400px] mx-auto w-full">
        <aside className="blitz-site-sidebar hidden lg:flex w-60 shrink-0 flex-col border-r px-3 py-6">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Menu
          </p>
          <nav className="flex flex-col gap-0.5">
            {SITE_NAV_ORDER.map((id) => (
              <SidebarLink
                key={id}
                viewId={id}
                active={view === id || (view === "review" && id === "dashboard")}
                label={SITE_VIEWS[id].label}
                onClick={() => onNavigate(id)}
              />
            ))}
          </nav>
          {view === "review" && (
            <button
              type="button"
              onClick={reviewBack}
              className="mt-6 mx-3 text-sm text-blitz-600 hover:text-blitz-700 font-medium text-left"
            >
              ← Back to workspace
            </button>
          )}
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {view !== "review" && (
            <SitePageHeader title={page.title} subtitle={page.subtitle} />
          )}
          {view === "review" && (
            <SitePageHeader
              title={page.title}
              subtitle={page.subtitle}
              actions={
                <button
                  type="button"
                  onClick={reviewBack}
                  className="text-sm font-medium text-blitz-600 hover:text-blitz-700 px-4 py-2 rounded-lg border border-blitz-200 bg-white hover:bg-blitz-50 transition-colors lg:hidden"
                >
                  ← Workspace
                </button>
              }
            />
          )}
          <div className="site-main-content">{children}</div>
        </main>
      </div>

      <footer className="blitz-site-footer mt-auto border-t">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="font-bold text-slate-900">Blitz</p>
            <p className="mt-2 text-sm text-slate-600 max-w-md leading-relaxed">
              Tailor CVs and cover letters to each job listing. Your data stays local — bring your
              own AI key.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Product
            </p>
            <ul className="text-sm text-slate-600 space-y-1.5">
              <li>Workspace</li>
              <li>Bulk queue</li>
              <li>Application history</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Status
            </p>
            <p className="text-sm text-slate-600">
              {inExtension ? "Extension dashboard" : bridgeMode ? "Web bridge (dev)" : "Dashboard"}
            </p>
            {!license.loading && license.tier === "free" && (
              <p className="text-xs text-slate-500 mt-2">
                {license.remaining} of 15 free applications remaining
              </p>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Blitz</span>
          <DebugLog />
        </div>
      </footer>
    </div>
  );
}
