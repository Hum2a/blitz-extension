import { describe, expect, it } from "vitest";
import {
  archiveApplicationSnapshot,
  integrateNewGeneration,
  applyVersionToApplication,
  archiveDraftToVersions,
} from "../../../popup/src/lib/application-versions.js";

describe("application-versions", () => {
  const job = {
    jobTitle: "Dev",
    company: "Acme",
    url: "https://www.indeed.com/viewjob?jk=abc123def",
    platform: "indeed",
  };

  it("archives previous pending app when regenerating", () => {
    const prev = {
      tailoredCV: "CV version one",
      coverLetter: "CL one",
      jobData: job,
      listingKey: "indeed:jk:abc123def",
    };
    const next = integrateNewGeneration(prev, {
      tailoredCV: "CV version two",
      coverLetter: "CL two",
    }, job);

    expect(next.tailoredCV).toBe("CV version two");
    expect(next.versions).toHaveLength(1);
    expect(next.versions[0].tailoredCV).toBe("CV version one");
    expect(next.latestSnapshot?.tailoredCV).toBe("CV version two");
  });

  it("restores a saved version into the working copy", () => {
    const app = {
      tailoredCV: "current",
      versions: [
        {
          id: "v-old",
          tailoredCV: "older",
          coverLetter: "",
          screeningAnswers: [],
          createdAt: new Date().toISOString(),
          source: "regenerated",
          label: "v1",
        },
      ],
    };
    const restored = applyVersionToApplication(app, "v-old");
    expect(restored.tailoredCV).toBe("older");
    expect(restored.versions.length).toBeGreaterThanOrEqual(1);
  });

  it("dedupes identical snapshots", () => {
    const app = { tailoredCV: "same", coverLetter: "x" };
    const once = archiveApplicationSnapshot([], app);
    const twice = archiveApplicationSnapshot(once, app);
    expect(twice).toHaveLength(1);
  });

  it("archives draft before manual save", () => {
    const app = { tailoredCV: "a", coverLetter: "b", versions: [] };
    const next = archiveDraftToVersions(app, { tailoredCV: "a edited", coverLetter: "b" });
    expect(next.tailoredCV).toBe("a edited");
    expect(next.versions).toHaveLength(1);
    expect(next.versions[0].tailoredCV).toBe("a");
  });
});
