import { beforeAll, describe, expect, it } from "vitest";
import {
  addApplication,
  getAllApplications,
  getApplicationByListingKey,
  updateApplication,
} from "../../../popup/src/lib/db.js";

describe("db", () => {
  beforeAll(async () => {
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase("blitz_db");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it("adds and retrieves applications sorted by date", async () => {
    await addApplication({
      id: "older",
      listingKey: "k1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      company: "A",
    });
    await addApplication({
      id: "newer",
      listingKey: "k2",
      updatedAt: "2026-06-01T00:00:00.000Z",
      company: "B",
    });
    const all = await getAllApplications();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe("newer");
  });

  it("finds application by listing key index", async () => {
    await addApplication({
      id: "app-gh",
      listingKey: "greenhouse:/acme/jobs/1",
      company: "Acme",
    });
    const found = await getApplicationByListingKey("greenhouse:/acme/jobs/1");
    expect(found?.id).toBe("app-gh");
  });

  it("updates existing application", async () => {
    await addApplication({
      id: "u1",
      listingKey: "k-update",
      status: "generated",
      updatedAt: "2026-06-02T00:00:00.000Z",
    });
    await updateApplication("u1", { status: "applied", company: "Co" });
    const all = await getAllApplications();
    const updated = all.find((a) => a.id === "u1");
    expect(updated?.status).toBe("applied");
    expect(updated?.company).toBe("Co");
  });
});
