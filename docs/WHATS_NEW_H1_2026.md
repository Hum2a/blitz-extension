# What’s new in Blitz (H1 2026)

User-facing summary of features shipped in **Phases 2–4** of the [H1 2026 roadmap](ROADMAP_H1_2026.md). For architecture and message flows, see [ARCHITECTURE.md](ARCHITECTURE.md).

**Last updated:** May 2026 · Extension ~1.2.x

---

## Quick start after pulling these changes

1. **`npm run build`** and reload the extension in `chrome://extensions` (new permissions: notifications, BambooHR hosts, Gemini/OpenRouter APIs).
2. **Sign in + sync** if you use cloud backup — queue and pending job now sync E2EE when unlocked.
3. **Supabase (ops):** apply migrations **`008`** (security) and **`009`** (admin platform telemetry) if not already on production — `npm run db:migrate` or your usual deploy path.
4. **Optional:** `npm run test:e2e:install` once, then `npm run test:e2e` for smoke tests.

---

## Phase 2 — Product parity

### New job boards

| Platform | Scrape | Auto-fill | Notes |
|----------|--------|-----------|--------|
| **Lever** | Yes | Yes | `jobs.lever.co` apply flows |
| **Ashby** | Yes | Yes on native Ashby; **tailor-only** on embedded Ashby iframes | PDF/export still works everywhere Ashby is detected |
| **BambooHR** | Yes | Yes (best-effort) | `*.bamboohr.com/careers` — Phase 4 detail below |

Existing boards unchanged: Greenhouse, LinkedIn Easy Apply, Indeed (native), Workday (best-effort).

### Tailor-only mode

For sites where auto-fill is unsafe or unsupported (e.g. Ashby embeds, external Indeed redirects):

- Generate tailored CV + cover letter + screening answers as usual.
- **Review** → download PDF/DOC or copy text — **no form fill**.
- Queue items can be marked tailor-only; generation and export still run.

### Smarter queue

- **Pause / resume** processing (`PAUSE_QUEUE` / resume from UI).
- **Retry failed** items without re-adding URLs.
- **URL dedupe** when adding bulk URLs or open tabs — same listing won’t stack twice.
- **Duplicate warnings** when a job matches an existing queue entry or history `listingKey` (including “already applied” hints on open-tab picker).

### Web workspace history

The full dashboard on `app.blitzai.online` (localhost web dev) can now **list and open application history** via a bridge to extension IndexedDB (`LIST_APPLICATION_HISTORY`, `history-bridge.js`). History bodies stay on the device; the web UI reads through the extension when connected.

### On-page widget upgrades

- **Match score** — quick signal vs past applications for the current job.
- **Open Review** — one click from the widget into the review screen for the current listing (`WIDGET_OPEN_REVIEW`).

### Workday diagnostics

If Workday fill misses fields:

- Run **scan** from Review/settings flow → structured report of detected vs filled fields.
- Helps you fix manually without guessing what the content script saw (`SCAN_WORKDAY_FILL`, `WorkdayFillDiagnostics.jsx`).

---

## Phase 3 — Growth & monetization

### Billing & admin

- **Lemon Squeezy customer portal** — link in **Settings → License** when `billingSource` is `lemonsqueezy` (manage subscription without support).
- **Admin analytics — platform mix** — dashboard chart of which ATS/platforms users hit (from client telemetry); requires migration **`009_admin_platform_telemetry.sql`**.

### Job discovery from list pages

On **LinkedIn** or **Indeed** job search/list pages:

- **Capture jobs from this page** adds multiple listings to the queue in one step (`LIST_PAGE_JOBS`, `PageJobCapture.jsx` on Queue view).

### Application history tools

- **Follow-up reminders** — set date + note on a history row; Chrome **alarms** + **notifications** when due (`followUpAt`, `followUpNote`, `background/reminders.js`).
- **Import from CSV** — bulk import past applications into IndexedDB (`parseApplicationsFromCsv` in Application History).

### Marketing / store

- Marketing site reads **`VITE_CHROME_WEB_STORE_URL`** at build time — when set, hero/install CTA points to the real Chrome Web Store listing; when unset, shows “coming soon” + early-access mailto (see `.env.example`).

---

## Phase 4 — Scale & reach

### More AI providers (BYOK)

In **Settings → AI**, you can now use:

