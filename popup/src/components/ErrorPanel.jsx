import { useState } from "react";

export default function ErrorPanel({ title = "Error", error, details, onCopy, onDismiss }) {
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
      alert(text);
    }
  };

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-semibold">{title}</p>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={handleCopy} className="text-xs underline">
            {copied ? "Copied" : "Copy"}
          </button>
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
    </div>
  );
}
