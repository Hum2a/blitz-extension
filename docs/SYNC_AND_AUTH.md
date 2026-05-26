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
2. **Authentication → Providers**: enable Google; enable Email (OTP).
3. **Authentication → URL configuration → Redirect URLs** add:
   - `https://<UNPACKED_EXTENSION_ID>.chromiumapp.org/*`
   - `https://<CHROME_WEB_STORE_EXTENSION_ID>.chromiumapp.org/*`  
   Find IDs on `chrome://extensions` (Developer mode → ID).

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

## 4. User flows

| Action | Behaviour |
|--------|-----------|
| No sign-in | Same as before — all data in `chrome.storage.local` + IndexedDB |
| Sign in (Google / email OTP) | Session in `auth_session`; no upload until sync enabled |
| Enable encrypted sync | User sets passphrase → PBKDF2 + AES-GCM; only ciphertext in Postgres |
| Edit CV/settings | Local write immediately; debounced push (~3s) |
| Second device | Sign in + same passphrase → pull merges (last-write-wins) |
| Sign out | Local data kept; session cleared; sync stops |
| Lost passphrase | Cloud data **not recoverable** — reset cloud data or delete account |

## 5. Security model

- TLS + Supabase RLS (`auth.uid() = user_id`)
- Client-side encryption for `sync_documents` and `synced_applications`
- `ai_config.apiKey` excluded from sync allowlist
- No logging of tokens, passphrase, CV plaintext, or ciphertext decoding in production code

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth redirect mismatch | Add exact `chromiumapp.org` URL for this extension ID |
| `Cloud sync is not configured` | Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` |
| Pull returns empty | Enable sync + passphrase; check RLS policies applied |
| Pro not syncing | Activate license while signed in; deploy `link-license` function |

## 7. Chrome Web Store

Update privacy disclosure: account email (auth provider), encrypted career documents, Supabase as processor. New permissions: `identity`, `alarms`, `https://*.supabase.co/*`.
