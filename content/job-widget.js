/**
 * Floating Blitz widget on supported job sites.
 */
(function () {
  if (window.__blitzJobWidget) return;

  const PAGE_TYPES = window.blitzPageContext?.PAGE_TYPES || {
    SINGLE_JOB: "single_job",
    JOB_LIST: "job_list",
    SEARCH: "search",
    PLATFORM: "platform",
    UNSUPPORTED: "unsupported",
  };

  let expanded = true;
  let pageContext = null;
  let jobData = null;
  let generating = false;
  let progressText = "";

  try {
    expanded = localStorage.getItem("blitz_widget_expanded") !== "0";
  } catch {
    expanded = true;
  }

  const host = document.createElement("div");
  host.id = "blitz-extension-widget-root";
  host.setAttribute("aria-hidden", "false");
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("content/job-widget.css");
  shadow.appendChild(styleLink);

  const wrap = document.createElement("div");
  wrap.className = "wrap";
  shadow.appendChild(wrap);

  const panel = document.createElement("div");
  panel.className = `panel ${expanded ? "" : "hidden"}`;
  panel.innerHTML = `
    <div class="header">
      <div class="brand"><span class="mark">B</span> Blitz</div>
      <button type="button" class="icon-btn" data-action="minimize" title="Minimize">−</button>
    </div>
    <div class="body">
      <span class="platform-pill" data-el="platform">—</span>
      <div class="status status-idle" data-el="status">Checking page…</div>
      <p class="hint" data-el="hint"></p>
      <p class="job-title hidden" data-el="title"></p>
      <p class="job-meta hidden" data-el="meta"></p>
      <div class="actions">
        <button type="button" class="btn btn-primary" data-action="generate" disabled>Tailor application</button>
        <button type="button" class="btn btn-secondary" data-action="open">Open Blitz</button>
        <button type="button" class="btn btn-secondary" data-action="refresh">Refresh detection</button>
      </div>
      <p class="progress" data-el="progress"></p>
    </div>
  `;
  wrap.appendChild(panel);

  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "fab";
  fab.innerHTML = '<span class="fab-dot idle" data-el="fab-dot"></span><span data-el="fab-label">Blitz</span>';
  wrap.appendChild(fab);

  const $ = (sel) => shadow.querySelector(sel);

  function setExpanded(open) {
    expanded = open;
    try {
      localStorage.setItem("blitz_widget_expanded", open ? "1" : "0");
    } catch {
      /* ignore */
    }
    panel.classList.toggle("hidden", !open);
    fab.classList.toggle("hidden", open);
  }

  function statusClass(ctx) {
    if (!ctx?.platform) return { cls: "status-idle", label: "Unsupported" };
    if (ctx.pageType === PAGE_TYPES.SINGLE_JOB) return { cls: "status-ready", label: "Ready" };
    if (ctx.pageType === PAGE_TYPES.JOB_LIST) {
      return ctx.hasPartialDetail
        ? { cls: "status-partial", label: "Select job" }
        : { cls: "status-list", label: "Job list" };
    }
    if (ctx.pageType === PAGE_TYPES.SEARCH) return { cls: "status-list", label: "Browse jobs" };
    return { cls: "status-idle", label: "Jobs site" };
  }

  function render() {
    const ctx = pageContext || window.blitzPageContext?.analyze?.();
    const status = statusClass(ctx);
    const statusEl = $('[data-el="status"]');
    statusEl.className = `status ${status.cls}`;
    statusEl.textContent = status.label;

    $('[data-el="platform"]').textContent = ctx?.platform || "—";
    $('[data-el="hint"]').textContent = ctx?.hint || "";

    const titleEl = $('[data-el="title"]');
    const metaEl = $('[data-el="meta"]');
    const hasJob = jobData?.jobTitle || jobData?.company;

    if (hasJob && ctx?.pageType === PAGE_TYPES.SINGLE_JOB) {
      titleEl.textContent = jobData.jobTitle || "Job listing";
      titleEl.classList.remove("hidden");
      metaEl.textContent = [jobData.company, jobData.externalApply ? "External apply" : null]
        .filter(Boolean)
        .join(" · ");
      metaEl.classList.toggle("hidden", !metaEl.textContent);
    } else {
      titleEl.classList.add("hidden");
      metaEl.classList.add("hidden");
    }

    const canGenerate =
      ctx?.canCapture &&
      jobData?.jobTitle &&
      !generating &&
      !jobData?.externalApply &&
      !(jobData?.platform === "linkedin" && jobData?.hasEasyApply === false);

    const genBtn = $('[data-action="generate"]');
    genBtn.disabled = !canGenerate;
    genBtn.textContent = generating ? "Generating…" : "Tailor application";

    $('[data-el="progress"]').textContent = progressText || "";

    const dot = $('[data-el="fab-dot"]');
    if (ctx?.pageType === PAGE_TYPES.SINGLE_JOB && hasJob) {
      dot.className = "fab-dot";
    } else if (ctx?.pageType === PAGE_TYPES.JOB_LIST) {
      dot.className = "fab-dot warn";
    } else {
      dot.className = "fab-dot idle";
    }

    $('[data-el="fab-label"]').textContent =
      ctx?.pageType === PAGE_TYPES.SINGLE_JOB && hasJob ? "Blitz · Ready" : "Blitz";
  }

  function update(ctx, job) {
    if (ctx) pageContext = ctx;
    if (job !== undefined) jobData = job?.error ? null : job;
    render();
  }

  async function refreshDetection() {
    progressText = "Detecting…";
    render();
    chrome.runtime.sendMessage({ type: "WIDGET_REFRESH_JOB" }, (res) => {
      progressText = "";
      if (res?.context) pageContext = res.context;
      if (res?.jobData && !res.jobData.error) jobData = res.jobData;
      else if (res?.error) progressText = res.error;
      render();
    });
  }

  fab.addEventListener("click", () => setExpanded(true));

  shadow.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (action === "minimize") {
      setExpanded(false);
      return;
    }
    if (action === "refresh") {
      refreshDetection();
      return;
    }
    if (action === "open") {
      chrome.runtime.sendMessage({ type: "OPEN_BLITZ" });
      return;
    }
    if (action === "generate") {
      if (!jobData) return;
      generating = true;
      progressText = "Starting…";
      render();
      chrome.runtime.sendMessage({ type: "WIDGET_GENERATE", payload: { jobData } }, (res) => {
        generating = false;
        if (chrome.runtime.lastError) {
          progressText = chrome.runtime.lastError.message;
        } else if (res?.error) {
          progressText = res.error;
        } else if (res?.ok) {
          progressText = "Done — open Blitz to review";
        }
        render();
      });
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "JOB_DETECTED") {
      jobData = msg.payload;
      if (!pageContext) pageContext = window.blitzPageContext?.analyze?.();
      if (pageContext) pageContext.canCapture = true;
      render();
    }
    if (msg.type === "GENERATION_PROGRESS") {
      generating = true;
      const p = msg.payload;
      progressText = p?.message || p?.stage || "Working…";
      if (p?.percent != null) progressText += ` ${p.percent}%`;
      render();
    }
    if (msg.type === "APPLICATION_READY") {
      generating = false;
      progressText = "Ready — open Blitz to review";
      render();
    }
    if (msg.type === "BLITZ_PAGE_STATE") {
      pageContext = msg.payload?.context || pageContext;
      if (msg.payload?.jobData !== undefined) jobData = msg.payload.jobData;
      render();
    }
  });

  function shouldShowWidget() {
    const platform = window.blitzPageContext?.detectPlatform?.();
    if (!platform) return false;
    const path = `${window.location.pathname}${window.location.search}`;
    if (platform === "linkedin") return path.includes("/jobs");
    if (platform === "indeed") {
      return /\/jobs|viewjob|\/viewjob/i.test(path) || /[?&]jk=/i.test(path);
    }
    if (platform === "greenhouse") {
      return /\/jobs|job_app|\/embed/i.test(path) || Boolean(document.querySelector(".job-description, h1.app-title"));
    }
    return true;
  }

  function init() {
    if (!shouldShowWidget()) {
      host.remove();
      return;
    }
    pageContext = window.blitzPageContext.analyze();
    render();
    if (!expanded) setExpanded(false);
    else setExpanded(true);
  }

  window.blitzJobWidget = { update, refresh: refreshDetection, setExpanded };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
