const h = window.blitzHumanise;

function scrapeJob() {
  const jobTitle =
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__job-title")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name a")?.textContent?.trim() ||
    "";

  const descEl =
    document.querySelector("#job-details") ||
    document.querySelector(".jobs-description__content") ||
    document.querySelector(".jobs-box__html-content");
  const jobDescription = descEl?.innerText?.trim() || "";

  const hasEasyApply = Boolean(
    document.querySelector("button.jobs-apply-button") ||
      document.querySelector(".jobs-apply-button")
  );

  return {
    platform: "linkedin",
    jobTitle,
    company,
    jobDescription,
    url: window.location.href,
    hasEasyApply,
    screeningQuestions: [],
  };
}

function getModalRoot() {
  return (
    document.querySelector(".jobs-easy-apply-modal") ||
    document.querySelector('[data-test-modal-id="easy-apply-modal"]') ||
    document.querySelector('[role="dialog"]')
  );
}

function getVisibleInputs(root) {
  return [...root.querySelectorAll("input, textarea, select")].filter((el) => {
    if (el.type === "hidden" || el.disabled) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function labelForInput(input, root) {
  const id = input.id;
  if (id) {
    const label = root.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent.trim();
  }
  const parentLabel = input.closest("label");
  if (parentLabel) return parentLabel.textContent.trim();
  return input.getAttribute("aria-label") || input.name || input.placeholder || "";
}

function findAnswerForLabel(labelText, screeningAnswers) {
  if (!screeningAnswers?.length) return null;
  const lower = labelText.toLowerCase();
  return screeningAnswers.find((a) => {
    const q = (a.question || "").toLowerCase();
    return lower.includes(q.slice(0, 20)) || q.includes(lower.slice(0, 20));
  });
}

async function fillVisibleStep(root, payload) {
  const { screeningAnswers, userProfile, coverLetter, tailoredCV, pdfBase64 } = payload;
  const inputs = getVisibleInputs(root);

  for (const input of inputs) {
    const label = labelForInput(input, root);
    const labelLower = label.toLowerCase();
    let value = null;

    const matched = findAnswerForLabel(label, screeningAnswers);
    if (matched) value = matched.answer;

    if (!value && labelLower.includes("email")) value = userProfile?.email;
    if (!value && labelLower.includes("phone")) value = userProfile?.phone;
    if (!value && (labelLower.includes("first name") || labelLower.includes("given name"))) {
      value = userProfile?.name?.split(/\s+/)[0];
    }
    if (!value && labelLower.includes("last name")) {
      const parts = userProfile?.name?.split(/\s+/) || [];
      value = parts.length > 1 ? parts.slice(1).join(" ") : "";
    }
    if (!value && (labelLower.includes("cover letter") || labelLower.includes("message"))) {
      value = coverLetter;
    }

    if (input.type === "file") {
      if (pdfBase64 && window.blitzFileUpload) {
        window.blitzFileUpload.attachBase64ToInput(
          input,
          pdfBase64,
          "CV.pdf",
          "application/pdf"
        );
      } else if (tailoredCV && window.blitzFileUpload) {
        const blob = new Blob([tailoredCV], { type: "text/plain" });
        const dt = new DataTransfer();
        dt.items.add(new File([blob], "CV.txt", { type: "text/plain" }));
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await h.sleep(h.randomBetween(400, 800));
      continue;
    }

    if (input.tagName === "SELECT" && value) {
      const option = [...input.options].find(
        (o) =>
          o.text.toLowerCase().includes(String(value).toLowerCase()) ||
          o.value.toLowerCase() === String(value).toLowerCase()
      );
      if (option) await h.humanSelect(input, option.value);
      continue;
    }

    if (input.type === "radio" && value) {
      const name = input.name;
      const group = root.querySelectorAll(`input[type="radio"][name="${name}"]`);
      for (const radio of group) {
        const rLabel = labelForInput(radio, root).toLowerCase();
        if (rLabel.includes(String(value).toLowerCase().slice(0, 15))) {
          await h.humanClick(radio);
          break;
        }
      }
      continue;
    }

    if ((input.type === "text" || input.type === "number" || input.tagName === "TEXTAREA") && value) {
      await h.humanType(input, String(value));
      await h.sleep(h.randomBetween(300, 700));
    }
  }
}

async function clickNextOrReview(root) {
  const buttons = [...root.querySelectorAll("button")];
  const next = buttons.find((b) => {
    const t = b.textContent?.trim().toLowerCase() || "";
    const aria = b.getAttribute("aria-label")?.toLowerCase() || "";
    return (
      t === "next" ||
      t === "review" ||
      t === "submit application" ||
      aria.includes("continue to next") ||
      aria.includes("review your application")
    );
  });
  if (next && !next.disabled) {
    await h.humanClick(next);
    await h.sleep(h.randomBetween(800, 1500));
    return true;
  }
  return false;
}

async function fillForm(payload) {
  if (!h) throw new Error("Humanise utilities not loaded");

  const easyApplyBtn =
    document.querySelector("button.jobs-apply-button") ||
    document.querySelector(".jobs-apply-button");
  if (!easyApplyBtn) {
    throw new Error("Easy Apply button not found on this listing.");
  }

  await h.humanClick(easyApplyBtn);
  await h.sleep(h.randomBetween(1000, 2000));

  const maxSteps = 12;
  for (let step = 0; step < maxSteps; step++) {
    const root = getModalRoot();
    if (!root) throw new Error("Easy Apply modal did not open.");

    await fillVisibleStep(root, payload);

    const submitBtn = [...root.querySelectorAll("button")].find((b) =>
      b.textContent?.trim().toLowerCase().includes("submit application")
    );
    if (submitBtn && payload.autoSubmit) {
      await h.humanClick(submitBtn);
      break;
    }

    const progressed = await clickNextOrReview(root);
    if (!progressed) break;

    await h.sleep(h.randomBetween(600, 1200));
  }

  chrome.runtime.sendMessage({ type: "APPLICATION_SUBMITTED" });
}

window.blitzLinkedin = { scrapeJob, fillForm };
