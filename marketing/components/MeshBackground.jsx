import { motion } from "framer-motion";

export default function MeshBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-[20%] top-[10%] h-[520px] w-[520px] rounded-full bg-cyan-500/20 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[15%] top-[5%] h-[600px] w-[600px] rounded-full bg-violet-600/25 blur-[130px]"
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-[30%] bottom-[5%] h-[480px] w-[480px] rounded-full bg-fuchsia-600/15 blur-[110px]"
        animate={{ x: [0, 30, 0], y: [0, -35, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#06060c_72%)]" />
    </div>
  );
}
