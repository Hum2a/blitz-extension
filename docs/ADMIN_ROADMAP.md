# Admin dashboard — feature inventory & implementation plan

Blitz is **E2EE**: admins never see CV text, API keys, or application content. The dashboard operates on **metadata, entitlements, roles, and audit** only unless we add explicit (opt-in) telemetry later.

**Today (shipped):** Dashboard · Analytics · Users + user detail · Licenses · Sync health · Staff · Billing events · Audit log · Privacy page · Config (maintenance, banner, min version, feature flags) · Roles + email-login toggle · Google / developer email auth · `admin_audit_log` · account suspend · support notes · `client_events` telemetry table.

---

## A. Complete feature inventory

### A1. Users & accounts

| Feature | Value | Data source | Notes |
|---------|-------|-------------|--------|
| User search & pagination | Find users quickly | `admin_profiles`, `auth.users` | Email, UUID, date range |
| User detail page | Support one user | profiles + roles + sync_meta + counts | Hub for actions |
| Signup / last active dates | Lifecycle | `admin_profiles.created_at`, `last_seen_at` | *Requires extension heartbeat → `last_seen_at`* |
| Auth providers per user | Support | Supabase Admin API | Service-role Edge Function only |
| Force sign-out all sessions | Security | Supabase Admin API | Edge Function |
| Delete cloud account (GDPR) | Compliance | `delete-account` function | Admin triggers on behalf of user |
| Suspend / ban account | Abuse | New `account_status` column | Block sync + optional auth ban |
| Staff invite (admin/developer) | Onboarding | Supabase invite + manual role | Not self-service signup |
| Merge duplicate accounts | Edge case | Manual / future | Low priority |
| Export user metadata (CSV) | Compliance | Aggregated queries | No ciphertext |

**Cannot do (by design):** Read CV, profile fields, API keys, application answers (E2EE).

### A2. Roles & staff

| Feature | Value | Status |
|---------|-------|--------|
| Assign user / admin / developer | Core | ✅ Roles page |
| Toggle developer email OTP | Bootstrap | ✅ Roles page |
| Staff directory (admin+ only) | Clarity | Filter `user_roles` |
| Prevent self-demotion | Safety | ✅ Partially |
| Role change history | Audit | `admin_audit_log` |
| Revoke all staff access | Offboarding | Demote + `allow_email_login` false |

### A3. Licenses & billing

| Feature | Value | Data source |
|---------|-------|-------------|
| List entitlements + filters | Ops | `license_entitlements` |
| Set Pro / Free | Ops | ✅ |
| Set `expires_at` | Subscriptions | Column exists |
| Reset `applications_used` | Support | Column exists |
| Link license key for user | Support | `link-license` Edge Function |
| Show source (`admin_dashboard`, `lemonsqueezy`, `cf_worker`) | Debug | `source` |
| Pro vs Free charts | Business | SQL aggregates |
| Lemon Squeezy webhook log | Billing | *New table + webhook* |
| Validate key (test box) | Support | CF license worker |
| Revoke Pro + audit reason | Refunds | Tier + audit meta |

**Cannot do without integration:** Full payment history, invoices (Lemon Squeezy dashboard).

### A4. Cloud sync (metadata only)

| Feature | Value | Data source |
|---------|-------|-------------|
| Sync enabled? | Support | `user_sync_meta` |
| Last full sync time | Support | `last_full_sync_at` |
| Document keys present | Debug | `sync_documents.doc_key`, `updated_at` |
| Application sync count | Usage | `synced_applications` count |
| Devices (device_id list) | Multi-device | Distinct `device_id` |
| Tombstones / deleted docs | Debug | `deleted_at` |
| Reset user cloud data | Support | DELETE sync rows (developer) |
| Sync error banner | Support | *Add `last_error` to `user_sync_meta`* |
| Force re-sync | — | **Impossible** without user passphrase |

### A5. Analytics & dashboard

