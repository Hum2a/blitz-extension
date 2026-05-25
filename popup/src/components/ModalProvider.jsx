import { createContext, useCallback, useState } from "react";
import { Modal, ModalButton } from "./Modal.jsx";

export const ModalContext = createContext(null);

function inferVariant(title, variant) {
  if (variant) return variant;
  const t = (title || "").toLowerCase();
  if (t.includes("error") || t.includes("failed")) return "error";
  if (t.includes("success") || t.includes("activated") || t.includes("works")) return "success";
  if (t.includes("warning") || t.includes("limit")) return "warning";
  return "info";
}

function ModalHost({ config, onClose }) {
  if (!config) return null;

  const {
    kind,
    title,
    message,
    variant,
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    defaultValue = "",
    placeholder = "",
    onConfirm,
    onCancel,
  } = config;

  const resolvedVariant = inferVariant(title, variant);

  if (kind === "prompt") {
    return (
      <PromptModal
        key={config.promptId}
        open
        title={title || "Input"}
        message={message}
        variant={resolvedVariant}
        defaultValue={defaultValue}
        placeholder={placeholder}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
        onClose={onClose}
      />
    );
  }

  const footer =
    kind === "confirm" ? (
      <>
        <ModalButton variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </ModalButton>
        <ModalButton
          variant={resolvedVariant === "error" ? "danger" : "primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </ModalButton>
      </>
    ) : (
      <ModalButton
        variant={
          resolvedVariant === "success"
            ? "success"
            : resolvedVariant === "error"
              ? "danger"
              : "primary"
        }
        onClick={onConfirm}
      >
        {confirmLabel}
      </ModalButton>
    );

  return (
    <Modal
      open
      onClose={kind === "confirm" ? onCancel : onConfirm}
      title={title}
      variant={resolvedVariant}
      closeOnBackdrop={kind !== "confirm"}
      footer={footer}
    >
      {message && <p className="whitespace-pre-wrap leading-relaxed">{message}</p>}
    </Modal>
  );
}

function PromptModal({
  open,
  title,
  message,
  variant,
  defaultValue,
  placeholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onClose,
}) {
  const [value, setValue] = useState(defaultValue);

  const submit = () => {
    onConfirm?.(value);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onCancel?.();
        onClose();
      }}
      title={title}
      variant={variant}
      closeOnBackdrop={false}
      footer={
        <>
          <ModalButton
            variant="secondary"
            onClick={() => {
              onCancel?.();
              onClose();
            }}
          >
            {cancelLabel}
          </ModalButton>
          <ModalButton variant="primary" onClick={submit}>
            {confirmLabel}
          </ModalButton>
        </>
      }
    >
      {message && <p className="mb-3 text-slate-600">{message}</p>}
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blitz-200 focus:border-blitz-400"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
    </Modal>
  );
}

export function ModalProvider({ children }) {
  const [config, setConfig] = useState(null);

  const close = useCallback(() => setConfig(null), []);

  const showAlert = useCallback(
    (message, options = {}) =>
      new Promise((resolve) => {
        setConfig({
          kind: "alert",
          message: String(message ?? ""),
          title: options.title ?? "Notice",
          variant: options.variant,
          confirmLabel: options.confirmLabel ?? "OK",
          onConfirm: () => {
            close();
            resolve(true);
          },
        });
      }),
    [close]
  );

  const showConfirm = useCallback(
    (message, options = {}) =>
      new Promise((resolve) => {
        setConfig({
          kind: "confirm",
          message: String(message ?? ""),
          title: options.title ?? "Confirm",
          variant: options.variant ?? "warning",
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          onConfirm: () => {
            close();
            resolve(true);
          },
          onCancel: () => {
            close();
            resolve(false);
          },
        });
      }),
    [close]
  );

  const showPrompt = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        setConfig({
          kind: "prompt",
          promptId: `${Date.now()}-${Math.random()}`,
          message: options.message ?? "",
          title: options.title ?? "Input",
          variant: options.variant ?? "info",
          defaultValue: options.defaultValue ?? "",
          placeholder: options.placeholder ?? "",
          confirmLabel: options.confirmLabel ?? "OK",
          cancelLabel: options.cancelLabel ?? "Cancel",
          onConfirm: (value) => {
            close();
            resolve(value);
          },
          onCancel: () => {
            close();
            resolve(null);
          },
        });
      }),
    [close]
  );

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt, close }}>
      {children}
      <ModalHost config={config} onClose={close} />
    </ModalContext.Provider>
  );
}
