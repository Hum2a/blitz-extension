import { CHROME_STORE_URL } from "../lib/config.js";

const links = [
  { href: "#features", label: "Features" },
  { href: "#platforms", label: "Platforms" },
  { href: "#how", label: "How it works" },
  { href: "#install", label: "Install" },
];

export default function Nav() {
  const ctaHref = CHROME_STORE_URL || "#install";
  const ctaExternal = Boolean(CHROME_STORE_URL);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-5 sm:px-6">
      <nav className="glass-nav mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <a href="#" className="flex items-center gap-2.5 font-bold tracking-tight text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm shadow-lg shadow-violet-500/30">
            B
          </span>
          Blitz
        </a>
        <ul className="hidden items-center gap-6 text-sm font-medium text-white/90 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <a
            href={ctaHref}
            {...(ctaExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-600/30 transition hover:brightness-110 sm:text-sm sm:px-5"
          >
            Get extension
          </a>
        </div>
      </nav>
    </header>
  );
}
