# Marketing site (blitzai.online)

Public landing page for the Blitz Chrome extension. Dark, gradient-heavy design with animated mesh backgrounds.

## Local preview

```bash
npm run marketing:dev
```

Open http://localhost:3788

## Chrome Web Store link

When the extension is published, set in `.env`:

```bash
VITE_CHROME_STORE_URL=https://chromewebstore.google.com/detail/blitz/YOUR_EXTENSION_ID
```

Then rebuild before deploy:

```bash
npm run marketing:build
```

Without this variable, the install section shows a “coming soon” message with a contact link for early access (`VITE_SUPPORT_EMAIL`, default `support@getblitz.io`).

## Deploy

```bash
npm run deploy:marketing
```

Or as part of all Cloudflare deploys:

```bash
npm run deploy:cloudflare
```

## Structure

- `marketing/` — React + Tailwind + Framer Motion source
- `marketing-dist/` — Vite build output (gitignored)
- `marketing-worker/` — Wrangler static assets worker for `blitzai.online`
