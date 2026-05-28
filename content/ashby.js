const h = window.blitzHumanise;
const jsonLd = window.blitzJobPostingJsonLd;

function companyFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] || "";
}

function hasCrossOriginAshbyApplyIframe() {
  const iframe = document.querySelector('iframe[src*="ashbyhq.com"]');
  if (!iframe) return false;
  try {
    return !iframe.contentDocument;
  } catch {
    return true;
  }
}

function isApplicationView() {
  if (hasCrossOriginAshbyApplyIframe()) return false;
  return Boolean(
    document.querySelector(
      'form input[type="email"], form input[name*="email"], [data-testid*="application"] form'
    ) ||
      /application/i.test(window.location.hash) ||
      document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.match(/apply/i)
  );
}

function scrapeJob() {
  const ld = jsonLd?.parseJobPostingJsonLd?.();
  const embedOnly = hasCrossOriginAshbyApplyIframe();

  const company =
    ld?.hiringOrganization?.name ||
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    companyFromPath() ||
    "";

  const jobTitle =
    document.querySelector("h1")?.textContent?.trim() ||
    document.querySelector('[class*="JobPostingTitle"]')?.textContent?.trim() ||
    document.querySelector('[class*="jobPostingTitle"]')?.textContent?.trim() ||
    ld?.title ||
    document.title.split("|")[0]?.trim() ||
    "";

  const descEl =
    document.querySelector('[data-testid="job-description"]') ||
    document.querySelector('[class*="JobDescription"]') ||
    document.querySelector('[class*="job-description"]') ||
    document.querySelector("main article") ||
    document.querySelector("main");

  let jobDescription = descEl?.innerText?.trim() || "";
  if (!jobDescription && ld?.description) {
    jobDescription = jsonLd.stripHtml(ld.description);
  }

  const screeningQuestions = [];
  if (!embedOnly) {
    document.querySelectorAll("form label").forEach((label) => {
      const text = label.textContent?.trim();
      if (!text || text.length < 2 || text.length > 500) return;
      const forId = label.getAttribute("for");
      const input = forId
        ? document.getElementById(forId)
        : label.querySelector("input, select, textarea");
      if (!input || ["hidden", "submit", "button"].includes(input.type)) return;
      if (input.type === "file") return;
      screeningQuestions.push(text);
    });
  }

  return {
    platform: "ashby",
    jobTitle,
    company,
    jobDescription,
    url: window.location.href,
    screeningQuestions: [...new Set(screeningQuestions)],
    externalApply: embedOnly,
    ashbyEmbedOnly: embedOnly,
  };
}

function findInputByLabel(patterns) {
  const labels = document.querySelectorAll("label");
  for (const label of labels) {
    const text = label.textContent?.toLowerCase() || "";
    if (!patterns.some((p) => text.includes(p))) continue;
    const forId = label.getAttribute("for");
    if (forId) return document.getElementById(forId);
    return label.querySelector("input, textarea, select");
  }
  return null;
}

function findInputByName(names) {
  for (const name of names) {
    const el = document.querySelector(
      `input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`
    );
    if (el) return el;
  }
  return null;
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");
  if (hasCrossOriginAshbyApplyIframe()) {
    throw new Error(
      "Ashby application form is embedded in a cross-origin iframe. Open the job on jobs.ashbyhq.com to fill, or apply manually."
    );
  }

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fields = [];

  const firstName =
    findInputByLabel(["first name"]) ||
    findInputByName(["firstName", "first_name", "_systemfield_name_first"]);
  const lastName =
    findInputByLabel(["last name"]) ||
    findInputByName(["lastName", "last_name", "_systemfield_name_last"]);
  const email =
    findInputByLabel(["email"]) ||
    findInputByName(["email", "_systemfield_email"]);
  const phone =
    findInputByLabel(["phone"]) ||
    findInputByName(["phone", "_systemfield_phone"]);

  if (userProfile?.name) {
    const parts = userProfile.name.trim().split(/\s+/);
    if (firstName && parts[0]) fields.push({ element: firstName, value: parts[0] });
    if (lastName && parts.length > 1) {
      fields.push({ element: lastName, value: parts.slice(1).join(" ") });
    }
    if (!firstName && !lastName) {
      const full = findInputByName(["name", "fullName", "full_name"]);
      if (full) fields.push({ element: full, value: userProfile.name.trim() });
    }
  }

  if (email) fields.push({ element: email, value: userProfile?.email || "" });
  if (phone) fields.push({ element: phone, value: userProfile?.phone || "" });

  const linkedIn =
    findInputByLabel(["linkedin"]) ||
    findInputByName(["linkedin", "linkedinUrl", "urls[LinkedIn]"]);
  const github = findInputByLabel(["github"]) || findInputByName(["github", "githubUrl"]);
  const portfolio =
    findInputByLabel(["portfolio", "website"]) ||
    findInputByName(["portfolio", "website", "personalWebsite"]);

  if (linkedIn && userProfile?.linkedin) {
    fields.push({ element: linkedIn, value: userProfile.linkedin });
  }
  if (github && userProfile?.github) {
    fields.push({ element: github, value: userProfile.github });
  }
  if (portfolio && userProfile?.portfolio) {
    fields.push({ element: portfolio, value: userProfile.portfolio });
  }

  const coverEl =
    findInputByLabel(["cover letter", "additional"]) ||
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

window.blitzAshby = { scrapeJob, fillForm, hasCrossOriginAshbyApplyIframe };
