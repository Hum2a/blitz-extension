export const SITE_VIEWS = {
  dashboard: {
    id: "dashboard",
    label: "Workspace",
    title: "Workspace",
    subtitle: "Detect jobs from your browser tab, generate tailored applications, and track progress.",
  },
  review: {
    id: "review",
    label: "Review",
    title: "Review application",
    subtitle: "Edit your tailored CV and cover letter before approving and filling the form.",
  },
  queue: {
    id: "queue",
    label: "Queue",
    title: "Job queue",
    subtitle: "Paste multiple job URLs and let Blitz generate applications in the background.",
  },
  history: {
    id: "history",
    label: "History",
    title: "Application history",
    subtitle: "Every role you applied to through Blitz — snapshots, status, and notes.",
  },
  settings: {
    id: "settings",
    label: "Settings",
    title: "Settings",
    subtitle: "CV, profile, API keys, license, and generation preferences.",
  },
};

export const SITE_NAV_ORDER = ["dashboard", "queue", "history", "settings"];
