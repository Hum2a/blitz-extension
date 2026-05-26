# Google sign-in for Blitz (Supabase)

Use this for the **Chrome extension** (Account & sync) and the **admin dashboard** (`npm run admin:dev`).

## 1. Google Cloud OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal if Google Workspace).
   - Add app name, support email, developer contact.
   - Scopes: default (`email`, `profile`, `openid`) is enough.
   - Add your Google account under **Test users** while the app is in *Testing*.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs** — add **exactly one** Supabase callback (not `localhost`):
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     Example for this repo’s dev project: `https://ufbzayolwloikmvjuuhi.supabase.co/auth/v1/callback`  
     (`YOUR_PROJECT_REF` = subdomain from `VITE_SUPABASE_URL`.)

     **Do not** put `http://localhost:3790` here — that belongs in Supabase only (step 3).
   - Copy **Client ID** and **Client secret**.

## 2. Enable Google in Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication → Providers → Google**.
2. Turn **Google enabled** on.
3. Paste **Client ID** and **Client secret** from step 1.
4. Save.

## 3. Redirect URLs (required)

**Authentication → URL configuration**

| Setting | Dev example | Production |
|---------|-------------|------------|
| **Site URL** | `http://localhost:3790` (admin) or extension `https://EXTENSION_ID.chromiumapp.org/` | `https://admin.blitz.com` |
| **Redirect URLs** | Add every URL below | Same |

Add all that apply:

```
http://localhost:3790
http://localhost:3790/*
https://YOUR_EXTENSION_ID.chromiumapp.org/*
https://admin.blitz.com
https://admin.blitz.com/*
```

Extension ID: `chrome://extensions` → Developer mode → **ID**.

## 4. Admin dashboard

```bash
# .env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

npm run admin:dev
```

Open http://localhost:3790 → **Sign in with Google**.

## 5. First developer account

Google (or extension) sign-in creates `auth.users` with role **user**. Promote yourself:

```bash
DEVELOPER_EMAIL=you@gmail.com
SUPABASE_SERVICE_ROLE_KEY=...
npm run db:migrate          # includes 003_admin_email_login.sql
npm run db:seed:developer
```

Sign out and sign in again on the admin app — you should see the dashboard.

## 6. Developer email OTP (optional)

For developers who cannot use Google on the admin app:

1. Run migration `003_admin_email_login.sql` (`npm run db:migrate`).
2. User must **already exist** in `auth.users` (sign in once via extension Google/email, or create in Supabase → Authentication → Users).
3. Enable email OTP for that developer:
   - **Option A:** `.env` bootstrap list:
     ```bash
     VITE_ADMIN_EMAIL_ALLOWLIST=dev@example.com
     ```
     Rebuild/restart `npm run admin:dev`.
   - **Option B:** After `db:seed:developer`, `allow_email_login` is set automatically. Other developers: toggle in admin **Roles** page (developer only).
4. Supabase **Authentication → Email Templates → Magic Link** must include `{{ .Token }}` for a 6-digit code (see [SYNC_AND_AUTH.md](SYNC_AND_AUTH.md)).
5. Admin login → **Staff email (developers only)** → existing account only; no signup.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `redirect_uri_mismatch` / Error 400 | In **Google Cloud → Credentials → your Web client → Authorized redirect URIs**, add only `https://<ref>.supabase.co/auth/v1/callback` (no trailing path variants, no localhost). Client ID/secret in Supabase must be from that same client. Add `HumzaButt1711@gmail.com` (or your account) under OAuth consent screen → **Test users** while app is in Testing. |
| Returns to localhost and fails | Add `http://localhost:3790` to Supabase redirect URLs; run `npm run admin:dev` |
| Access denied after Google | Run `npm run db:seed:developer` for your email |
| Email OTP “not allowed” | Migrate `003`, set `allow_email_login` or `VITE_ADMIN_EMAIL_ALLOWLIST` |
| `Signups not allowed` on email OTP | User does not exist yet — sign in once via Google or create user in Supabase dashboard |
