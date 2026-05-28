# Blitz roadmap — H1 2026 (May–Jun focus)

Living plan aligned with the [repository diagnosis](ARCHITECTURE.md) (May 2026). Phases are ordered by risk reduction first, then retention and competitive parity.

**Status key:** `done` | `in progress` | `planned`

---

## Phase 0 — Security & trust (May 2026) `done` (ops deploy remaining)

**Goal:** Close critical authorization gaps before scaling users or marketing spend.

| Item | Status | Notes |
|------|--------|-------|
| `admin_licenses_expiring` admin-only RPC | `done` | Migration `008_security_fixes.sql` |
| Lemon Squeezy webhook fail-closed without secret | `done` | Edge function |
| One license key → one Supabase account | `done` | `link-license` + unique index |
| Background message sender authorization | `done` | `background/message-auth.js` |
| Server tier refresh before AI generation | `done` | `license.js` + `pullLicenseEntitlement` downgrade |
| License worker CORS allowlist | `done` | No `Access-Control-Allow-Origin: *` on POST |
| Deploy migration `008` + redeploy Edge Functions | `planned` | Ops — verify production |
| License worker rate limiting (WAF / Worker) | `planned` | See `docs/GITHUB_ISSUES_BACKLOG.md` |
| Rich-editor sanitize on every `onChange` | `planned` | XSS hardening |
| `npm audit` in CI + Dependabot alerts | `planned` | Supply chain |

---

## Phase 1 — Quality & operability (Jun 2026) `in progress`

**Goal:** Catch regressions in sync, generation, and queue; align docs with shipped admin.

| Item | Status | Notes |
|------|--------|-------|
| Unit tests: `sync-engine.js` merge helpers | `done` | `sync-engine-merge.test.js`; suspend/unlock — planned |
| Unit tests: SW message contracts | `done` | `generation-guards-sw.test.js` + `message-auth.test.js` |
| Reconcile `docs/ADMIN_ROADMAP.md` | `done` | Shipped features marked ✅ |
| Wire `feature_flags` in extension | `done` | `app-feature-flags.js`, `generation-guards.js` |
| `dailyLimit` UI + enforcement | `done` | Settings + queue/generation-runner/SW |
| Expand `client_events` telemetry | `done` | `generate_completed`, `queue_*`, `generate_failed` |
| `generation-guards.js` central checks | `done` | maintenance + flags + daily + license |
| Raise Vitest coverage thresholds | `planned` | Target lib 25%+ next |
| CI: license-worker tests in workflow | `planned` | When worker has stable tests |
| ESLint + Prettier | `planned` | P3 |

---

## Phase 2 — Product parity (Jul–Aug 2026)

**Goal:** Match competitor ATS coverage and unblock “apply on company site” flows.

| Item | Priority | Size |
|------|----------|------|
| **Lever** detector + scrape + fill | `done` | `content/lever.js` |
| **Ashby** detector + scrape + fill | `done` | `content/ashby.js`; embed = tailor-only |
| **Tailor-only mode** (PDF/DOC + screening export, no fill) | `done` | `tailor-only.js`, Review + queue |
| Queue: pause/resume, retry failed, URL dedupe | P1 | M |
| Duplicate job warning (queue + history `listingKey`) | P1 | S |
| Web workspace **history parity** (bridge IDB or sync-read UI) | P1 | M |
| Widget: match score + one-click Review | P2 | M |
| Workday fill diagnostics UX | P2 | M |

---

## Phase 3 — Growth & monetization (Sep 2026)

**Goal:** Reduce support load, improve conversion, inform product with data.

| Item | Priority | Size |
|------|----------|------|
| Lemon Squeezy customer portal link in Settings | P1 | S |
| Admin: platform-mix from telemetry | P1 | M |
| Smart job-list capture (LinkedIn/Indeed search) | P2 | M |
| Follow-up reminders (interview / check-back) | P2 | M |
| Import history from CSV | P2 | M |
| Chrome Web Store listing + `VITE_CHROME_WEB_STORE_URL` on marketing | P1 | S |

---

## Phase 4 — Scale & reach (Q4 2026+)

| Item | Size |
|------|------|
| Additional AI provider (Gemini / OpenRouter) | M |
| Sync job queue + pending job across devices | M |
| i18n (UI + generation language) | L |
| Enterprise ATS (BambooHR, iCIMS) | L |
| Firefox / Edge MV3 port | L |
| Accessibility pass (widget, reduced motion) | M |
| E2E smoke (Playwright: install → generate → review) | L |

---

## Explicit non-goals (H1 2026)

- Hosted AI proxy (conflicts with BYOK positioning unless optional add-on)
- Storing user API keys server-side
- Auto-submit without user review on new platforms

---

## How to use this doc

1. Track work in GitHub Issues labelled `phase-0` … `phase-4`.
2. Update **Status** when items ship; link PRs in issue comments.
3. After each Supabase migration, update `.cursor/rules/supabase-schema.mdc`.

**Related:** `docs/ARCHITECTURE.md`, `docs/ADMIN_ROADMAP.md` (admin detail), `SECURITY.md`.
