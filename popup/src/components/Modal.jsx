import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Btn } from "./motion.jsx";

const VARIANT_STYLES = {
  info: {
    badge: "bg-blitz-100 text-blitz-700",
    title: "text-slate-900",
  },
  success: {
    badge: "bg-green-100 text-green-700",
    title: "text-green-900",
  },
  error: {
    badge: "bg-red-100 text-red-700",
    title: "text-red-900",
  },
  warning: {
    badge: "bg-amber-100 text-amber-800",
    title: "text-amber-900",
  },
};

const VARIANT_LABEL = {
  info: "Notice",
  success: "Success",
  error: "Error",
  warning: "Warning",
};

const SIZE_CLASS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-4xl",
};

/**
 * Accessible modal shell — backdrop, escape, focus on open.
 * Use via ModalProvider / useModal for alerts; or control `open` locally.
 */
export function Modal({
  open,
  onClose,
  title,
  variant = "info",
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  showCloseButton = true,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.info;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled])"
      );
      focusable?.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close dialog"
            tabIndex={-1}
            className="absolute inset-0 bg-black/40 cursor-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={`relative bg-white rounded-xl shadow-xl w-full ${SIZE_CLASS[size] || SIZE_CLASS.md} max-h-[90vh] flex flex-col border border-slate-200`}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className={`font-semibold text-base leading-snug ${styles.title}`}>
                      {title}
                    </h2>
                  )}
                  {!title && (
                    <span
                      className={`inline-block text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${styles.badge}`}
                    >
                      {VARIANT_LABEL[variant] || VARIANT_LABEL.info}
                    </span>
                  )}
                </div>
                {showCloseButton && onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 text-slate-400 hover:text-slate-700 text-xl leading-none w-8 h-8 rounded-lg hover:bg-slate-100"
                    aria-label="Close"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {children && (
              <div className="px-4 py-4 overflow-y-auto text-sm text-slate-700">{children}</div>
            )}
            {footer && (
              <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap justify-end gap-2 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ModalActions({ children, className = "" }) {
  return <div className={`flex flex-wrap justify-end gap-2 ${className}`}>{children}</div>;
}

export function ModalButton({
  children,
  onClick,
  variant = "secondary",
  disabled,
  className = "",
}) {
  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50";
  const variants = {
    primary: "bg-blitz-600 text-white hover:bg-blitz-700 btn-shine",
    secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };
  return (
    <Btn
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.secondary} ${className}`}
    >
      {children}
    </Btn>
  );
}
