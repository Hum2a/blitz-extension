import { APP_WORKSPACE_URL, CHROME_STORE_URL, SUPPORT_MAILTO } from "../lib/config.js";

export default function Install() {
  const hasStore = Boolean(CHROME_STORE_URL);

  return (
    <section id="install" className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="glass-card overflow-hidden p-8 sm:p-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {hasStore ? "Get Blitz on Chrome" : "Coming to the Chrome Web Store"}
          </h2>
          <p className="mt-4 text-body max-w-lg mx-auto">
            {hasStore
              ? "Install from the Chrome Web Store and start tailoring applications in minutes."
              : "Blitz is launching soon. Get notified when the extension is available, or use the web workspace if you already have access."}
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
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={SUPPORT_MAILTO} className="btn-primary">
                Request early access
              </a>
              <a href={APP_WORKSPACE_URL} className="btn-secondary">
                Open web workspace
              </a>
            </div>
          )}

          {hasStore && (
            <p className="mt-8">
              <a
                href={APP_WORKSPACE_URL}
                className="text-sm font-medium text-white/80 underline hover:text-white"
              >
                Already installed? Open web workspace →
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
