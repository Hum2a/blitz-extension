import { APP_WORKSPACE_URL, SUPPORT_MAILTO } from "../lib/config.js";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/5 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2 font-bold text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs">
            B
          </span>
          Blitz · {year}
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-sm font-medium text-white/85">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#install" className="hover:text-white">
            Get Blitz
          </a>
          <a href={APP_WORKSPACE_URL} className="hover:text-white">
            Web app
          </a>
          <a href={SUPPORT_MAILTO} className="hover:text-white">
            Contact
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-sm text-white/70">
        Blitz is not affiliated with LinkedIn, Indeed, Greenhouse, or Workday. Use responsibly and review every
        application before submitting.
      </p>
    </footer>
  );
}
