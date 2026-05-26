# Account, cloud sync & Supabase setup

Blitz remains **local-first**: generation, form fill, and BYOK AI work without an account. Optional sign-in encrypts CV/profile/settings and application history in Supabase (E2EE). **API keys never sync.**

## 1. Create Supabase projects

Create separate **dev** and **prod** projects at [supabase.com](https://supabase.com).

1. Add `DATABASE_URL` to `.env` (see [`.env.example`](../.env.example)). Prefer **Session pooler** URI from Supabase → Connect (the `db.<ref>.supabase.co` direct host is IPv6-only and often fails on Windows with `ENOTFOUND`). Encode `#` in passwords as `%23`. Then run migrations:
   ```bash
   npm install
   npm run db:migrate
   ```
   Or paste [`supabase/migrations/001_initial.sql`](../supabase/migrations/001_initial.sql) into the Supabase SQL editor.
2. **Authentication → Providers → Email**: enable Email; enable **Email OTP** (6-digit codes).
3. **Authentication → URL configuration**
   - **Site URL**: use your extension redirect origin, **not** `http://localhost:…` unless you always run a local server. Example: `https://<EXTENSION_ID>.chromiumapp.org/` (same as `chrome.identity.getRedirectURL()` from the extension).
   - **Redirect URLs** (allow list) — add:
     - `https://<UNPACKED_EXTENSION_ID>.chromiumapp.org/*`
     - `https://<CHROME_WEB_STORE_EXTENSION_ID>.chromiumapp.org/*`
     - `http://localhost:3790/*` only if you use `npm run admin:dev`
   Find extension IDs on `chrome://extensions` (Developer mode → ID).

### Email OTP (extension “Send code”)

`signInWithOtp` does **not** choose the email body — Supabase templates do.

| Symptom | Fix |
|---------|-----|
| Email says “Confirm email address” with a **localhost** link | **Site URL** is set to localhost. Change it to `https://<EXTENSION_ID>.chromiumapp.org/` (see above). |
| Link instead of a 6-digit code | **Authentication → Email Templates → Magic Link**: include `{{ .Token }}` and remove `{{ .ConfirmationURL }}` (see [Supabase passwordless docs](https://supabase.com/docs/guides/auth/auth-email-passwordless)). |
| First-time signup sends “Confirm signup” | **Providers → Email**: turn off **Confirm email**, *or* edit the **Confirm signup** template to show `{{ .Token }}` instead of only a link. |
| Admin login link to localhost | Run `npm run admin:dev` and keep Site URL / redirect as `http://localhost:3790`, or use OTP in the admin UI. |

After changing templates or Site URL, use **Send code** again and enter the **6-digit code** in Blitz (you do not need to click the email link).

## 2. Extension config

Supabase’s **“Connect via React / shadcn”** wizard (`@supabase/supabase-js`, shadcn components, React Router) targets web apps — **skip those for Blitz**. The extension already uses `auth.js` + `supabase-client.js` (fetch + PKCE).

Map the dashboard env vars to [`.env`](../.env):

| Supabase UI name | Blitz `.env` |
|------------------|--------------|
| Project URL | `VITE_SUPABASE_URL` |
| Anon key (`eyJ…`) or Publishable key (`sb_publishable_…`) | `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` |

Add to [`.env`](../.env) (see [`.env.example`](../.env.example)), then sync into the extension:

```bash
npm run config:sync
npm run build
```

This writes gitignored `popup/src/lib/config.secrets.js`. **Do not** put keys in `config.js` (that file is committed).

Never put the **service role** key in the extension. Use it only for Edge Functions (dashboard secrets).

See [`.env.example`](../.env.example) for operator-only variables.

## 3. Edge Functions (license link + account delete)

Deploy from `blitz-extension/`:

```bash
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... LICENSE_ENDPOINT=https://blitz-license.humzab1711.workers.dev
npx supabase functions deploy link-license
npx supabase functions deploy delete-account
```

- **link-license**: Validates key against existing Cloudflare license worker, upserts `license_entitlements` (service role).
- **delete-account**: Removes user rows + auth user (GDPR-style cloud delete).

## 4. What syncs to the database

All user **settings** from `storage.js` are stored in `sync_documents` (encrypted). See [supabase-schema.mdc](../.cursor/rules/supabase-schema.mdc).

| Synced | Stays local only |
|--------|------------------|
| CV, profile, preferences, appearance, CV template | API key |
| AI provider + model | License key string |
| License tier + usage count | Pending job, queue, auth session |

After enabling sync, run **Sync now** or edit a setting to upload. `npm run config:sync` + rebuild required after `.env` changes.

## 5. User flows

| Action | Behaviour |
|--------|-----------|
| No sign-in | Same as before — all data in `chrome.storage.local` + IndexedDB |
| Sign in (Google / email OTP) | Session in `auth_session`; no upload until sync enabled |
| Enable encrypted sync | User sets passphrase → PBKDF2 + AES-GCM; only ciphertext in Postgres |
| Edit CV/settings | Local write immediately; debounced push (~3s) |
| Second device | Sign in + same passphrase → pull merges (last-write-wins) |
| Sign out | Local data kept; session cleared; sync stops |
| Lost passphrase | Cloud data **not recoverable** — reset cloud data or delete account |

## 6. Security model

- TLS + Supabase RLS (`auth.uid() = user_id`)
- Client-side encryption for `sync_documents` and `synced_applications`
- `ai_config.apiKey` excluded from sync allowlist
- No logging of tokens, passphrase, CV plaintext, or ciphertext decoding in production code

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth redirect mismatch | Add exact `chromiumapp.org` URL for this extension ID |
| Email link goes to localhost / connection refused | Fix **Site URL** (not localhost); use Magic Link template with `{{ .Token }}`; enter code in Blitz |
| `email rate limit exceeded` | Wait (often 60s–1h). Enter an existing code and tap **Verify**, or use **Google** sign-in. Dev: **Authentication → Rate Limits** — raise OTP/email limits for your project |
| `Cloud sync is not configured` | Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` |
| Pull returns empty | Enable sync + passphrase; check RLS policies applied |
| Pro not syncing | Activate license while signed in; deploy `link-license` function |

## 8. Roles & admin dashboard

After `002_roles_and_admin.sql`:

- New signups get role **user** automatically.
- Bootstrap first **developer**: `npm run db:seed:developer` (see [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md)).
- Admin app: `npm run admin:dev` / deploy `admin-dist/` to `admin.blitz.com`.

## 9. Chrome Web Store

Update privacy disclosure: account email (auth provider), encrypted career documents, Supabase as processor. New permissions: `identity`, `alarms`, `https://*.supabase.co/*`.
