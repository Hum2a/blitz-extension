import { APP_WORKSPACE_URL, GITHUB_REPO_URL } from "../lib/config.js";

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
        <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          <a href="#features" className="hover:text-slate-300">
            Features
          </a>
          <a href={APP_WORKSPACE_URL} className="hover:text-slate-300">
            Web app
          </a>
          <a href="https://admin.blitzai.online" className="hover:text-slate-300">
            Admin
          </a>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300">
            GitHub
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-xl text-center text-xs text-slate-600">
        Blitz is not affiliated with LinkedIn, Indeed, Greenhouse, or Workday. Use responsibly and review every
        application before submitting.
      </p>
    </footer>
  );
}
