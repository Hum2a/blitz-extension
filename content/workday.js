const h = window.blitzHumanise;

function queryDeep(selector, root = document) {
  const direct = root.querySelector(selector);
  if (direct) return direct;

  const nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
  for (const node of nodes) {
    if (node.shadowRoot) {
      const found = queryDeep(selector, node.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

function queryDeepAll(selector, root = document, results = []) {
  root.querySelectorAll(selector).forEach((el) => results.push(el));
  const nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
  for (const node of nodes) {
    if (node.shadowRoot) queryDeepAll(selector, node.shadowRoot, results);
  }
  return results;
}

function countShadowRoots(root = document) {
  let count = 0;
  const nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
  for (const node of nodes) {
    if (node.shadowRoot) {
      count += 1;
      count += countShadowRoots(node.shadowRoot);
    }
  }
  return count;
}

function findInputByLabelDeep(patterns) {
  const labels = queryDeepAll("label");
  for (const label of labels) {
    const text = label.textContent?.toLowerCase() || "";
    if (patterns.some((p) => text.includes(p))) {
      const forId = label.getAttribute("for");
      if (forId) {
        const byId = queryDeep(`#${CSS.escape(forId)}`);
        if (byId) return byId;
      }
      const nested = label.querySelector("input, textarea, select");
      if (nested) return nested;
    }
  }
  return null;
}

function findApplyButton() {
  return (
    queryDeep('[data-automation-id="applyButton"]') ||
    queryDeep('button[data-automation-id="adventureButton"]') ||
    [...queryDeepAll("button")].find((b) => /apply/i.test(b.textContent || "")) ||
    null
  );
}

function detectPagePhase() {
  const onForm =
    findInputByLabelDeep(["email"]) ||
    findInputByLabelDeep(["first name", "given name"]) ||
    queryDeep('input[type="file"]');
  if (onForm) return "apply_form";

  const onJob =
    queryDeep('[data-automation-id="jobPostingDescription"]') ||
    queryDeep('[data-automation-id="jobPostingHeader"]');
  if (onJob) return "job_posting";

  return "unknown";
}

function findResumeInput(fileInputs = null) {
  const inputs = fileInputs || queryDeepAll('input[type="file"]');
  return (
    inputs.find((i) => /resume|cv/i.test(i.getAttribute("data-automation-id") || i.name || "")) ||
    inputs[0] ||
    null
  );
}

function discoverField(id, label, patterns) {
  const element = findInputByLabelDeep(patterns);
  return {
    id,
    label,
    status: element ? "found" : "missing",
    element,
    detail: element ? undefined : "Not visible in DOM (check Shadow DOM / collapsed sections)",
  };
}

function emptyScreening(expected = 0) {
  return { expected, matched: 0, unmatched: [] };
}

function createReport(mode, payload = {}) {
  const expectedScreening = payload.screeningAnswers?.length || 0;
  const fileInputs = queryDeepAll('input[type="file"]');
  const resumeInput = findResumeInput(fileInputs);
  const pagePhase = detectPagePhase();

  const fields = [
    discoverField("firstName", "First name", ["first name", "given name"]),
    discoverField("lastName", "Last name", ["last name", "family name"]),
    discoverField("email", "Email", ["email"]),
    discoverField("phone", "Phone", ["phone", "mobile"]),
    discoverField("coverLetter", "Cover letter", ["cover letter", "letter", "message"]),
  ];

  const warnings = [];
  const suggestions = [];
  const shadowRootCount = countShadowRoots();

  if (shadowRootCount > 0 && fields.every((f) => f.status === "missing")) {
    warnings.push(
      "No standard fields found, but Shadow DOM is present — expand all form sections and scan again."
    );
  }

  if (pagePhase === "job_posting") {
    suggestions.push(
      "You are on the job posting. Blitz can click Apply during fill, or open the application form first."
    );
  }

  if (pagePhase === "apply_form" && !resumeInput) {
    warnings.push("No résumé/CV file input detected yet — it may appear on a later step.");
  }

  if (queryDeepAll("iframe").length > 0) {
    warnings.push("This page uses iframes; some fields may not be readable.");
  }

  const applyButtonFound = Boolean(findApplyButton());

  const report = {
    platform: "workday",
    scannedAt: new Date().toISOString(),
    mode,
    pagePhase,
    applyButtonFound,
    shadowRootCount,
    iframeCount: queryDeepAll("iframe").length,
    fields: fields.map(({ id, label, status, detail }) => ({ id, label, status, detail })),
    screening: emptyScreening(expectedScreening),
    resume: {
      fileInputFound: Boolean(resumeInput),
      status: resumeInput ? "ready" : "no_input",
      detail: resumeInput ? undefined : "No file input on this step",
    },
    warnings,
    suggestions,
    summary: "",
  };

  report.summary = buildSummary(report);
  return { report, fieldMap: fields, resumeInput };
}

function buildSummary(report) {
  const found = report.fields.filter((f) => f.status === "found" || f.status === "filled").length;
  const filled = report.fields.filter((f) => f.status === "filled").length;
  const parts = [`${found}/${report.fields.length} fields detected`];
  if (report.mode === "fill") parts.push(`${filled} filled`);
  if (report.screening.expected > 0) {
    parts.push(`${report.screening.matched}/${report.screening.expected} screening`);
  }
  if (report.resume.fileInputFound) parts.push(`resume: ${report.resume.status}`);
  return parts.join(" · ");
}

function setFieldStatus(report, id, status, detail) {
  const field = report.fields.find((f) => f.id === id);
  if (field) {
    field.status = status;
    if (detail !== undefined) field.detail = detail;
  }
}

function scanFillReadiness(payload = {}) {
  return createReport("scan", payload).report;
}

function scrapeJob() {
  const titleEl =
    queryDeep('[data-automation-id="jobPostingHeader"] h2') ||
    queryDeep('[data-automation-id="jobPostingHeader"]') ||
    queryDeep("h2[data-automation-id='jobTitle']") ||
    queryDeep("h1");

  const descEl =
    queryDeep('[data-automation-id="jobPostingDescription"]') ||
    queryDeep('[data-automation-id="jobPostingDescriptionText"]');

  const jobTitle = titleEl?.textContent?.trim() || "";
  const jobDescription = descEl?.innerText?.trim() || "";

  let company = "";
  const ogSite = document.querySelector('meta[property="og:site_name"]');
  if (ogSite) company = ogSite.content;
  if (!company) {
    const hostParts = window.location.hostname.split(".");
    company = hostParts[0] || "";
  }

  const screeningQuestions = [];
  queryDeepAll("label").forEach((label) => {
    const text = label.textContent?.trim();
    if (text && text.length > 2 && text.length < 500) screeningQuestions.push(text);
  });

  return {
    platform: "workday",
    jobTitle,
    company,
    jobDescription,
    url: window.location.href,
    screeningQuestions: [...new Set(screeningQuestions)],
  };
}

async function clickApplyIfNeeded(report) {
  const applyBtn = findApplyButton();
  if (!applyBtn) {
    if (report.pagePhase === "job_posting") {
      report.warnings.push("Apply button not found — open the application form manually.");
    }
    return false;
  }
  await h.humanClick(applyBtn);
  await h.sleep(h.randomBetween(1500, 2500));
  return true;
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");

  let { report, fieldMap, resumeInput } = createReport("fill", payload);

  if (report.pagePhase === "job_posting") {
    await clickApplyIfNeeded(report);
    ({ report, fieldMap, resumeInput } = createReport("fill", payload));
    report.suggestions.push("Apply was clicked — verify the form loaded before submitting.");
  }

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fillFields = [];

  const first = fieldMap.find((f) => f.id === "firstName");
  const last = fieldMap.find((f) => f.id === "lastName");
  const email = fieldMap.find((f) => f.id === "email");
  const phone = fieldMap.find((f) => f.id === "phone");
  const cover = fieldMap.find((f) => f.id === "coverLetter");

  if (userProfile?.name) {
    const parts = userProfile.name.trim().split(/\s+/);
    if (first?.element && parts[0]) {
      fillFields.push({ element: first.element, value: parts[0] });
      setFieldStatus(report, "firstName", "filled");
    } else if (first?.status === "found") {
      setFieldStatus(report, "firstName", "skipped", "No name in profile");
    }
    if (last?.element && parts.length > 1) {
      fillFields.push({ element: last.element, value: parts.slice(1).join(" ") });
      setFieldStatus(report, "lastName", "filled");
    } else if (last?.status === "found") {
      setFieldStatus(report, "lastName", "skipped", "No name in profile");
    }
  } else {
    if (first?.status === "found") setFieldStatus(report, "firstName", "skipped", "No name in profile");
    if (last?.status === "found") setFieldStatus(report, "lastName", "skipped", "No name in profile");
  }

  if (email?.element) {
    fillFields.push({ element: email.element, value: userProfile?.email || "" });
    setFieldStatus(report, "email", userProfile?.email ? "filled" : "skipped", "No email in profile");
  }
  if (phone?.element) {
    fillFields.push({ element: phone.element, value: userProfile?.phone || "" });
    setFieldStatus(report, "phone", userProfile?.phone ? "filled" : "skipped", "No phone in profile");
  }
  if (cover?.element && coverLetter) {
    fillFields.push({ element: cover.element, value: coverLetter });
    setFieldStatus(report, "coverLetter", "filled");
  } else if (cover?.status === "found" && !coverLetter) {
    setFieldStatus(report, "coverLetter", "skipped", "No cover letter");
  }

  try {
    await h.staggeredFill(fillFields);
  } catch (err) {
    report.warnings.push(`Contact fields: ${err.message || "fill error"}`);
    for (const f of fillFields) {
      const id = fieldMap.find((x) => x.element === f.element)?.id;
      if (id) setFieldStatus(report, id, "failed", err.message);
    }
  }

  const unmatched = [];
  let matched = 0;
  if (screeningAnswers?.length) {
    for (const { question, answer } of screeningAnswers) {
      const qLower = question.toLowerCase();
      const label = queryDeepAll("label").find((l) =>
        l.textContent?.toLowerCase().includes(qLower.slice(0, 30))
      );
      if (!label) {
        unmatched.push(question);
        continue;
      }
      const input =
        label.querySelector("input, select, textarea") ||
        queryDeep(`#${CSS.escape(label.getAttribute("for") || "")}`);
      if (!input) {
        unmatched.push(question);
        continue;
      }
      try {
        if (input.tagName === "SELECT") await h.humanSelect(input, answer);
        else await h.humanType(input, answer);
        matched += 1;
        await h.sleep(h.randomBetween(400, 900));
      } catch {
        unmatched.push(question);
      }
    }
  }
  report.screening = {
    expected: screeningAnswers?.length || 0,
    matched,
    unmatched: unmatched.slice(0, 8),
  };
  if (unmatched.length > 0) {
    report.warnings.push(
      `${unmatched.length} screening question(s) could not be matched — fill them manually.`
    );
  }

  resumeInput = findResumeInput();
  report.resume.fileInputFound = Boolean(resumeInput);

  if (resumeInput) {
    try {
      if (pdfBase64 && window.blitzFileUpload) {
        window.blitzFileUpload.attachBase64ToInput(resumeInput, pdfBase64, "CV.pdf", "application/pdf");
        report.resume.status = "pdf_attached";
      } else if (tailoredCV) {
        const blob = new Blob([tailoredCV], { type: "text/plain" });
        const dt = new DataTransfer();
        dt.items.add(new File([blob], "CV.txt", { type: "text/plain" }));
        resumeInput.files = dt.files;
        resumeInput.dispatchEvent(new Event("change", { bubbles: true }));
        report.resume.status = "text_fallback";
        report.warnings.push("PDF attach unavailable — uploaded plain-text CV instead.");
      } else {
        report.resume.status = "skipped";
        report.resume.detail = "No CV content to upload";
      }
    } catch (err) {
      report.resume.status = "failed";
      report.resume.detail = err.message || "Upload failed";
      report.warnings.push("Résumé upload failed — use Export PDF and attach manually.");
    }
  } else {
    report.resume.status = "no_input";
  }

  report.summary = buildSummary(report);
  chrome.runtime.sendMessage({ type: "APPLICATION_SUBMITTED" });
  return report;
}

window.blitzWorkday = { scrapeJob, fillForm, scanFillReadiness };
