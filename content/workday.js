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
      return label.querySelector("input, textarea, select");
    }
  }
  return null;
}

async function clickApplyIfNeeded() {
  const applyBtn =
    queryDeep('[data-automation-id="applyButton"]') ||
    queryDeep('button[data-automation-id="adventureButton"]') ||
    [...queryDeepAll("button")].find((b) => /apply/i.test(b.textContent || ""));

  if (applyBtn) {
    await h.humanClick(applyBtn);
    await h.sleep(h.randomBetween(1500, 2500));
  }
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");

  await clickApplyIfNeeded();

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fields = [];

  const firstName = findInputByLabelDeep(["first name", "given name"]);
  const lastName = findInputByLabelDeep(["last name", "family name"]);
  const email = findInputByLabelDeep(["email"]);
  const phone = findInputByLabelDeep(["phone"]);

  if (userProfile?.name) {
    const parts = userProfile.name.trim().split(/\s+/);
    if (firstName && parts[0]) fields.push({ element: firstName, value: parts[0] });
    if (lastName && parts.length > 1) {
      fields.push({ element: lastName, value: parts.slice(1).join(" ") });
    }
  }
  if (email) fields.push({ element: email, value: userProfile?.email || "" });
  if (phone) fields.push({ element: phone, value: userProfile?.phone || "" });

  const coverEl = findInputByLabelDeep(["cover letter", "letter", "message"]);
  if (coverEl && coverLetter) fields.push({ element: coverEl, value: coverLetter });

  await h.staggeredFill(fields);

  if (screeningAnswers?.length) {
    for (const { question, answer } of screeningAnswers) {
      const qLower = question.toLowerCase();
      const label = queryDeepAll("label").find((l) =>
        l.textContent?.toLowerCase().includes(qLower.slice(0, 30))
      );
      if (!label) continue;
      const input =
        label.querySelector("input, select, textarea") ||
        queryDeep(`#${CSS.escape(label.getAttribute("for") || "")}`);
      if (!input) continue;
      if (input.tagName === "SELECT") await h.humanSelect(input, answer);
      else await h.humanType(input, answer);
      await h.sleep(h.randomBetween(400, 900));
    }
  }

  const fileInputs = queryDeepAll('input[type="file"]');
  const resumeInput =
    fileInputs.find((i) => /resume|cv/i.test(i.getAttribute("data-automation-id") || i.name || "")) ||
    fileInputs[0];

  if (resumeInput) {
    if (pdfBase64 && window.blitzFileUpload) {
      window.blitzFileUpload.attachBase64ToInput(resumeInput, pdfBase64, "CV.pdf", "application/pdf");
    } else if (tailoredCV) {
      const blob = new Blob([tailoredCV], { type: "text/plain" });
      const dt = new DataTransfer();
      dt.items.add(new File([blob], "CV.txt", { type: "text/plain" }));
      resumeInput.files = dt.files;
      resumeInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  chrome.runtime.sendMessage({ type: "APPLICATION_SUBMITTED" });
}

window.blitzWorkday = { scrapeJob, fillForm };
