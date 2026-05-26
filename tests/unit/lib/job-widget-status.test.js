import { describe, expect, it } from "vitest";
import {
  PAGE_TYPES,
  widgetStatusClass,
} from "../../../popup/src/lib/job-widget-status.js";

describe("job-widget-status", () => {
  it("returns unsupported without platform", () => {
    expect(widgetStatusClass({})).toEqual({ cls: "status-idle", label: "Unsupported" });
  });

  it("returns ready on single job page", () => {
    expect(
      widgetStatusClass({ platform: "linkedin", pageType: PAGE_TYPES.SINGLE_JOB })
    ).toEqual({ cls: "status-ready", label: "Ready" });
  });

  it("distinguishes job list partial vs full list", () => {
    expect(
      widgetStatusClass({
        platform: "indeed",
        pageType: PAGE_TYPES.JOB_LIST,
        hasPartialDetail: true,
      })
    ).toEqual({ cls: "status-partial", label: "Select job" });
    expect(
      widgetStatusClass({ platform: "indeed", pageType: PAGE_TYPES.JOB_LIST })
    ).toEqual({ cls: "status-list", label: "Job list" });
  });
});
