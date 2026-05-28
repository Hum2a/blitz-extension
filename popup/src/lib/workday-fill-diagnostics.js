/** @typedef {"found" | "missing" | "filled" | "skipped" | "failed"} FieldStatus */

/**
 * @typedef {object} WorkdayFieldDiagnostic
 * @property {string} id
 * @property {string} label
 * @property {FieldStatus} status
 * @property {string} [detail]
 */

/**
 * @typedef {object} WorkdayFillDiagnostics
 * @property {"workday"} platform
 * @property {string} scannedAt
 * @property {"scan" | "fill"} mode
 * @property {"job_posting" | "apply_form" | "unknown"} pagePhase
 * @property {boolean} applyButtonFound
 * @property {number} shadowRootCount
 * @property {number} iframeCount
 * @property {WorkdayFieldDiagnostic[]} fields
 * @property {{ expected: number, matched: number, unmatched: string[] }} screening
 * @property {{ fileInputFound: boolean, status: string, detail?: string }} resume
 * @property {string[]} warnings
 * @property {string[]} suggestions
 * @property {string} summary
 */

export const PAGE_PHASE_LABELS = {
  job_posting: "Job posting",
  apply_form: "Application form",
  unknown: "Unknown page",
};

export const FIELD_STATUS_LABELS = {
  found: "Detected",
  missing: "Not found",
  filled: "Filled",
  skipped: "Skipped",
  failed: "Failed",
};

export function summarizeWorkdayDiagnostics(report) {
  if (!report) return { filled: 0, found: 0, total: 0, ready: false };
  const fields = report.fields || [];
  const filled = fields.filter((f) => f.status === "filled").length;
  const found = fields.filter((f) => f.status === "found" || f.status === "filled").length;
  const total = fields.length;
  const ready =
    report.pagePhase === "apply_form" &&
    fields.some((f) => f.id === "email" && (f.status === "found" || f.status === "filled"));
  return { filled, found, total, ready };
}

export function buildWorkdaySummary(report) {
  const { filled, found, total } = summarizeWorkdayDiagnostics(report);
  const parts = [`${found}/${total} fields detected`];
  if (report.mode === "fill") {
    parts.push(`${filled} filled`);
  }
  if (report.screening?.expected > 0) {
    parts.push(`${report.screening.matched}/${report.screening.expected} screening answers placed`);
  }
  if (report.resume?.fileInputFound) {
    parts.push(`resume: ${report.resume.status}`);
  }
  return parts.join(" · ");
}

export function workdaySuggestionsForPhase(pagePhase) {
  if (pagePhase === "job_posting") {
    return [
      "Open the Apply flow first, or use Approve & fill — Blitz will try to click Apply.",
      "Stay on the same browser tab as the job while filling from Review.",
    ];
  }
  if (pagePhase === "unknown") {
    return [
      "Reload the Workday tab after the application form fully loads.",
      "Expand collapsed sections (Work experience, Questions) before scanning again.",
    ];
  }
  return [
    "If a field stays missing, expand all form sections — Workday hides inputs in Shadow DOM.",
    "Upload may require PDF export from Review when auto-attach fails.",
  ];
}
