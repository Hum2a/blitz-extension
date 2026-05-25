function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderScalar(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(data[key]));
}

function renderSections(template, data) {
  return template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, block) => {
    const val = data[key];
    if (Array.isArray(val)) {
      return val
        .map((item) => {
          const ctx = typeof item === "object" && item !== null ? item : { text: String(item) };
          return renderSections(renderScalar(block, ctx), ctx);
        })
        .join("");
    }
    if (val) return renderSections(renderScalar(block, data), data);
    return "";
  });
}

/** Normalize bullets/lines for template loops */
export function normalizeCvDocument(doc) {
  if (!doc || typeof doc !== "object") return null;

  const bullets = (arr) =>
    (arr || []).map((b) =>
      typeof b === "string" ? { text: b } : { text: b?.text ?? String(b) }
    );

  const education = (doc.education || []).map((e) => ({
    heading: e.heading ?? "",
    lines: (e.lines || []).map((line) => ({
      text: typeof line === "string" ? line : line?.text ?? "",
    })),
  }));

  const skillGroups = (doc.skillGroups || []).map((s) => ({
    label: s.label ?? s.category ?? "",
    value: s.value ?? s.items ?? "",
  }));

  const jobs = (doc.jobs || []).map((j) => ({
    company: j.company ?? "",
    role: j.role ?? j.title ?? "",
    dates: j.dates ?? j.dateRange ?? "",
    location: j.location ?? "",
    bullets: bullets(j.bullets),
    tech: j.tech ?? "",
  }));

  return {
    fullName: doc.fullName ?? "",
    contactLine: doc.contactLine ?? "",
    summary: doc.summary ?? "",
    careerNote: doc.careerNote ?? "",
    education,
    skillGroups,
    jobs,
  };
}

export function renderCvHtml(template, cvDocument) {
  const data = normalizeCvDocument(cvDocument);
  if (!data) throw new Error("Invalid CV document data");
  return renderSections(renderScalar(template, data), data);
}

export { escapeHtml };
