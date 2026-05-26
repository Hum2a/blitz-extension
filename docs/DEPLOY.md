# Deploy commands

All deploy scripts run from `blitz-extension/`. One-time Cloudflare login:

```bash
npx wrangler login
```

## Cloudflare Git builds (Workers connected to GitHub)

If Cloudflare runs `npm ci` on push, **`package-lock.json` must be committed** whenever `package.json` changes (e.g. after adding `wrangler`). Locally run `npm install`, then commit and push the updated lockfile.

**License worker only** (recommended for `license.blitzai.online`):

| Setting | Value |
|---------|--------|
| Root directory | `blitz-extension` (or `blitz-extension/license-worker` for a smaller install) |
| Build command | `npm ci && npm run deploy:license` |
| Deploy command | *(leave empty — Wrangler deploys in the build step)* |

If root is `blitz-extension/license-worker`, use:

```bash
npm ci && npx wrangler deploy --env production
```

**Admin / web** static sites use the same pattern with `deploy:admin` or `deploy:web` (build + upload assets). Do not point the license project at the whole extension unless you intend to run those commands.

## Cloudflare (Workers + static assets)

| Command | What it deploys | URL |
|---------|-----------------|-----|
| `npm run deploy:marketing` | Public landing page (`marketing-dist/`) | `https://blitzai.online` |
| `npm run deploy:license` | License validation API | `https://license.blitzai.online` |
| `npm run deploy:admin` | Admin dashboard (`admin-dist/`) | `https://admin.blitzai.online` |
| `npm run deploy:web` | Web workspace (`web-dist/`) | `https://app.blitzai.online` |
| `npm run deploy:cloudflare` | All of the above (license → marketing → admin → web) | — |

`deploy:admin` and `deploy:web` run a Vite build first. Admin needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` at build time.

## Supabase Edge Functions

| Command | Functions |
|---------|-----------|
| `npm run deploy:supabase` | `link-license`, `delete-account`, `admin-delete-user`, `admin-revoke-sessions`, `lemonsqueezy-webhook` |

Set secrets in the Supabase dashboard or via `npx supabase secrets set` (see [SYNC_AND_AUTH.md](SYNC_AND_AUTH.md)).

## Chrome extension

| Command | Output |
|---------|--------|
| `npm run pack` | Validated build + zip for Chrome Web Store |

Load unpacked from this folder at `chrome://extensions` during development (`npm run build`).

## Full stack refresh

```bash
npm run deploy:all
```

Runs `build:check` (extension) then `deploy:cloudflare`.

## Local dev (not deploy)

| Command | URL |
|---------|-----|
| `npm run marketing:dev` | http://localhost:3788 |
| `npm run admin:dev` | http://localhost:3790 |
| `npm run web:dev` | http://localhost:3789 |
| `npm run dev` | Extension watch build |

## Legacy aliases

These still work and point at the commands above:

- `deploy:worker`, `worker:deploy` → `deploy:license`
- `admin:deploy:cloudflare-workers` → `deploy:admin`
- `web:deploy:cloudflare-workers` → `deploy:web`
