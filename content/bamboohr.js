const h = window.blitzHumanise;

function scrapeJob() {
  const titleEl =
    document.querySelector(".BambooRichText h2") ||
    document.querySelector('[data-fabric-component="Heading"]') ||
    document.querySelector("h1");

  const descEl =
    document.querySelector(".jss-g0") ||
    document.querySelector('[data-fabric-component="Box"] .BambooRichText') ||
    document.querySelector(".jobDescription");

  const jobTitle = titleEl?.textContent?.trim() || "";
  const jobDescription = descEl?.innerText?.trim() || "";

  let company = "";
  const ogSite = document.querySelector('meta[property="og:site_name"]');
  if (ogSite?.content) company = ogSite.content;
  if (!company) {
    const hostParts = window.location.hostname.split(".");
    company = hostParts[0] || "";
  }

  const screeningQuestions = [];
  document.querySelectorAll("label").forEach((label) => {
    const text = label.textContent?.trim();
    if (text && text.length > 2 && text.length < 500) screeningQuestions.push(text);
  });

  return {
    platform: "bamboohr",
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
      if (forId) {
        const byId = document.getElementById(forId);
        if (byId) return byId;
      }
      return label.querySelector("input, textarea, select");
    }
  }
  return null;
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");

  const { tailoredCV, coverLetter, screeningAnswers, userProfile, pdfBase64 } = payload;
  const fields = [];

  const firstName = findInputByLabel(["first name", "given name"]);
  const lastName = findInputByLabel(["last name", "family name"]);
  const email = findInputByLabel(["email"]);
  const phone = findInputByLabel(["phone", "mobile"]);

  if (userProfile?.name) {
    const parts = userProfile.name.trim().split(/\s+/);
    if (firstName && parts[0]) fields.push({ element: firstName, value: parts[0] });
    if (lastName && parts.length > 1) {
      fields.push({ element: lastName, value: parts.slice(1).join(" ") });
    }
  }
  if (email) fields.push({ element: email, value: userProfile?.email || "" });
  if (phone) fields.push({ element: phone, value: userProfile?.phone || "" });

  const coverEl = findInputByLabel(["cover letter", "letter", "message"]);
  if (coverEl && coverLetter) fields.push({ element: coverEl, value: coverLetter });

  await h.staggeredFill(fields);

  if (screeningAnswers?.length) {
    for (const { question, answer } of screeningAnswers) {
      const qLower = question.toLowerCase();
      const label = [...document.querySelectorAll("label")].find((l) =>
        l.textContent?.toLowerCase().includes(qLower.slice(0, 30))
      );
      if (!label) continue;
      const input =
        label.querySelector("input, select, textarea") ||
        document.getElementById(label.getAttribute("for") || "");
      if (!input) continue;
      if (input.tagName === "SELECT") await h.humanSelect(input, answer);
      else await h.humanType(input, answer);
      await h.sleep(h.randomBetween(400, 900));
    }
  }

  const resumeInput =
    document.querySelector('input[type="file"][name*="resume"]') ||
    document.querySelector('input[type="file"]');

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

window.blitzBamboohr = { scrapeJob, fillForm };