| Feature | Value | Feasibility |
|---------|-------|-------------|
| KPI cards (users, pro, sync adoption) | Overview | ✅ Extend current |
| Signups over time (chart) | Growth | SQL by `created_at` |
| Sync adoption rate | Product | % with `user_sync_meta` |
| Applications synced (count trend) | Usage | Encrypted count only |
| Admin actions over time | Ops | `admin_audit_log` |
| Churn / deleted accounts | Growth | Auth admin or counter |
| Platform mix (Greenhouse, LinkedIn…) | Product | *Needs telemetry table* |
| AI generations / token usage | Product | *Not in cloud (BYOK)* |
| Extension version distribution | Release | *Needs telemetry or store API* |
| Geographic region | Compliance | Supabase project region only |

### A6. Audit, compliance & privacy

| Feature | Value | Status |
|---------|-------|--------|
| Audit log viewer + filters | Required | ✅ `admin/pages/Audit.jsx` |
| Export audit CSV | Compliance | Query + download |
| Action labels glossary | Clarity | Docs |
| GDPR deletion log | Legal | Audit + delete-account |
| “What admins can see” page | Trust | Static doc in app |
| Data retention policy settings | Legal | *Future config* |

### A7. Support & operations

| Feature | Value |
|---------|-------|
| Global user search (Cmd+K) | Speed |
| Copy user ID / email | Support tickets |
| Internal notes on user | *New `support_notes` (developer only, not synced)* |
| Impersonation | **Skip** — no access to E2EE data, high risk |
| Maintenance mode flag | ✅ `app_config` → extension via `get_app_config` |
| Feature flags (`disable_*`) | ✅ Admin Config + extension `generation-guards.js` |
| Announcement banner text | Product |
| Health: Supabase / Edge Functions / License worker | Ops |

### A8. System & developer

| Feature | Value |
|---------|-------|
| RLS smoke test (read-only) | Developer |
| Re-run `link-license` from UI | Developer |
| View Edge Function deploy version | Developer |
| Database migration status | Developer |
| Service-role actions audit | *Strict logging* |

### A9. Integrations (later)

| Integration | Admin features |
|-------------|----------------|
| Lemon Squeezy | Webhooks → auto `license_entitlements`, refund handling |
| Cloudflare license worker | Key lookup, revoke, usage stats |
| Sentry / logging | Error rates (if client reports) |
| Chrome Web Store | Install counts (API) |
| Stripe | If billing moves off Lemon Squeezy |

---

## B. Privacy & security constraints (non-negotiable)

1. **Never** display `sync_documents.ciphertext` / `synced_applications.ciphertext` in admin UI.
2. **Never** use service role key in the admin frontend bundle.
3. Destructive actions (delete user, wipe sync, ban) → **developer** only or **admin** with confirm + audit.
4. All writes → `admin_audit_log` with `actor_id`, `target_user_id`, `meta`.
5. Rate-limited admin Edge Functions for session revoke, delete-account, link-license.

---

## C. Implementation plan (phased)

Estimates assume one developer; adjust for parallel work.

### Phase 0 — Foundation (3–5 days)

**Goal:** Shared admin shell, queries, and patterns.

- [ ] Admin layout: sidebar nav, breadcrumbs, consistent tables (`DataTable` component)
- [ ] Shared hooks: `useAdminQuery`, error/toast handling
- [ ] SQL views / RPCs for heavy aggregates (keep RLS):
  - `admin_user_summary_v` — email, role, created_at, sync_enabled, doc_count, app_count, tier
  - `admin_stats_daily_v` — signups, sync_active (for charts)
- [ ] Migration `004_admin_views.sql` + update `supabase-schema.mdc`
- [ ] Extend `admin_audit_log` action enum doc; ensure all new actions logged

**Deliverable:** Faster pages, no duplicate Supabase queries.

---

### Phase 1 — Core ops (1–2 weeks)

**Goal:** Day-to-day support without SQL.

| # | Feature | Pages / notes |
|---|---------|----------------|
| 1.1 | **Audit log** | `/audit` — filter action, actor, date, target; pagination |
| 1.2 | **User detail** | `/users/:id` — summary + links to license/sync |
| 1.3 | **Users list v2** | Search, pagination, sort, role filter |
| 1.4 | **Licenses v2** | Email column (join), `expires_at` editor, reset usage |
| 1.5 | **Dashboard v2** | KPI cards + 2 charts (signups 30d, pro vs free) |
| 1.6 | **Link license for user** | Call `link-license` from user detail (admin) |

**Deliverable:** Replace most manual Supabase dashboard usage.

