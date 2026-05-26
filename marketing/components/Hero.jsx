import { motion } from "framer-motion";
import { APP_WORKSPACE_URL, CHROME_STORE_URL } from "../lib/config.js";

export default function Hero() {
  const storeHref = CHROME_STORE_URL || "#install";
  const storeExternal = Boolean(CHROME_STORE_URL);

  return (
    <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pt-40 lg:pb-28">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-200 sm:text-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          AI-powered job applications
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Apply faster.{" "}
          <span className="text-gradient">Land sooner.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mx-auto mt-6 max-w-2xl text-body"
        >
          Blitz tailors your CV and cover letter to every job in seconds — with your own API key.
          Review everything, then fill Greenhouse, LinkedIn, Indeed, and Workday forms in one click.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href={storeHref}
            {...(storeExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="btn-primary w-full sm:w-auto"
          >
            Add to Chrome
            <span aria-hidden>→</span>
          </a>
          <a href={APP_WORKSPACE_URL} className="btn-secondary w-full sm:w-auto">
            Open web workspace
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-caption"
        >
          15 free applications · Bring your own Anthropic or OpenAI key · Data stays in your browser
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.35 }}
        className="mx-auto mt-16 max-w-5xl"
      >
        <div className="glass-card overflow-hidden p-1 shadow-2xl shadow-violet-900/20">
          <div className="rounded-xl border border-white/5 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-sm text-white/80">Blitz — Review application</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Match score", value: "87%", color: "text-emerald-400" },
                { label: "Tailored CV", value: "Ready", color: "text-violet-300" },
                { label: "Cover letter", value: "Ready", color: "text-fuchsia-300" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left"
                >
                  <p className="text-xs uppercase tracking-wider text-white/75">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-black/30 px-4 py-6 text-center text-base text-white/85">
              Your tailored application — edit, export PDF, approve &amp; fill the job form
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
