const platforms = ["Greenhouse", "LinkedIn Jobs", "Indeed", "Workday"];

export default function Platforms() {
  return (
    <section id="platforms" className="relative px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Works where you apply
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {platforms.map((name) => (
            <span
              key={name}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
