import { addApiUsageRecord, getAllApiUsageRecords, clearApiUsageRecords } from "./db.js";
import { costFromUsage, formatUsd, formatTokens } from "./cost-estimate.js";

export const API_USAGE_TYPES = {
  GENERATE_APPLICATION: "generate_application",
  API_TEST: "api_test",
};

export const API_USAGE_TYPE_LABELS = {
  [API_USAGE_TYPES.GENERATE_APPLICATION]: "Generate application",
  [API_USAGE_TYPES.API_TEST]: "API key test",
};

/**
 * Persist one AI API call (success or failure) for the usage history UI.
 */
export async function recordApiUsage({
  type = API_USAGE_TYPES.GENERATE_APPLICATION,
  provider,
  model,
  usage,
  cost,
  jobData,
  success = true,
  errorMessage,
}) {
  const resolvedCost =
    cost ||
    (usage && provider ? costFromUsage(usage, provider, model) : null);

  const record = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    type,
    provider: provider || "unknown",
    model: model || resolvedCost?.model || "—",
    success: Boolean(success),
    errorMessage: errorMessage || null,
    jobTitle: jobData?.jobTitle || "",
    company: jobData?.company || "",
    url: jobData?.url || "",
    platform: jobData?.platform || "",
    inputTokens:
      resolvedCost?.inputTokens ??
      usage?.input_tokens ??
      usage?.prompt_tokens ??
      0,
    outputTokens:
      resolvedCost?.outputTokens ??
      usage?.output_tokens ??
      usage?.completion_tokens ??
      0,
    inputCostUsd: resolvedCost?.inputCostUsd ?? 0,
    outputCostUsd: resolvedCost?.outputCostUsd ?? 0,
    totalCostUsd: resolvedCost?.totalCostUsd ?? 0,
  };

  return addApiUsageRecord(record);
}

export async function listApiUsage() {
  return getAllApiUsageRecords();
}

export async function clearApiUsage() {
  return clearApiUsageRecords();
}

export function summarizeApiUsage(records) {
  const successful = records.filter((r) => r.success);
  const totalCostUsd = successful.reduce((sum, r) => sum + (r.totalCostUsd || 0), 0);
  const totalInput = successful.reduce((sum, r) => sum + (r.inputTokens || 0), 0);
  const totalOutput = successful.reduce((sum, r) => sum + (r.outputTokens || 0), 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = successful.filter((r) => new Date(r.at).getTime() >= weekAgo);

  return {
    totalCalls: records.length,
    successCount: successful.length,
    failedCount: records.length - successful.length,
    totalCostUsd,
    thisWeekCostUsd: thisWeek.reduce((sum, r) => sum + (r.totalCostUsd || 0), 0),
    thisWeekCalls: thisWeek.length,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
  };
}

export function usageRecordLabel(record) {
  if (record.jobTitle && record.company) {
    return `${record.jobTitle} — ${record.company}`;
  }
  return record.jobTitle || record.company || API_USAGE_TYPE_LABELS[record.type] || record.type;
}

export function exportApiUsageToCsv(records) {
  const headers = [
    "Date",
    "Type",
    "Provider",
    "Model",
    "Success",
    "Job title",
    "Company",
    "Platform",
    "Input tokens",
    "Output tokens",
    "Input USD",
    "Output USD",
    "Total USD",
    "Error",
    "URL",
  ];
  const rows = records.map((r) => [
    r.at,
    API_USAGE_TYPE_LABELS[r.type] || r.type,
    r.provider,
    r.model,
    r.success ? "yes" : "no",
    r.jobTitle,
    r.company,
    r.platform,
    r.inputTokens,
    r.outputTokens,
    r.inputCostUsd?.toFixed(6),
    r.outputCostUsd?.toFixed(6),
    r.totalCostUsd?.toFixed(6),
    r.errorMessage || "",
    r.url,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blitz-api-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export { formatUsd, formatTokens };
