import { describe, expect, it } from "vitest";
import { parseApplicationsFromCsv } from "../../../popup/src/lib/application-history-utils.js";

describe("parseApplicationsFromCsv", () => {
  it("parses exported-style CSV rows", () => {
    const csv = `Title,Company,Role,Date,Platform,Match Score,Status,URL,Notes
"Engineer - Acme",Acme,Engineer,2026-05-01,greenhouse,85,applied,https://boards.greenhouse.io/acme/jobs/1,"note one"`;

    const { records, errors } = parseApplicationsFromCsv(csv);
    expect(errors).toHaveLength(0);
    expect(records).toHaveLength(1);
    expect(records[0].company).toBe("Acme");
    expect(records[0].status).toBe("applied");
    expect(records[0].platform).toBe("greenhouse");
    expect(records[0].notes).toBe("note one");
  });

  it("rejects empty files", () => {
    const { records, errors } = parseApplicationsFromCsv("Title,Company\n");
    expect(records).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
