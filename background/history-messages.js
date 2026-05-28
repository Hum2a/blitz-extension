import {
  getAllApplications,
  addApplication,
  updateApplication,
  deleteApplication,
} from "../popup/src/lib/db.js";
import { findApplicationInList } from "../popup/src/lib/application-store.js";
import { toHistorySummary } from "../popup/src/lib/history-bridge.js";

export async function handleHistoryMessage(message) {
  switch (message.type) {
    case "LIST_APPLICATION_HISTORY": {
      const apps = await getAllApplications();
      return {
        applications: apps.map((r) => toHistorySummary(r)),
      };
    }

    case "GET_JOB_HISTORY_MATCH": {
      const jobData = message.payload?.jobData;
      if (!jobData) return { match: null };
      const apps = await getAllApplications();
      const record = findApplicationInList(apps, jobData);
      if (!record) return { match: null };
      return {
        match: {
          id: record.id,
          listingKey: record.listingKey,
          applicationTitle: record.applicationTitle,
          status: record.status,
          matchScore: record.matchScore ?? null,
          matchRationale: record.matchRationale || "",
          generatedAt: record.generatedAt,
          updatedAt: record.updatedAt,
          hasCv: Boolean(record.cvSnapshot?.trim()),
        },
      };
    }

    case "SAVE_APPLICATION_HISTORY": {
      const record = message.payload?.record;
      if (!record?.id) return { error: "Invalid record" };
      await addApplication(record);
      return { ok: true };
    }

    case "PATCH_APPLICATION_HISTORY": {
      const { id, patch } = message.payload || {};
      if (!id) return { error: "Missing id" };
      await updateApplication(id, patch || {});
      return { ok: true };
    }

    case "DELETE_APPLICATION_HISTORY": {
      const id = message.payload?.id;
      if (!id) return { error: "Missing id" };
      await deleteApplication(id);
      return { ok: true };
    }

    default:
      return null;
  }
}
