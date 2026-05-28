# GitHub issues backlog

Generated from the May 2026 repository diagnosis. Run after installing [GitHub CLI](https://cli.github.com/):

```bash
# From repo root (creates labels if missing)
./scripts/create-github-issues.sh
```

Or create issues manually from the tables below. Roadmap phases: see [ROADMAP_H1_2026.md](./ROADMAP_H1_2026.md).

---

## Phase 0 — Security (remaining)

### [security] License worker rate limiting

**Labels:** `security`, `phase-0`

**Body:**
Add Cloudflare WAF or Worker rate limiting on `POST /` license validation to reduce key brute-force from arbitrary origins.

**Acceptance criteria:**
- Per-IP limit (e.g. 30 req/min)
- Constant-time / uniform error messages for invalid keys
- Document in `license-worker/README` if present

---

### [security] Sanitize rich CV editor on every change

**Labels:** `security`, `phase-0`

**Body:**
`ReviewDocumentEditor` and `CvTemplateRichEditor` set `innerHTML` without re-sanitizing pasted content. Run `sanitizeRichHtml` from `cv-html.js` on every `onChange` / sync.

---

### [security] Add npm audit to CI

**Labels:** `security`, `ci`, `phase-0`

**Body:**
Run `npm audit --audit-level=high` in `.github/workflows/ci.yml` (fail or warn on high/critical). Enable Dependabot alerts for the repo.

---

## Phase 1 — Quality & operability

### [testing] Unit tests for sync-engine.js

**Labels:** `testing`, `phase-1`

**Body:**
Cover merge/conflict, suspend account block, unlock, push/pull error paths. Mock Supabase REST in tests.

**Files:** `popup/src/lib/sync-engine.js`

---

### [testing] Service worker message router tests

**Labels:** `testing`, `phase-1`

**Body:**
Mock `handleMessage` paths for `GENERATE_APPLICATION`, `FILL_FORM`, sync messages with `message-auth` enforcement.

---

### [docs] Reconcile ADMIN_ROADMAP with shipped admin

**Labels:** `documentation`, `phase-1`

**Body:**
Update `docs/ADMIN_ROADMAP.md`: mark Audit, Billing, Sync health, Analytics as shipped; reprioritize Phase 1–3 items.

---

### [enhancement] Wire feature_flags in extension

**Labels:** `enhancement`, `phase-1`

**Body:**
`app_config.feature_flags` is edited in admin but unused in popup. Read flags in `App.jsx` / generation gates for gradual rollout.

---

### [enhancement] dailyLimit preference UI and enforcement

**Labels:** `enhancement`, `phase-1`

**Body:**
`preferences.dailyLimit` exists in storage but has no Settings UI and is not enforced in `queue-processor.js` / `generation-runner.js`.

---

### [enhancement] Expand client telemetry (no PII)

**Labels:** `enhancement`, `phase-1`

**Body:**
Record `generate_completed`, `platform`, `queue_finished`, `sync_error` via `telemetry.js` → `client_events`. Feed admin Analytics platform mix.

---

### [testing] Raise Vitest coverage thresholds

**Labels:** `testing`, `phase-1`

**Body:**
Set `vitest.config.js` thresholds (e.g. lines 40% on `popup/src/lib`). Exclude `config.js` / `supabase-client.js`.

---

## Phase 2 — Product parity

### [enhancement] Lever ATS support

**Labels:** `enhancement`, `phase-2`

**Body:**
Add `content/lever.js`, manifest hosts, detector, fill path. Follow `docs/ARCHITECTURE.md` “Adding a job board” checklist.

---

### [enhancement] Ashby ATS support

**Labels:** `enhancement`, `phase-2`

**Body:**
Same as Lever for Ashby-hosted apply flows.

---

### [enhancement] Tailor-only mode for external apply

**Labels:** `enhancement`, `phase-2`

**Body:**
When `externalApply` or unsupported fill: generate CV/cover letter, export PDF/DOC, copy screening answers — skip `FILL_FORM`.

---

### [enhancement] Queue pause, retry, and URL dedupe

**Labels:** `enhancement`, `phase-2`

**Body:**
`JobQueue.jsx` + `background/queue-processor.js`: pause/resume, retry failed items, dedupe by normalized URL/listingKey.

---

### [enhancement] Web workspace application history parity

**Labels:** `enhancement`, `phase-2`

**Body:**
`app.blitzai.online` cannot read extension-origin IndexedDB. Bridge history via sync (`synced_applications`) or extension-mediated API.

---

### [enhancement] Widget match score and quick Review

**Labels:** `enhancement`, `phase-2`

**Body:**
Show match % on `content/job-widget.js`; deep-link to Review with less friction.

---

## Phase 3 — Growth

### [enhancement] Lemon Squeezy customer portal in Settings

**Labels:** `enhancement`, `phase-3`

**Body:**
Link to manage subscription from `Settings.jsx` when `source=lemonsqueezy`.

---

### [enhancement] Smart job-list capture

**Labels:** `enhancement`, `phase-3`

**Body:**
Use `page-context.js` list/search detection to bulk-add jobs from LinkedIn/Indeed list pages.

---

## Phase 4 — Scale

### [enhancement] E2E smoke tests (Playwright)

**Labels:** `testing`, `phase-4`

**Body:**
Install → open job fixture → generate (mock AI) → review panel visible. Run in CI optionally nightly.

---

### [enhancement] i18n for UI and generation language

**Labels:** `enhancement`, `phase-4`

**Body:**
Extract strings; add preference for CV/cover letter output language in prompts.
