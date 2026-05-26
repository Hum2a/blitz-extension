/** Widget status chip — mirrors content/job-widget.js statusClass(). */

export const PAGE_TYPES = {
  SINGLE_JOB: "single_job",
  JOB_LIST: "job_list",
  SEARCH: "search",
  PLATFORM: "platform",
  UNSUPPORTED: "unsupported",
};

export function widgetStatusClass(ctx) {
  if (!ctx?.platform) return { cls: "status-idle", label: "Unsupported" };
  if (ctx.pageType === PAGE_TYPES.SINGLE_JOB) return { cls: "status-ready", label: "Ready" };
  if (ctx.pageType === PAGE_TYPES.JOB_LIST) {
    return ctx.hasPartialDetail
      ? { cls: "status-partial", label: "Select job" }
      : { cls: "status-list", label: "Job list" };
  }
  if (ctx.pageType === PAGE_TYPES.SEARCH) return { cls: "status-list", label: "Browse jobs" };
  return { cls: "status-idle", label: "Jobs site" };
}
