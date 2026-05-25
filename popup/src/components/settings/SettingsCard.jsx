export default function SettingsCard({ id, title, description, children, className = "" }) {
  return (
    <section
      id={id}
      className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden scroll-mt-24 ${className}`}
    >
      <header className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">{description}</p>
        )}
      </header>
      <div className="px-5 py-4 space-y-4 text-sm">{children}</div>
    </section>
  );
}

export function SettingsField({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      {hint && <p className="text-xs text-slate-500 mt-0.5 mb-1.5">{hint}</p>}
      <div className={label || hint ? "mt-1" : ""}>{children}</div>
    </label>
  );
}

export function SettingsInput({ className = "", ...props }) {
  return (
    <input
      className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blitz-200 focus:border-blitz-400 ${className}`}
      {...props}
    />
  );
}

export function SettingsSelect({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blitz-200 focus:border-blitz-400 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
