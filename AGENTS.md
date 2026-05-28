# Agent guide (Blitz)

Instructions for AI coding agents and automated contributors working in this repository.

## Project summary

Blitz is a **Chrome Extension (MV3)** that tailors CV/cover letter using the user's own AI API key (BYOK), shows a review UI, then performs human-like form fill on supported job boards.

## Repository layout

| Path | Purpose |
|------|---------|
| `background/` | Service worker — **all AI API calls** |
| `content/` | Platform detectors + form fill (after user approval) |
| `popup/` | React 18 UI (Vite → `popup/dist/`) |
| `offscreen/` | PDF generation (vendored jsPDF, html2canvas) |
| `license-worker/` | Cloudflare Worker for Pro license validation |
| `scripts/` | Build, validate, pack, version bump |
| `docs/` | Architecture and feature docs |

## Hard rules

1. **Minimize diff scope** — no unrelated refactors.
2. **ES modules** everywhere; React 18 functional components + hooks only.
3. **AI calls only** in `background/service-worker.js` — never popup or content scripts.
4. **Storage** via `popup/src/lib/storage.js` — not raw `chrome.storage` in components.
5. **IndexedDB** via `popup/src/lib/db.js`.
6. **Never log** API keys, CV text, or PII.
7. **No remote scripts** in extension pages (MV3 CSP); vendor PDF libs under `offscreen/`.
8. Content scripts: scrape/detect on load; **fill only** after `FILL_FORM` message.

## Commands (from repo root)

```bash
npm run build        # production build
npm run build:check  # build + validate (CI)
npm run dev          # watch UI
npm run validate     # asset check
npm run pack         # store zip
npm run test         # validate + optional license API smoke test
```

## Platforms

Greenhouse, LinkedIn Easy Apply, Indeed (native), Workday (best-effort), Lever, Ashby. External Indeed / Ashby embed: tailor + PDF export (no auto-fill).

## Feature index (keep in sync)

See `.cursor/rules/features-architecture.mdc` for the full table. Product roadmap: `docs/ROADMAP_H1_2026.md`. Major areas:

- **Full workspace** — `dashboard.html` / `npm run web:dev`; `SiteShell`, `fullPage` layouts
- **On-page widget** — `content/job-widget.js` + `page-context.js`
- **Open job tabs** — `WorkspaceTabJobs.jsx` + `background/tab-jobs.js` (`LIST_JOB_TABS`, `ADD_TABS_TO_QUEUE`)
- **CV HTML → PDF** — template editor, `cv-export.js`, offscreen html2canvas + jsPDF (`docs/CV_HTML_PDF.md`)
- **Bulk queue** — `JobQueue.jsx` + `queue-processor.js`

**When you add or change a feature**, follow `.cursor/rules/maintain-cursor-rules.mdc` (update feature table, layer rules, and `docs/ARCHITECTURE.md` as needed).

## Pull request checklist

- [ ] `npm run build:check` passes
- [ ] No secrets or PII in logs or commits
- [ ] AI/network logic stays in background worker
- [ ] Manifest paths reference `popup/dist/` only (post-build)
- [ ] If feature/architecture changed: updated `.cursor/rules/` (see `maintain-cursor-rules.mdc`) and `docs/ARCHITECTURE.md` when non-trivial

See [CONTRIBUTING.md](CONTRIBUTING.md) for human contributors.
