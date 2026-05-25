# Blitz

[![CI](https://github.com/Hum2a/blitz-extension/actions/workflows/ci.yml/badge.svg)](https://github.com/Hum2a/blitz-extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-green.svg)](manifest.json)
[![Version](https://img.shields.io/badge/version-1.2.0-informational)](manifest.json)

**Apply faster. Land sooner.** Blitz is a Chrome extension that AI-tailors your CV and cover letter for each job (using your own API key), lets you review everything, then fills application forms on major job boards.

## Features

- **BYOK AI tailoring** — Anthropic or OpenAI; your key stays in the browser
- **Match score** — visual ring + rationale before you apply
- **Human-like form fill** — Greenhouse, LinkedIn Easy Apply, Indeed, Workday
- **Application tracker** — status, notes, CSV export
- **Bulk job queue** — paste URLs, batch-generate applications
- **Freemium** — 15 free applications; Pro via license key
- **Optional cloud sync** — encrypted backup across devices (Supabase); API keys stay local ([docs/SYNC_AND_AUTH.md](docs/SYNC_AND_AUTH.md))
- **Dashboard** — full-tab workspace ([DASHBOARD.md](DASHBOARD.md))

## Supported platforms

| Platform | Scrape | Auto-fill |
|----------|:------:|:---------:|
| Greenhouse | ✅ | ✅ |
| LinkedIn Easy Apply | ✅ | ✅ |
| Indeed (native) | ✅ | ✅ |
| Indeed (company site) | ✅ | ⚠️ detect only |
| Workday | ✅ | ✅ best-effort (Shadow DOM) |

## Quick start

**Requirements:** Node.js 20+, Google Chrome

```bash
git clone https://github.com/Hum2a/blitz-extension.git
cd blitz-extension
npm run setup
```

Load unpacked in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this repository folder (the folder containing `manifest.json`)

Add your API key in Blitz **Settings**, open a supported job posting, and generate an application.

## Project structure

```
├── background/          # Service worker (AI, queue, PDF orchestration)
├── content/             # Job board detectors + form fill
├── popup/               # React UI (Vite → popup/dist/)
├── offscreen/           # PDF generation (vendored jsPDF)
├── license-worker/      # Cloudflare Worker for Pro licenses
├── scripts/             # Build, validate, pack, versioning
├── docs/                # Architecture & feature docs
└── chrome-store/        # Web Store submission checklist
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for message flows and module boundaries.

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install deps, generate icons, build |
| `npm run dev` | Watch-build popup UI |
| `npm run build` | Production build popup |
| `npm run build:check` | Build + validate required files |
| `npm run validate` | Check manifest, assets, dist exist |
| `npm run loc` | Lines-of-code report (console + `reports/loc-report.md`) |
| `npm run loc:json` | LOC report as JSON on stdout |
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
| `npm run license:add -- KEY` | Add license key to KV |
| `npm run license:test` | Hit license API |

## Development

```bash
npm run dev   # watch build; reload extension after changes
npm run build:check   # same checks as CI
```

Reload the extension on `chrome://extensions` after UI or manifest changes.

## License server

Pro tier validation runs on a Cloudflare Worker. See [license-worker/README.md](license-worker/README.md).

Extension endpoint: `popup/src/lib/config.js` (`LICENSE_ENDPOINT`).

## Chrome Web Store

See [chrome-store/SUBMISSION_CHECKLIST.md](chrome-store/SUBMISSION_CHECKLIST.md).

## Releases

Tagged releases (`v*`) trigger [GitHub Actions](.github/workflows/release.yml) to build a store-ready `.zip` and attach it to the release.

```bash
npm run version:patch
git add package.json manifest.json CHANGELOG.md
git commit -m "chore: release v1.2.1"
git tag v1.2.1
git push && git push --tags
```

## Contributing

We welcome issues and pull requests. Please read:

- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, conventions, PR checklist
- [AGENTS.md](AGENTS.md) — guide for AI/automation contributors
- [SECURITY.md](SECURITY.md) — responsible disclosure
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Privacy & security

- **Bring your own key** — API keys are stored locally; requests go only to your chosen AI provider.
- **No telemetry of CV content** in logs — see development rules in CONTRIBUTING.md.
- Report vulnerabilities privately per [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) — Copyright (c) 2026 Hum2a

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
