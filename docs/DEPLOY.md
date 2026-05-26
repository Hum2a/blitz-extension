# Deploy commands

All deploy scripts run from `blitz-extension/`. One-time Cloudflare login:

```bash
npx wrangler login
```

## Cloudflare (Workers + static assets)

| Command | What it deploys | URL |
|---------|-----------------|-----|
| `npm run deploy:license` | License validation API | `https://license.blitzai.online` |
| `npm run deploy:admin` | Admin dashboard (`admin-dist/`) | `https://admin.blitzai.online` |
| `npm run deploy:web` | Web workspace (`web-dist/`) | `https://app.blitzai.online` |
| `npm run deploy:cloudflare` | All of the above (license → admin → web) | — |

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
| `npm run admin:dev` | http://localhost:3790 |
| `npm run web:dev` | http://localhost:3789 |
| `npm run dev` | Extension watch build |

## Legacy aliases

These still work and point at the commands above:

- `deploy:worker`, `worker:deploy` → `deploy:license`
- `admin:deploy:cloudflare-workers` → `deploy:admin`
- `web:deploy:cloudflare-workers` → `deploy:web`
