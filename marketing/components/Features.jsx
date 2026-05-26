import { motion } from "framer-motion";

const features = [
  {
    icon: "⚡",
    title: "One-click tailoring",
    body: "Paste a job URL or use the on-page widget. Blitz generates a tailored CV, cover letter, and screening answers in one AI call.",
    accent: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: "🎯",
    title: "Match score & rationale",
    body: "See how well you fit before you apply — with a clear score and explanation so you only spend time on roles worth it.",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5",
  },
  {
    icon: "🛡️",
    title: "Your data, your keys",
    body: "API keys and CV content stay in Chrome storage on your machine. Optional encrypted cloud sync — never plaintext in our DB.",
    accent: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: "📄",
    title: "PDF & Word export",
    body: "Rich-text review, version history, and export to PDF or Word using your own CV layout template.",
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: "🤖",
    title: "Human-like form fill",
    body: "You approve every application before anything is filled. Blitz types into Greenhouse, LinkedIn, Indeed, and Workday like you would.",
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: "📊",
    title: "Track every application",
    body: "History, analytics, and a job queue — run your search from a full dashboard tab or the extension popup.",
    accent: "from-pink-500/20 to-pink-500/5",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-label">Features</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Everything you need to <span className="text-gradient-mint">apply at scale</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Tailor, review, export, and fill — without leaving your browser.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.article
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="glass-card group p-6 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-2xl`}
              >
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">{f.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
