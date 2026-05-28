const h = window.blitzHumanise;
const jsonLd = window.blitzJobPostingJsonLd;

function companyFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 1 && parts[0] !== "apply") return parts[0];
  return "";
}

function isApplyPage() {
  return /\/apply\/?$/i.test(window.location.pathname) || Boolean(
    document.querySelector("#application-form, form[data-qa='application-form'], .application-form")
  );
}

function scrapeJob() {
  const ld = jsonLd?.parseJobPostingJsonLd?.();
  const company =
    ld?.hiringOrganization?.name ||
    document.querySelector('meta[property="og:site_name"]')?.content?.trim() ||
    companyFromPath() ||
    "";

  const jobTitle =
    document.querySelector("[data-qa='posting-name']")?.textContent?.trim() ||
    document.querySelector(".posting-headline h2")?.textContent?.trim() ||
    document.querySelector(".posting-headline")?.textContent?.trim() ||
    document.querySelector("h2")?.textContent?.trim() ||
    ld?.title ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const descEl =
    document.querySelector("[data-qa='job-description']") ||
    document.querySelector(".section.page .content") ||
    document.querySelector(".posting-page .content") ||
    document.querySelector(".content .section.page") ||
    document.querySelector(".posting .content");

  let jobDescription = descEl?.innerText?.trim() || "";
  if (!jobDescription && ld?.description) {
    jobDescription = jsonLd.stripHtml(ld.description);
  }

  const screeningQuestions = [];
  document.querySelectorAll("form label, [data-qa='application-form'] label").forEach((label) => {
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

  return {
    platform: "lever",
    jobTitle,
    company,
    jobDescription,
    url: window.location.href,
    screeningQuestions: [...new Set(screeningQuestions)],
    isApplyPage: isApplyPage(),
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

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fields = [];

  const nameInput = findInputByName(["name"]) || findInputByLabel(["full name", "your name"]);
  const emailInput = findInputByName(["email"]) || findInputByLabel(["email"]);
  const phoneInput = findInputByName(["phone"]) || findInputByLabel(["phone"]);

  if (userProfile?.name && nameInput) {
    fields.push({ element: nameInput, value: userProfile.name.trim() });
  }

  if (emailInput) fields.push({ element: emailInput, value: userProfile?.email || "" });
  if (phoneInput) fields.push({ element: phoneInput, value: userProfile?.phone || "" });

  const linkedIn =
    findInputByName(["urls[LinkedIn]", "urls[linkedin]"]) ||
    findInputByLabel(["linkedin"]);
  const github =
    findInputByName(["urls[GitHub]", "urls[Github]", "urls[github]"]) ||
    findInputByLabel(["github"]);
  const portfolio =
    findInputByName(["urls[Portfolio]", "urls[Website]"]) || findInputByLabel(["portfolio", "website"]);

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
    findInputByLabel(["cover letter", "additional information", "comments"]) ||
    document.querySelector('textarea[name*="cover"], textarea[name*="comments"]');
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
    document.querySelector('input[type="file"][name="resume"]') ||
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

window.blitzLever = { scrapeJob, fillForm, isApplyPage };
