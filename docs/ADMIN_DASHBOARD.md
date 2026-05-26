# Blitz Admin Dashboard

Separate web app for **admin** and **developer** staff. Deploy to `admin.blitz.com` (or run locally). End users of the Chrome extension keep the **user** role.

## Role hierarchy

| Role | Level | Capabilities |
|------|-------|----------------|
| **user** | 1 | Own sync data & license row only (extension) |
| **admin** | 2 | Admin dashboard: users, licenses, stats, audit log (read) |
| **developer** | 3 | Everything admin has + assign roles + delete audit / cloud rows |

Enforced in Postgres via RLS (`002_roles_and_admin.sql`).

## Setup

**Google OAuth:** step-by-step in [ADMIN_GOOGLE_AUTH.md](ADMIN_GOOGLE_AUTH.md).

1. Apply migrations:
   ```bash
   npm run db:migrate
   ```
2. Sign in once with **Google** (extension **Account & sync** or this admin app) so your user exists in `auth.users`.
3. Grant yourself developer:
   ```bash
   # .env: DEVELOPER_EMAIL=your@email.com + SUPABASE_SERVICE_ROLE_KEY
   npm run db:seed:developer
   ```
4. Run admin UI:
   ```bash
   npm run admin:dev
   ```
   Open http://localhost:3790

## Supabase Auth redirects

Add to **Authentication → URL configuration**:

| Environment | URL |
|-------------|-----|
| Local | `http://localhost:3790` |
| Production | `https://admin.blitz.com` |

**Providers:** enable **Google** (required). Optional **developer email OTP** for staff with `admin_profiles.allow_email_login` — see [ADMIN_GOOGLE_AUTH.md](ADMIN_GOOGLE_AUTH.md) §6.

Anyone who signs in but only has the default **user** role sees **Access denied** until a developer promotes them in `user_roles`.

## Deploy (static)

```bash
npm run admin:build
```

Output: `admin-dist/`. Host on Vercel, Cloudflare Pages, or S3+CDN for `admin.blitz.com`.

### Deploy on Cloudflare Workers (static assets)

If you want the admin dashboard at `https://admin.blitzai.online/`, this repo also supports deploying `admin-dist/` using Wrangler Static Assets.

```bash
# one-time (per machine)
npx wrangler login

# build + deploy
npm run deploy:admin
```

Admin UI still needs these env vars at build time (CI secrets):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Env vars at build time (CI secrets):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the admin frontend.

## Security notes

- Admin UI uses the **anon/publishable** key + user JWT; RLS enforces roles.
- CV/profile **plaintext is not in the database** (E2EE) — dashboard shows counts and metadata only.
- All role changes and license edits should appear in `admin_audit_log`.
- Extension users cannot elevate their own role (only **developer** can write `user_roles`).

## Pages

- **Dashboard** — KPIs, signup chart, sync health signals
- **Analytics** — trends, doc-key breakdown, top users, niche metrics
- **Users** — search, pagination, user detail (usage, license actions, sync metadata)
- **Licenses** — Pro/Free, reset usage, expiry
- **Audit log** — filter, export CSV
- **Roles** — developer-only role + email-login toggle

Requires migrations through `006_app_config_telemetry.sql` (`npm run db:migrate`).

### Deploy Edge Functions (staff actions + billing)

```bash
npx supabase functions deploy admin-delete-user
npx supabase functions deploy admin-revoke-sessions
npx supabase functions deploy lemonsqueezy-webhook
# Set secret: LEMONSQUEEZY_WEBHOOK_SECRET (optional, verifies X-Signature)
```

Existing: `link-license`, `delete-account` (user self-delete from extension).

**Roadmap:** full feature list and phased plan → [ADMIN_ROADMAP.md](ADMIN_ROADMAP.md)
