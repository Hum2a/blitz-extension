import { listingKey as jobListingKey } from "./job-listing.js";

export const APPLICATION_STATUSES = [
  "generated",
  "applied",
  "interview",
  "rejected",
  "offer",
  "withdrawn",
];

export const STATUS_LABELS = {
  generated: "Generated",
  applied: "Applied",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
  withdrawn: "Withdrawn",
};

export function displayApplicationLabel(app) {
  if (app?.applicationTitle?.trim()) return app.applicationTitle.trim();
  const role = app?.role?.trim() || app?.jobData?.jobTitle?.trim();
  const company = app?.company?.trim() || app?.jobData?.company?.trim();
  if (role && company) return `${role} - ${company}`;
  return role || company || "Application";
}

export const STATUS_STYLES = {
  generated: "bg-violet-100 text-violet-800 border-violet-200",
  applied: "bg-blue-100 text-blue-800 border-blue-200",
  interview: "bg-amber-100 text-amber-800 border-amber-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  offer: "bg-green-100 text-green-800 border-green-200",
  withdrawn: "bg-slate-100 text-slate-600 border-slate-200",
};

export function historyDisplayDate(app) {
  const raw = app?.updatedAt || app?.generatedAt || app?.appliedAt;
  if (!raw) return "";
  return new Date(raw).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function exportApplicationsToCsv(applications) {
  const headers = [
    "Title",
    "Company",
    "Role",
    "Date",
    "Platform",
    "Match Score",
    "Status",
    "URL",
    "Notes",
  ];
  const rows = applications.map((a) => [
    displayApplicationLabel(a),
    a.company,
    a.role,
    new Date(a.updatedAt || a.generatedAt || a.appliedAt).toISOString().slice(0, 10),
    a.platform,
    a.matchScore,
    a.status,
    a.url,
    (a.notes || "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell ?? ""}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `blitz-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function computeHistorySummary(applications) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = applications.filter((a) => {
    const t = new Date(a.updatedAt || a.generatedAt || a.appliedAt).getTime();
    return t >= weekAgo;
  }).length;
  const interviews = applications.filter((a) => a.status === "interview").length;
  const offers = applications.filter((a) => a.status === "offer").length;
  const applied = applications.filter((a) => a.status === "applied").length;
  const positive = interviews + offers;
  const responseRate =
    applications.length > 0 ? Math.round((positive / applications.length) * 100) : 0;

  return {
    total: applications.length,
    thisWeek,
    interviews,
    offers,
    applied,
    responseRate,
  };
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

const CSV_HEADER_MAP = {
  title: "title",
  company: "company",
  role: "role",
  date: "date",
  platform: "platform",
  "match score": "matchScore",
  status: "status",
  url: "url",
  notes: "notes",
};

/**
 * Import application metadata from exported CSV (no CV bodies).
 */
export function parseApplicationsFromCsv(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) {
    return { records: [], errors: ["File is empty or has no data rows."] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const keys = headers.map((h) => CSV_HEADER_MAP[h] || null);
  if (!keys.includes("title") && !keys.includes("role")) {
    return {
      records: [],
      errors: ["Unrecognized CSV — expected columns like Title, Company, Role, URL."],
    };
  }

  const records = [];
  const errors = [];

  for (let row = 1; row < lines.length; row += 1) {
    const cells = parseCsvLine(lines[row]);
    if (cells.every((c) => !c)) continue;

    const rowObj = {};
    keys.forEach((key, i) => {
      if (key) rowObj[key] = cells[i] ?? "";
    });

    const role = rowObj.role || rowObj.title || "Imported role";
    const company = rowObj.company || "";
    const url = rowObj.url || "";
    const status = APPLICATION_STATUSES.includes(rowObj.status)
      ? rowObj.status
      : "generated";
    const now = new Date().toISOString();
    const parsedDate = rowObj.date ? new Date(rowObj.date) : null;
    const generatedAt =
      parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : now;

    const jobRef = { url, company, jobTitle: role, platform: rowObj.platform || "" };
    records.push({
      id: crypto.randomUUID(),
      listingKey: jobListingKey(jobRef) || `${company}:${role}`.toLowerCase(),
      applicationTitle: rowObj.title || (company ? `${role} - ${company}` : role),
      company,
      role,
      url,
      platform: rowObj.platform || "",
      status,
      generatedAt,
      updatedAt: now,
      appliedAt: status === "applied" ? generatedAt : null,
      matchScore: rowObj.matchScore ? Number(rowObj.matchScore) : null,
      matchRationale: "",
      cvSnapshot: "",
      coverLetterSnapshot: "",
      screeningAnswers: [],
      jobData: { jobTitle: role, company, url, platform: rowObj.platform || "" },
      events: [{ type: "imported", at: now, detail: "Imported from CSV" }],
      notes: rowObj.notes || "",
      followUpAt: null,
      followUpNote: "",
    });
  }

  if (records.length === 0) errors.push("No valid rows found.");
  return { records, errors };
}

export function filterApplications(applications, { statusFilter, search, followUpOnly }) {
  let list = [...applications];
  if (followUpOnly) {
    list = list.filter((a) => a.followUpAt && new Date(a.followUpAt).getTime() >= Date.now() - 86_400_000);
  }
  if (statusFilter && statusFilter !== "all") {
    list = list.filter((a) => a.status === statusFilter);
  }
  const q = search?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (a) =>
        a.company?.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q) ||
        a.applicationTitle?.toLowerCase().includes(q) ||
        a.platform?.toLowerCase().includes(q)
    );
  }
  return list.sort(
    (a, b) =>
      new Date(b.updatedAt || b.generatedAt || b.appliedAt) -
      new Date(a.updatedAt || a.generatedAt || a.appliedAt)
  );
}
