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

1. Apply migrations:
   ```bash
   npm run db:migrate
   ```
2. Sign in once (extension **Account & sync** or admin app) so your user exists in `auth.users`.
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

Same Google / email OTP providers as the extension.

## Deploy (static)

```bash
npm run admin:build
```

Output: `admin-dist/`. Host on Vercel, Cloudflare Pages, or S3+CDN for `admin.blitz.com`.

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

- **Dashboard** — aggregate counts
- **Users** — emails + roles
- **Licenses** — set Pro / Free
- **Roles** — developer-only role assignment
