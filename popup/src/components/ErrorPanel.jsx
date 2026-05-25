import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useModal } from "../hooks/useModal.js";

export default function ErrorPanel({ title = "Error", error, details, onCopy, onDismiss }) {
  const { showAlert } = useModal();
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const text = [
    title,
    "---",
    error,
    details ? `\nDetails:\n${typeof details === "string" ? details : JSON.stringify(details, null, 2)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await showAlert(text, {
        title: "Copy manually",
        variant: "info",
        confirmLabel: "Close",
      });
    }
  };

  return (
    <motion.div
      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
      initial={{ opacity: 0, scale: 0.96, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      layout
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <motion.p
          className="font-semibold"
          animate={{ x: [0, -2, 0] }}
          transition={{ repeat: 2, duration: 0.15 }}
        >
          {title}
        </motion.p>
        <div className="flex gap-2 shrink-0">
          <motion.button
            type="button"
            onClick={handleCopy}
            className="text-xs underline"
            whileTap={{ scale: 0.92 }}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={copied ? "c" : "copy"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                {copied ? "Copied" : "Copy"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="text-xs underline">
              Dismiss
            </button>
          )}
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words text-xs font-mono max-h-32 overflow-y-auto">
        {error}
      </pre>
      {details && (
        <details className="mt-2">
          <summary className="text-xs cursor-pointer underline">Details</summary>
          <pre className="mt-1 whitespace-pre-wrap break-words text-xs font-mono max-h-24 overflow-y-auto">
            {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}
    </motion.div>
  );
}
