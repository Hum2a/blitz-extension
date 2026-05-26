import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Install Blitz",
    body: "Add the Chrome extension and connect your Anthropic or OpenAI API key in Settings.",
  },
  {
    n: "02",
    title: "Open a job listing",
    body: "Use the floating Blitz widget on supported boards or paste a URL into your queue.",
  },
  {
    n: "03",
    title: "Review & apply",
    body: "Edit the tailored CV, compare versions, export PDF, then approve & fill — you submit when ready.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <p className="text-label text-fuchsia-300">How it works</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Three steps to a tailored application</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">From install to submit — you stay in control at every step.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative glass-card p-8"
            >
              <span className="text-4xl font-black text-gradient opacity-90">{s.n}</span>
              <h3 className="mt-4 text-xl font-semibold text-white">{s.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-300">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
