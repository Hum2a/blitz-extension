# Chrome Web Store Submission Checklist

## Before you submit

- [ ] Run `npm run build` in `blitz-extension/`
- [ ] Test on Greenhouse, LinkedIn Easy Apply, Indeed, and Workday listings
- [ ] Verify license validation against your Cloudflare Worker
- [ ] If shipping cloud sync: Supabase configured, redirect URLs set, privacy policy updated (see `docs/SYNC_AND_AUTH.md`)
- [ ] Update LemonSqueezy checkout URLs in `popup/src/lib/config.js`
- [ ] Zip the `blitz-extension` folder **without** `node_modules/` (load unpacked uses built `popup/dist/`)

## Assets to prepare

| Asset | Size | Notes |
|-------|------|-------|
| Icon | 128×128 | `assets/icon128.png` |
| Screenshots | 1280×800 or 640×400 | 5 recommended — see `blitz-store-listing.md` |
| Promotional tile | 440×280 | Marquee banner copy in listing doc |
| Privacy policy | URL | https://getblitz.io/privacy |

## Listing copy

All copy is in **`blitz-store-listing.md`** at the repo root:

- Short description (132 chars)
- Full description
- Category: Productivity
- Keywords

## Privacy & permissions justification

Explain in the store form:

- **storage** — CV, profile, API key, preferences (local only)
- **identity** — optional Google sign-in for encrypted cloud sync (PKCE redirect)
- **alarms** — retry cloud sync when offline
- **tabs / activeTab / scripting** — detect job pages and fill forms after user approval
- **offscreen** — generate CV PDF for uploads
- **Host permissions** — job boards (Greenhouse, LinkedIn, Indeed, Workday), user's AI provider (Anthropic/OpenAI), optional Supabase (`*.supabase.co`)

## Single purpose

> Helps users tailor CVs and cover letters to job listings and fill application forms after explicit review and approval.

## Data handling

- No data sent to Blitz servers (except optional license key validation)
- Optional account: email via Supabase Auth; CV/profile/history uploaded **encrypted** (user passphrase); API keys stay local
- AI calls go directly from the user's browser to their API key provider