---

### Phase 2 — Support & compliance (1 week)

| # | Feature | Notes |
|---|---------|--------|
| 2.1 | **Delete cloud account** | Admin button → `delete-account` Edge Function + confirm |
| 2.2 | **Reset cloud sync data** | Developer: delete `sync_*` rows for user |
| 2.3 | **Sync tab on user detail** | doc keys, counts, devices, last sync |
| 2.4 | **Export CSV** | Users list, audit log |
| 2.5 | **Privacy / scope page** | In-app “What we can see” |
| 2.6 | **Force sign-out** | Edge Function `admin-revoke-sessions` |

**Deliverable:** GDPR-aligned support playbook in UI.

---

### Phase 3 — Account lifecycle (1 week)

| # | Feature | Notes |
|---|---------|--------|
| 3.1 | Migration `005_account_status.sql` — `active`, `suspended` | |
| 3.2 | Suspend / unsuspend user | Check in sync-engine + auth (optional ban via Admin API) |
| 3.3 | `last_seen_at` heartbeat | Extension pings on popup open → update `admin_profiles` |
| 3.4 | **Staff directory** page | Users with role admin/developer |
| 3.5 | **Active users** metric | Based on `last_seen_at` |

---

### Phase 4 — Analytics & reporting (1 week)

| # | Feature | Notes |
|---|---------|--------|
| 4.1 | Analytics page | Charts: signups, sync adoption, apps synced (counts) |
| 4.2 | License analytics | Pro conversion, expiring soon |
| 4.3 | Audit trends | Actions by type per week |
| 4.4 | Scheduled email report | Optional; Edge Function + cron |

---

### Phase 5 — Remote config & product ops (1 week)

| # | Feature | Notes |
|---|---------|--------|
| 5.1 | `app_config` table (developer write, public read via RPC) | maintenance_mode, min_extension_version, banner_message |
| 5.2 | Extension reads config on startup | `get_app_config` RPC |
| 5.3 | **Feature flags** admin UI | Toggle keys |
| 5.4 | **License test** tool | Validate key against CF worker |

---

### Phase 6 — Integrations (2+ weeks, optional)

| # | Feature | Notes |
|---|---------|--------|
| 6.1 | Lemon Squeezy webhooks → `billing_events` table | Auto Pro + audit |
| 6.2 | CF license admin proxy | Lookup/revoke keys (service role) |
| 6.3 | Opt-in telemetry | `client_events` — platform, version, generate_count (no PII) |
| 6.4 | Platform / AI usage dashboards | Depends on 6.3 |

---

## D. Suggested nav structure (target)

```
Dashboard
Users          → list + detail
Licenses
Sync health    → optional global view of sync errors
Roles          → developer
Audit log
Analytics
Config         → developer (feature flags, banner)
Staff
Settings       → links to Supabase/Google docs
```

---

## E. Priority matrix

| Priority | Items |
|----------|--------|
| **P0** | Audit log UI, user detail, users search, dashboard charts, link-license from UI |
| **P1** | Delete account, reset sync, sync tab, license expires_at / reset usage, CSV export |
| **P2** | Suspend user, last_seen heartbeat, staff directory, force sign-out |
| **P3** | `app_config` / feature flags, Lemon Squeezy webhooks |
| **P4** | Client telemetry, platform analytics, store API |

---

## F. Technical checklist (every new admin feature)

- [ ] RLS: `has_min_role('admin')` read; destructive → `is_developer()` or confirmed admin
- [ ] Insert `admin_audit_log` on every mutation
- [ ] No service role in `admin/` bundle
- [ ] No ciphertext fields in SELECT lists
- [ ] Confirm modal for destructive actions
- [ ] Update `ADMIN_DASHBOARD.md` + this roadmap when shipped

---

## G. What we explicitly will not build

- Viewing or editing user CV / cover letters / answers (E2EE).
- Impersonation into user extension session.
- “Fix sync” without user passphrase.
- Storing or displaying user API keys.
- Self-service **create account** on admin portal (staff provisioning only).

---

## H. Next step

Start **Phase 0 + Phase 1.1 (Audit log)** in the next implementation pass — highest leverage after login works.

When ready, say which phase to implement first (recommended: **Phase 0 → 1.1–1.3**).
