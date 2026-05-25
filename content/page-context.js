/**
 * Detect whether the user is on a single job listing, a multi-job list, or search.
 * Exposed as window.blitzPageContext
 */
(function () {
  const PAGE_TYPES = {
    SINGLE_JOB: "single_job",
    JOB_LIST: "job_list",
    SEARCH: "search",
    PLATFORM: "platform",
    UNSUPPORTED: "unsupported",
  };

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("greenhouse.io")) return "greenhouse";
    if (host.includes("linkedin.com")) return "linkedin";
    if (host.includes("indeed.com") || host.includes("indeed.co.uk")) return "indeed";
    if (host.includes("myworkdayjobs.com")) return "workday";
    return null;
  }

  function countElements(selectors) {
    let n = 0;
    for (const sel of selectors) {
      n += document.querySelectorAll(sel).length;
    }
    return n;
  }

  function hasAny(selectors) {
    return selectors.some((sel) => document.querySelector(sel));
  }

  function linkedinContext(path) {
    const onJobView = /\/jobs\/view\/\d+/i.test(path);
    const onSearch =
      /\/jobs\/search/i.test(path) ||
      /\/jobs\/collections/i.test(path) ||
      path === "/jobs/" ||
      path.startsWith("/jobs?");

    const detailTitle = hasAny([
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      ".jobs-details__main-content h1",
    ]);

    const detailDesc = hasAny([
      "#job-details",
      ".jobs-description__content",
      ".jobs-box__html-content",
    ]);

    const listItems = countElements([
      ".jobs-search-results__list-item",
      ".scaffold-layout__list-item",
      "li.jobs-search-results__list-item",
      "[data-job-id]",
    ]);

    const activeListItem = document.querySelector(
      ".jobs-search-results__list-item--active, .job-card-container--selected, [aria-current='page'].job-card-list__title"
    );

    if (onJobView || (detailTitle && detailDesc)) {
      return {
        pageType: PAGE_TYPES.SINGLE_JOB,
        confidence: onJobView ? "high" : "medium",
        hint: onJobView ? "Job posting page" : "Job details loaded",
        listingCount: listItems || undefined,
      };
    }

    if (onSearch || listItems > 0) {
      if (detailTitle && !detailDesc) {
        return {
          pageType: PAGE_TYPES.JOB_LIST,
          confidence: "medium",
          hint: "Select a job to load full details",
          listingCount: listItems,
          hasPartialDetail: true,
        };
      }
      if (activeListItem || (detailTitle && listItems > 0)) {
        return {
          pageType: PAGE_TYPES.SINGLE_JOB,
          confidence: "medium",
          hint: "Job selected from list — details in panel",
          listingCount: listItems,
          variant: "split_view",
        };
      }
      return {
        pageType: PAGE_TYPES.JOB_LIST,
        confidence: "high",
        hint: `${listItems || "Multiple"} listings — open or select one`,
        listingCount: listItems,
      };
    }

    if (path.includes("/jobs")) {
      return {
        pageType: PAGE_TYPES.SEARCH,
        confidence: "low",
        hint: "LinkedIn Jobs — open a job listing",
      };
    }

    return { pageType: PAGE_TYPES.PLATFORM, confidence: "low", hint: "LinkedIn" };
  }

  function isIndeedSmartApplyHost() {
    return /smartapply\./i.test(window.location.hostname);
  }

  function indeedContext(path) {
    if (isIndeedSmartApplyHost()) {
      const onApplyForm = hasAny([
        'form[action*="indeedapply"]',
        'input[type="file"]',
        '[data-testid*="apply"]',
        "#ia-container",
      ]);
      if (onApplyForm || /indeedapply|\/beta\//i.test(path)) {
        return {
          pageType: PAGE_TYPES.SINGLE_JOB,
          confidence: "high",
          hint: "Indeed application — open Blitz to fill",
          variant: "apply_flow",
        };
      }
    }

    const onViewJob =
      /viewjob/i.test(path) ||
      /\/rc\/clk/i.test(path) ||
      /[?&]jk=/i.test(path) ||
      /[?&]vjk=/i.test(path);

    const hasDesc = hasAny([
      "#jobDescriptionText",
      '[data-testid="jobDescriptionText"]',
      '[data-testid="jobsearch-JobDescription"]',
      ".jobsearch-JobComponent-description",
      "#job-details",
      '[id="jobDescriptionText"]',
    ]);

    const hasTitle = hasAny([
      "h1.jobsearch-JobInfoHeader-title",
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      '[data-testid="job-title"]',
      ".jobsearch-JobInfoHeader-title",
      "#jobsearch-JobInfoHeader-title",
    ]);

    const listCards = countElements([
      ".job_seen_beacon",
      '[data-testid="slider_item"]',
      ".jobsearch-ResultsList li",
      "[data-jk]",
      '[data-testid="job-card"]',
    ]);

    const isSearchUrl = /\/jobs\b/i.test(path) || /[?&]q=/i.test(path);
    const vjkSelected = /[?&]vjk=/i.test(path);

    if (onViewJob && (hasDesc || hasTitle)) {
      return {
        pageType: PAGE_TYPES.SINGLE_JOB,
        confidence: "high",
        hint: "Indeed job posting",
        listingCount: listCards || undefined,
      };
    }

    if (isSearchUrl || listCards > 0) {
      if (hasTitle && (hasDesc || vjkSelected)) {
        return {
          pageType: PAGE_TYPES.SINGLE_JOB,
          confidence: vjkSelected ? "high" : "medium",
          hint: "Job selected in split view",
          listingCount: listCards,
          variant: "split_view",
        };
      }
      if (hasTitle && !hasDesc) {
        return {
          pageType: PAGE_TYPES.JOB_LIST,
          confidence: "medium",
          hint: "Select a job to view description",
          listingCount: listCards,
          hasPartialDetail: true,
        };
      }
      if (listCards > 0) {
        return {
          pageType: PAGE_TYPES.JOB_LIST,
          confidence: "high",
          hint: "Indeed search results — click a job",
          listingCount: listCards,
        };
      }
    }

    if (hasTitle || hasDesc) {
      return {
        pageType: PAGE_TYPES.SINGLE_JOB,
        confidence: "medium",
        hint: "Indeed job page",
      };
    }

    return {
      pageType: PAGE_TYPES.PLATFORM,
      confidence: "low",
      hint: "Indeed — open a job posting",
    };
  }

  function greenhouseContext(path) {
    const singleJob = hasAny([
      "h1.app-title",
      ".job-description",
      "#application_form",
      "form[action*='apply']",
    ]);

    const jobLinks = countElements([
      'a[href*="/jobs/"]',
      ".opening a",
      "table#board tbody tr a",
    ]);

    if (singleJob) {
      return {
        pageType: PAGE_TYPES.SINGLE_JOB,
        confidence: "high",
        hint: "Greenhouse job posting",
      };
    }

    if (jobLinks > 2 || /\/jobs\/?$/i.test(path)) {
      return {
        pageType: PAGE_TYPES.JOB_LIST,
        confidence: "medium",
        hint: "Job board — open a role",
        listingCount: jobLinks,
      };
    }

    return { pageType: PAGE_TYPES.PLATFORM, confidence: "low", hint: "Greenhouse" };
  }

  function workdayContext(path) {
    const singleJob = hasAny([
      '[data-automation-id="jobPostingHeader"]',
      '[data-automation-id="jobPostingDescription"]',
    ]) || /\/job\//i.test(path);

    const postings = countElements([
      '[data-automation-id="jobTitle"]',
      'a[data-automation-id="jobTitle"]',
      '[data-automation-id="promptTitle"]',
    ]);

    if (singleJob) {
      return {
        pageType: PAGE_TYPES.SINGLE_JOB,
        confidence: /\/job\//i.test(path) ? "high" : "medium",
        hint: "Workday job posting",
        listingCount: postings || undefined,
      };
    }

    if (postings > 1) {
      return {
        pageType: PAGE_TYPES.JOB_LIST,
        confidence: "high",
        hint: "Multiple openings — select a job",
        listingCount: postings,
      };
    }

    return { pageType: PAGE_TYPES.PLATFORM, confidence: "low", hint: "Workday careers" };
  }

  function analyze() {
    const platform = detectPlatform();
    const path = `${window.location.pathname}${window.location.search}`;
    const url = window.location.href;

    if (!platform) {
      return {
        platform: null,
        pageType: PAGE_TYPES.UNSUPPORTED,
        confidence: "none",
        hint: "This site is not supported yet",
        url,
        path,
      };
    }

    let ctx;
    switch (platform) {
      case "linkedin":
        ctx = linkedinContext(path);
        break;
      case "indeed":
        ctx = indeedContext(path);
        break;
      case "greenhouse":
        ctx = greenhouseContext(path);
        break;
      case "workday":
        ctx = workdayContext(path);
        break;
      default:
        ctx = { pageType: PAGE_TYPES.UNSUPPORTED, confidence: "none", hint: "" };
    }

    return {
      platform,
      url,
      path,
      ...ctx,
      canCapture: ctx.pageType === PAGE_TYPES.SINGLE_JOB,
      timestamp: Date.now(),
    };
  }

  function watchSpaNavigation(callback) {
    if (window.__blitzSpaWatch) return;
    window.__blitzSpaWatch = true;
    let lastHref = location.href;
    const tick = () => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      try {
        callback();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("popstate", tick);
    const wrap = (fn) =>
      function (...args) {
        const out = fn.apply(this, args);
        tick();
        return out;
      };
    try {
      history.pushState = wrap(history.pushState);
      history.replaceState = wrap(history.replaceState);
    } catch {
      /* ignore */
    }
    setInterval(tick, 1200);
  }

  window.blitzPageContext = {
    PAGE_TYPES,
    detectPlatform,
    analyze,
    watchSpaNavigation,
    isJobListingPage(platform) {
      const ctx = analyze();
      if (platform && ctx.platform !== platform) return false;
      return ctx.pageType === PAGE_TYPES.SINGLE_JOB;
    },
  };
})();
