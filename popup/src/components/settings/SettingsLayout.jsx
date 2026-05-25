const SECTIONS = [
  { id: "settings-account", label: "Account & sync" },
  { id: "settings-appearance", label: "Appearance" },
  { id: "settings-ai", label: "AI & API" },
  { id: "settings-profile", label: "Profile & CV" },
  { id: "settings-details", label: "Your details" },
  { id: "settings-app", label: "Application" },
  { id: "settings-template", label: "CV template" },
  { id: "settings-license", label: "License" },
];

export default function SettingsLayout({ fullPage, children, footer }) {
  if (!fullPage) {
    return (
      <div className="space-y-4">
        {children}
        {footer}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[200px_1fr] gap-8 -mt-2">
      <aside className="hidden lg:block">
        <nav
          className="sticky top-24 space-y-0.5 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
          aria-label="Settings sections"
        >
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            On this page
          </p>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-blitz-50 hover:text-blitz-800 transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="space-y-6 min-w-0 max-w-3xl lg:max-w-none">
        {children}
        {footer}
      </div>
    </div>
  );
}

export { SECTIONS };