| Provider | API key | Default models (examples) |
|----------|---------|---------------------------|
| **Google Gemini** | Google AI Studio key | `gemini-2.0-flash`, etc. |
| **OpenRouter** | OpenRouter key | Routes to many models (e.g. `google/gemini-2.0-flash-001`) |

Anthropic and OpenAI are unchanged. Cost estimates in the UI include the new providers. Keys are **never** synced to the cloud (`ai_config` syncs provider + model only).

Host permissions added: `generativelanguage.googleapis.com`, `openrouter.ai`.

### Cross-device queue sync

When signed in with sync unlocked, these now encrypt and upload E2EE:

| Storage key | Cloud `doc_key` | What syncs |
|-------------|-----------------|------------|
| `job_queue` | `job_queue` | URLs, status, metadata, trimmed `jobData` — **not** full generated `application` blobs |
| `pending_job` | `pending_job` | Current in-progress job context |

**Still local-only:** `pending_application`, `generation_status`, `queue_processing`, `queue_paused`, API keys, license key string.

Merge behavior follows existing `sync-engine.js` (last-write per doc with content hash).

### Generation language

**Settings → Preferences → Generation language** controls the language of AI output (CV, cover letter, screening answers, title). Supported: English, German, Spanish, French.

- Affects **prompts only** — JSON field names stay English.
- **Not** full UI translation; `uiLocale` exists in defaults for a future i18n pass.

### BambooHR

Careers pages on **`*.bamboohr.com`**:

- Job detection + scrape via `content/bamboohr.js` and `page-context.js`.
- Form fill after you approve on Review (same `FILL_FORM` gate as other boards).

**iCIMS** was scoped in the roadmap but **deferred** — only BambooHR in this release.

### Accessibility

- Job widget: `role`, `aria-label`, keyboard-friendly controls.
- **`prefers-reduced-motion`**: lighter widget animations; dashboard motion components respect system setting (`reduced-motion.js`, `motion.jsx`).

### Firefox & Edge

- **Edge:** load unpacked same as Chrome — see [BROWSER_COMPAT.md](BROWSER_COMPAT.md).
- **Firefox:** `browser_specific_settings.gecko` in manifest; temporary add-on load (`about:debugging`). Best-effort — test your boards after upgrades.

### Automated smoke tests

```bash
npm run test:e2e:install   # once per machine
npm run test:e2e           # build artifacts + marketing install section
```

CI-friendly; not a full “install extension → generate → fill” E2E yet.

---

## Permissions & manifest changes (checklist)

You may need to **accept updated permissions** after reload:

- `notifications` — follow-up reminders
- Host access: BambooHR, Gemini, OpenRouter
- Content scripts: Lever, Ashby, BambooHR (plus existing boards)

---

## What’s **not** done yet (optional follow-ups)

Roadmap phases **0–1** still have ops and quality items — not blockers for using Phases 2–4 locally:

| Area | Item |
|------|------|
| **Ops** | Deploy Supabase **`008`** + **`009`**; redeploy Edge Functions if needed |
| **Ops** | Production license-worker rate limiting (WAF) |
| **Security** | Rich-editor sanitize on every `onChange`; `npm audit` in CI |
| **Quality** | Higher Vitest coverage thresholds; ESLint/Prettier; license-worker in CI |
| **Product** | **iCIMS** ATS; **full UI i18n**; deeper Playwright E2E |
| **Release** | Git commit / PR / Chrome Web Store publish — when you’re ready |

See [GITHUB_ISSUES_BACKLOG.md](GITHUB_ISSUES_BACKLOG.md) for issue-sized tasks.

---

## Where to look in the repo

| Topic | Location |
|-------|----------|
| Roadmap status | `docs/ROADMAP_H1_2026.md` |
| Sync keys & E2EE | `popup/src/lib/sync-payload.js`, `docs/SYNC_AND_AUTH.md` |
| AI providers | `popup/src/lib/ai.js`, `models.js`, `Settings.jsx` |
| Queue | `popup/src/lib/queue-bridge.js`, `queue-dedupe.js`, `background/queue-processor.js` |
| Content scripts | `content/*.js`, `.cursor/rules/content-scripts.mdc` |
| Admin platform chart | `admin/pages/Analytics.jsx`, migration `009` |
| Tests | `tests/unit/` (256+ tests), `e2e/smoke.spec.js` |

---

## Feedback

If something breaks on a specific board or browser, note **URL pattern**, **platform badge**, and whether you’re on **popup vs full dashboard vs web workspace** — that maps directly to the detector and message routing in the architecture doc.
