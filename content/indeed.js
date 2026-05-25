const h = window.blitzHumanise;

function isExternalApply() {
  return Boolean(
    document.querySelector('a[aria-label*="Apply on company site"]') ||
      document.querySelector('a[aria-label*="company site"]') ||
      [...document.querySelectorAll("button, a")].some((el) =>
        /apply on company site/i.test(el.textContent || "")
      )
  );
}

function getIndeedCompany() {
  const byTestId = document.querySelector('[data-testid="inlineHeader-companyName"]');
  if (byTestId?.textContent?.trim()) {
    return byTestId.textContent.trim();
  }

  const compContainer = document.querySelector('[data-testid="jobsearch-CompanyInfoContainer"]');
  if (compContainer) {
    const nameEl =
      compContainer.querySelector('[data-testid="companyName"]') ||
      compContainer.querySelector("a") ||
      compContainer.querySelector("span");
    if (nameEl?.textContent?.trim()) return nameEl.textContent.trim();
  }

  const ratingLink = document.querySelector(".jobsearch-InlineCompanyRating a");
  if (ratingLink?.textContent?.trim()) {
    return ratingLink.textContent.trim();
  }

  const dataEl = document.querySelector("[data-company-name]");
  if (dataEl) {
    const attr = dataEl.getAttribute("data-company-name");
    if (attr && attr !== "true" && attr !== "false") return attr.trim();
    const text = dataEl.textContent?.trim();
    if (text) return text;
  }

  const og = document.querySelector('meta[property="og:site_name"]');
  if (og?.content && !/indeed/i.test(og.content)) return og.content.trim();

  return "";
}

function firstText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return "";
}

function getIndeedJobTitle() {
  return firstText([
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '[data-testid="jobsearch-JobInfoHeader-title"] span',
    '[data-testid="job-title"]',
    "h1.jobsearch-JobInfoHeader-title",
    ".jobsearch-JobInfoHeader-title",
    "#jobsearch-JobInfoHeader-title",
    "#ia-JobHeader-title",
    "main h1",
    "h1",
  ]);
}

function scrapeJob() {
  const jobTitle = getIndeedJobTitle();
  const company = getIndeedCompany();

  const descEl =
    document.querySelector("#jobDescriptionText") ||
    document.querySelector('[data-testid="jobDescriptionText"]') ||
    document.querySelector('[data-testid="jobsearch-JobDescription"]') ||
    document.querySelector(".jobsearch-JobComponent-description") ||
    document.querySelector("#job-details") ||
    document.querySelector('[id="jobDescriptionText"]');
  let jobDescription = descEl?.innerText?.trim() || "";

  if (!jobDescription && /smartapply\./i.test(window.location.hostname)) {
    jobDescription = firstText([
      '[data-testid="job-description"]',
      ".ia-JobDescription",
      "#ia-JobDescription",
    ]);
  }

  const externalApply = isExternalApply();

  const screeningQuestions = [];
  if (!externalApply) {
    document.querySelectorAll("form label, [data-testid*='question'] label").forEach((label) => {
      const text = label.textContent?.trim();
      if (text && text.length > 2 && text.length < 500) screeningQuestions.push(text);
    });
  }

  return {
    platform: "indeed",
    jobTitle,
    company,
    jobDescription,
    url: window.location.href,
    applyType: externalApply ? "external" : "native",
    externalApply,
    screeningQuestions: [...new Set(screeningQuestions)],
  };
}

function findInputByLabel(patterns) {
  for (const label of document.querySelectorAll("label")) {
    const text = label.textContent?.toLowerCase() || "";
    if (patterns.some((p) => text.includes(p))) {
      const forId = label.getAttribute("for");
      if (forId) return document.getElementById(forId);
      return label.querySelector("input, textarea, select");
    }
  }
  return null;
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");
  if (isExternalApply()) {
    throw new Error(
      "This job redirects to the company site. Blitz cannot fill external applications."
    );
  }

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fields = [];

  const nameInput = findInputByLabel(["full name", "name"]);
  const email = findInputByLabel(["email"]);
  const phone = findInputByLabel(["phone"]);

  if (nameInput && userProfile?.name) fields.push({ element: nameInput, value: userProfile.name });
  if (email) fields.push({ element: email, value: userProfile?.email || "" });
  if (phone) fields.push({ element: phone, value: userProfile?.phone || "" });

  const coverEl = findInputByLabel(["cover letter", "message"]);
  if (coverEl && coverLetter) fields.push({ element: coverEl, value: coverLetter });

  await h.staggeredFill(fields);

  if (screeningAnswers?.length) {
    for (const { question, answer } of screeningAnswers) {
      const qLower = question.toLowerCase();
      const label = [...document.querySelectorAll("label")].find((l) =>
        l.textContent?.toLowerCase().includes(qLower.slice(0, 30))
      );
      if (!label) continue;
      const forId = label.getAttribute("for");
      const input = forId
        ? document.getElementById(forId)
        : label.querySelector("input, select, textarea");
      if (!input) continue;
      if (input.tagName === "SELECT") await h.humanSelect(input, answer);
      else await h.humanType(input, answer);
      await h.sleep(h.randomBetween(400, 900));
    }
  }

  const resumeInput =
    document.querySelector('input[type="file"][accept*="pdf"]') ||
    document.querySelector('input[type="file"]');

  if (resumeInput) {
    if (pdfBase64 && window.blitzFileUpload) {
      window.blitzFileUpload.attachBase64ToInput(
        resumeInput,
        pdfBase64,
        "CV.pdf",
        "application/pdf"
      );
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

window.blitzIndeed = { scrapeJob, fillForm };
