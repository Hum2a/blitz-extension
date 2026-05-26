import { CHROME_STORE_URL, GITHUB_REPO_URL } from "../lib/config.js";

export default function Install() {
  const hasStore = Boolean(CHROME_STORE_URL);

  return (
    <section id="install" className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="glass-card overflow-hidden p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {hasStore ? "Get Blitz on Chrome" : "Install Blitz (developer build)"}
          </h2>
          <p className="mt-4 text-slate-400 leading-relaxed">
            {hasStore
              ? "Install from the Chrome Web Store and start tailoring applications in minutes."
              : "The Chrome Web Store listing is coming soon. For now, load the extension unpacked from the repo."}
          </p>

          {hasStore ? (
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-8"
            >
              Add to Chrome
              <span aria-hidden>→</span>
            </a>
          ) : (
            <ol className="mt-8 space-y-3 text-left text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs font-bold text-violet-200">
                  1
                </span>
                Clone or download the extension from GitHub.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs font-bold text-violet-200">
                  2
                </span>
                Run <code className="rounded bg-black/40 px-1.5 py-0.5 text-violet-200">npm run build</code>{" "}
                in <code className="rounded bg-black/40 px-1.5 py-0.5 text-violet-200">blitz-extension</code>.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/30 text-xs font-bold text-violet-200">
                  3
                </span>
                Open <code className="rounded bg-black/40 px-1.5 py-0.5 text-violet-200">chrome://extensions</code>
                , enable Developer mode, Load unpacked → select the folder.
              </li>
            </ol>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {hasStore ? null : (
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                View on GitHub
              </a>
            )}
            <a href="https://app.blitzai.online" className="text-sm text-slate-400 underline hover:text-white">
              Web workspace →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
