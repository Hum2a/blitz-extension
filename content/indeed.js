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

function scrapeJob() {
  const jobTitle =
    document.querySelector("h1.jobsearch-JobInfoHeader-title")?.textContent?.trim() ||
    document.querySelector("[data-testid='jobsearch-JobInfoHeader-title']")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const company =
    document.querySelector("[data-company-name]")?.getAttribute("data-company-name") ||
    document.querySelector(".jobsearch-InlineCompanyRating a")?.textContent?.trim() ||
    document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() ||
    "";

  const descEl =
    document.querySelector("#jobDescriptionText") ||
    document.querySelector(".jobsearch-JobComponent-description");
  const jobDescription = descEl?.innerText?.trim() || "";

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
