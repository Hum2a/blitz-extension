import { useState } from "react";
import App from "../App.jsx";
import {
  getExtensionId,
  setExtensionId,
  sendExtensionMessage,
} from "../lib/extension-env.js";

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
    } catch (err) {
      setConnected(false);
      setError(err.message || "Could not connect to Blitz");
    } finally {
      setChecking(false);
    }
  };

  if (connected) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 text-center">
          Local dashboard · synced with extension storage · keep the Blitz extension installed
        </div>
        <App fullPage />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl border shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">Connect Blitz web dashboard</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          This page runs on your machine and reads the same data as the Chrome extension via a
          secure bridge. You can leave this tab open instead of reopening the popup.
        </p>
        <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
          <li>
            Open{" "}
            <a href="chrome://extensions" className="text-blitz-600 underline">
              chrome://extensions
            </a>
          </li>
          <li>Enable <strong>Developer mode</strong></li>
          <li>
            Under <strong>Blitz</strong>, copy the <strong>ID</strong> (e.g.{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">abcdef…</code>)
          </li>
          <li>Paste it below and click Connect</li>
        </ol>
        <label className="block text-sm">
          <span className="text-slate-500">Extension ID</span>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Paste extension ID"
            className="w-full border rounded-lg p-2 mt-1 font-mono text-xs"
          />
        </label>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={connect}
          disabled={checking || !id.trim()}
          className="w-full bg-blitz-600 hover:bg-blitz-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg"
        >
          {checking ? "Connecting…" : "Connect"}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Or use the built-in dashboard: Blitz popup → <strong>Open dashboard</strong> (no ID
          needed)
        </p>
      </div>
    </div>
  );
}
