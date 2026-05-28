import { getAllApplications } from "../popup/src/lib/db.js";
import { displayApplicationLabel } from "../popup/src/lib/application-history-utils.js";

const ALARM_PREFIX = "blitz-followup-";

export function initFollowUpReminders() {
  chrome.alarms.onAlarm.addListener(onFollowUpAlarm);
  syncFollowUpAlarms().catch(() => {});
}

async function onFollowUpAlarm(alarm) {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;

  const applicationId = alarm.name.slice(ALARM_PREFIX.length);
  const apps = await getAllApplications();
  const app = apps.find((a) => a.id === applicationId);
  if (!app?.followUpAt) return;

  const when = new Date(app.followUpAt).getTime();
  if (when > Date.now() + 60_000) {
    await chrome.alarms.create(alarm.name, { when });
    return;
  }

  const label = displayApplicationLabel(app);
  const note = app.followUpNote?.trim();

  try {
    await chrome.notifications.create(`followup-${applicationId}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon128.png"),
      title: "Blitz follow-up",
      message: note ? `${label} — ${note}` : `Time to check back: ${label}`,
      priority: 1,
    });
  } catch {
    /* notifications optional */
  }
}

export async function syncFollowUpAlarms() {
  const existing = await chrome.alarms.getAll();
  for (const alarm of existing) {
    if (alarm.name.startsWith(ALARM_PREFIX)) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  const apps = await getAllApplications();
  const now = Date.now();

  for (const app of apps) {
    if (!app.followUpAt) continue;
    const when = new Date(app.followUpAt).getTime();
    if (!Number.isFinite(when) || when <= now - 86_400_000) continue;
    await chrome.alarms.create(`${ALARM_PREFIX}${app.id}`, {
      when: Math.max(when, now + 5_000),
    });
  }
}

export async function clearFollowUpAlarm(applicationId) {
  await chrome.alarms.clear(`${ALARM_PREFIX}${applicationId}`);
}
