import { useState } from "react";
import App from "../App.jsx";
import {
  getExtensionId,
  setExtensionId,
  sendExtensionMessage,
} from "../lib/extension-env.js";

function Feature({ title, body }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blitz-100 text-blitz-700 text-xs font-bold">
        ✓
      </span>
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export default function WebConnect() {
  const [id, setId] = useState(getExtensionId());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const connect = async () => {
    setChecking(true);
    setError(null);
    setExtensionId(id);
    try {
      const ping = await sendExtensionMessage({ type: "PING" });
      if (!ping?.ok) throw new Error("Extension did not respond");
      setConnected(true);
      document.body.classList.remove("blitz-site-connect");
      document.body.classList.add("blitz-site");
    } catch (err) {
      setConnected(false);
      setError(err.message || "Could not connect to Blitz");
    } finally {
      setChecking(false);
    }
  };

  if (connected) {
    return <App fullPage bridgeMode />;
  }

  return (
    <div className="blitz-site-connect min-h-screen flex flex-col bg-slate-50">
      <header className="blitz-site-header border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-2.5">
          <span className="site-logo-mark flex h-9 w-9 items-center justify-center rounded-xl bg-blitz-600 text-white font-bold text-sm">
            B
          </span>
          <span className="font-bold text-slate-900 tracking-tight">Blitz</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        <section className="flex-1 px-6 py-12 lg:py-20 lg:px-12 lg:max-w-xl flex flex-col justify-center">
          <p className="text-sm font-semibold text-blitz-600 uppercase tracking-wide mb-3">
            Local workspace
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Your job search command center
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Run Blitz in a full browser tab — same data as the extension, with room to review CVs,
            manage your queue, and track every application.
          </p>
          <div className="mt-10 space-y-5">
            <Feature
              title="Full workspace layout"
              body="Multi-column views, history search, and settings designed for desktop — not a stretched popup."
            />
            <Feature
              title="Stays on your machine"
              body="Connects securely to the Chrome extension. CV and API keys never leave your browser."
            />
            <Feature
              title="Always in sync"
              body="Changes here update the extension popup instantly via shared storage."
            />
          </div>
        </section>

        <section className="blitz-connect-panel flex-1 flex items-center justify-center p-6 lg:p-12 border-t lg:border-t-0 lg:border-l border-slate-200">
          <div className="w-full max-w-md space-y-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Connect extension</h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                One-time setup. Paste your Blitz extension ID from Chrome.
              </p>
            </div>
            <ol className="text-sm text-slate-600 space-y-2 list-none">
              <li className="flex gap-2">
                <span className="text-blitz-600 font-semibold">1.</span>
                Open{" "}
                <a href="chrome://extensions" className="text-blitz-600 underline font-medium">
                  chrome://extensions
                </a>
              </li>
              <li className="flex gap-2">
                <span className="text-blitz-600 font-semibold">2.</span>
                Enable Developer mode
              </li>
              <li className="flex gap-2">
                <span className="text-blitz-600 font-semibold">3.</span>
                Copy the ID under Blitz
              </li>
            </ol>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Extension ID</span>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="abcdefghijklmnopqrstuvwxyzabcdef"
                className="w-full border border-slate-300 rounded-lg p-3 mt-1.5 font-mono text-sm focus:ring-2 focus:ring-blitz-200 focus:border-blitz-400"
              />
            </label>
            {error && (
              <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={connect}
              disabled={checking || !id.trim()}
              className="w-full bg-blitz-600 hover:bg-blitz-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors shadow-sm"
            >
              {checking ? "Connecting…" : "Open workspace"}
            </button>
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              Prefer zero setup? Use{" "}
              <strong className="text-slate-700">Blitz → Open dashboard</strong> from the extension
              popup.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
