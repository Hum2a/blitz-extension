/** Preset offsets for follow-up reminders (ms from now). */
export const FOLLOW_UP_PRESETS = [
  { id: "tomorrow", label: "Tomorrow", days: 1 },
  { id: "3d", label: "In 3 days", days: 3 },
  { id: "1w", label: "In 1 week", days: 7 },
  { id: "2w", label: "In 2 weeks", days: 14 },
];

export function followUpAtFromDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function formatFollowUpAt(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = t - Date.now();
  if (diff < 0) return "Due now";
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export async function syncFollowUpAlarmsFromUi() {
  try {
    await chrome.runtime.sendMessage({ type: "SYNC_FOLLOW_UP_REMINDERS" });
  } catch {
    /* background may be asleep */
  }
}
