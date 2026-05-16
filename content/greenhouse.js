const h = window.blitzHumanise;

function scrapeJob() {
  const jobTitle =
    document.querySelector("h1.app-title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  let company = "";
  const ogSite = document.querySelector('meta[property="og:site_name"]');
  if (ogSite) company = ogSite.content;
  if (!company) {
    const titleParts = document.title.split("|").map((s) => s.trim());
    company = titleParts.length > 1 ? titleParts[titleParts.length - 1] : titleParts[0];
  }

  const descEl =
    document.querySelector("#content .job-description") ||
    document.querySelector(".job-description") ||
    document.querySelector("#content");
  const jobDescription = descEl?.innerText?.trim() || "";

  const screeningQuestions = [];
  document.querySelectorAll("form label").forEach((label) => {
    const text = label.textContent?.trim();
    if (text && text.length > 2 && text.length < 500) {
      const forId = label.getAttribute("for");
      const input = forId
        ? document.getElementById(forId)
        : label.querySelector("input, select, textarea");
      if (input && !["hidden", "submit", "file"].includes(input.type)) {
        screeningQuestions.push(text);
      }
    }
  });

  return {
    platform: "greenhouse",
    jobTitle,
    company,
    jobDescription,
    url: window.location.href,
    screeningQuestions: [...new Set(screeningQuestions)],
  };
}

function findInputByLabel(patterns) {
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    const text = label.textContent?.toLowerCase() || "";
    if (patterns.some((p) => text.includes(p))) {
      const forId = label.getAttribute("for");
      if (forId) return document.getElementById(forId);
      return label.querySelector("input, textarea, select");
    }
  }
  return null;
}

function findInputByName(names) {
  for (const name of names) {
    const el = document.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
    if (el) return el;
  }
  return null;
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fields = [];

  const firstName =
    findInputByLabel(["first name"]) ||
    findInputByName(["first_name", "job_application[first_name]"]);
  const lastName =
    findInputByLabel(["last name"]) ||
    findInputByName(["last_name", "job_application[last_name]"]);
  const email =
    findInputByLabel(["email"]) ||
    findInputByName(["email", "job_application[email]"]);
  const phone =
    findInputByLabel(["phone"]) ||
    findInputByName(["phone", "job_application[phone]"]);

  if (userProfile?.name) {
    const parts = userProfile.name.trim().split(/\s+/);
    if (firstName && parts[0]) fields.push({ element: firstName, value: parts[0] });
    if (lastName && parts.length > 1) {
      fields.push({ element: lastName, value: parts.slice(1).join(" ") });
    }
  }

  if (email) fields.push({ element: email, value: userProfile?.email || "" });
  if (phone) fields.push({ element: phone, value: userProfile?.phone || "" });

  const coverEl =
    findInputByLabel(["cover letter", "letter"]) ||
    document.querySelector('textarea[name*="cover"]');
  if (coverEl && coverLetter) {
    fields.push({ element: coverEl, value: coverLetter });
  }

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

      if (input.tagName === "SELECT") {
        await h.humanSelect(input, answer);
      } else {
        await h.humanType(input, answer);
      }
      await h.sleep(h.randomBetween(400, 900));
    }
  }

  const resumeInput =
    document.querySelector('input[type="file"][name*="resume"]') ||
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

window.blitzGreenhouse = { scrapeJob, fillForm };
