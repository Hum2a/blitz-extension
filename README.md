# Blitz Chrome Extension

AI-tailored job applications for **Greenhouse**, **LinkedIn Easy Apply**, **Indeed**, and **Workday**.

## Setup

```bash
cd blitz-extension
npm install
node scripts/generate-icons.mjs
npm run build
```

Load unpacked in `chrome://extensions` → select this folder.

## Features

- AI-tailored CV + cover letter (BYOK: Anthropic or OpenAI)
- Match score with visual ring + rationale
- Human-like form filling on supported platforms
- Application tracker with status, notes, CSV export
- Bulk job queue — paste URLs, batch-generate applications
- Freemium: 15 free applications, Pro via license key

## Supported platforms

| Platform | Scrape | Auto-fill |
|----------|--------|-----------|
| Greenhouse | ✅ | ✅ |
| LinkedIn Easy Apply | ✅ | ✅ |
| Indeed (native) | ✅ | ✅ |
| Indeed (company site) | ✅ | ⚠️ Warning only |
| Workday | ✅ | ✅ (best-effort, Shadow DOM) |

## License server

See `license-worker/README.md`. Extension config: `popup/src/lib/config.js`.

## Chrome Web Store

See `chrome-store/SUBMISSION_CHECKLIST.md` and `blitz-store-listing.md`.

## Development

```bash
npm run dev   # watch build popup
```

## Version history

- **1.2.0** — Phase 3: Workday, match viz, bulk queue, store checklist
- **1.1.0** — Phase 2: LinkedIn, Indeed, PDF, license worker
- **1.0.0** — Phase 1: Greenhouse MVP
