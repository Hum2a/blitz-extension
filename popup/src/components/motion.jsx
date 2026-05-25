import { motion, AnimatePresence } from "framer-motion";

export { motion, AnimatePresence };

export const ease = [0.22, 1, 0.36, 1];

export const spring = { type: "spring", stiffness: 400, damping: 30 };

export const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(4px)",
    transition: { duration: 0.22, ease },
  },
};

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: spring },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export function Page({ children, className = "" }) {
  return (
    <motion.div variants={page} initial="initial" animate="animate" exit="exit" className={className}>
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className = "" }) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className={className}>
      {children}
    </motion.div>
  );
}

export function FadeUp({ children, className = "", delay = 0, ...rest }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Card({ children, className = "", delay = 0, hover = true }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, ...spring }}
      whileHover={
        hover
          ? {
              y: -2,
              boxShadow: "0 12px 28px -8px rgba(var(--shadow-primary), var(--shadow-card))",
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function Btn({ children, className = "", disabled, ...rest }) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function NavTab({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="relative px-2 py-1 rounded text-sm">
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 bg-white/25 rounded"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className={`relative z-10 ${active ? "font-medium" : ""}`}>{children}</span>
    </button>
  );
}

export function PulseDots({ label = "Loading" }) {
  return (
    <motion.div
      className="flex items-center gap-2 text-sm text-slate-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blitz-500"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
      <span>{label}</span>
    </motion.div>
  );
}

export function ShimmerBar({ className = "" }) {
  return (
    <div className={`overflow-hidden rounded-lg bg-slate-100 ${className}`}>
      <motion.div
        className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
      />
    </div>
  );
}
