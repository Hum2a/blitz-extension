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

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install deps, generate icons, build |
| `npm run dev` | Watch-build popup UI |
| `npm run build` | Production build popup |
| `npm run build:check` | Build + validate required files |
| `npm run validate` | Check manifest, assets, dist exist |
| `npm run test` | Validate + license worker smoke test |
| `npm run clean` | Remove `popup/dist` and pack output |
| `npm run rebuild` | Clean + build |
| `npm run pack` | Build, validate, zip for Chrome Web Store → `dist/blitz-extension-v*.zip` |
| `npm run icons` | Regenerate placeholder icons |
| `npm run version:patch` | Bump patch in `package.json` + `manifest.json` |
| `npm run version:minor` | Bump minor version |
| `npm run version:major` | Bump major version |
| `npm run version:set -- 1.3.0` | Set explicit version |
| `npm run version:sync` | Copy version from `package.json` → `manifest.json` |
| `npm run changelog:add -- "Fixed X"` | Add entry to `CHANGELOG.md` |
| `npm run release:pack` | Bump patch + create store zip |
| `npm run deploy:worker` | Deploy Cloudflare license worker |
| `npm run worker:license:add -- KEY` | Add license key to KV |
| `npm run worker:test` | Hit license API (GET + POST) |

## Development

```bash
npm run dev   # watch build popup
```

## Version history

- **1.2.0** — Phase 3: Workday, match viz, bulk queue, store checklist
- **1.1.0** — Phase 2: LinkedIn, Indeed, PDF, license worker
- **1.0.0** — Phase 1: Greenhouse MVP
