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

export function filterApplications(applications, { statusFilter, search }) {
  let list = [...applications];
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
