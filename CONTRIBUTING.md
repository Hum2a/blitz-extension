# Contributing to Blitz

Thank you for your interest in contributing. This project is a Chrome Extension (MV3) with a React popup, background service worker, content scripts, and an optional Cloudflare license worker.

## Before you start

1. Read [README.md](README.md) for setup (`npm run setup`).
2. Skim [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [AGENTS.md](AGENTS.md) for conventions.
3. For new features: update `.cursor/rules/features-architecture.mdc` and related layer rules (see `.cursor/rules/maintain-cursor-rules.mdc`) so Cursor agents stay accurate.
4. Search [existing issues](https://github.com/Hum2a/blitz-extension/issues) to avoid duplicate work.

## Development workflow

```bash
npm install
npm run icons
npm run dev          # watch-build UI
# Reload unpacked extension on chrome://extensions after changes
```

Before opening a PR:

```bash
npm run build:check  # build + validate required assets
```

CI runs the same checks on every pull request.

## Pull requests

- Keep diffs focused — no drive-by refactors.
- Use the PR template and describe how you tested (platform + browser).
- Link related issues when applicable (`Fixes #123`).

## Code conventions

| Rule | Detail |
|------|--------|
| Modules | ES modules only |
| UI | React 18 functional components + hooks |
| AI calls | **Only** in `background/service-worker.js` |
| Storage | Use `popup/src/lib/storage.js` — not raw `chrome.storage` in components |
| IndexedDB | Use `popup/src/lib/db.js` |
| Secrets | Never log API keys, CV text, or PII |
| CSP | No remote scripts in extension pages; vendor deps locally (`offscreen/`) |
| Form fill | Content scripts scrape on load; fill only after user approves (`FILL_FORM`) |

## Reporting bugs

Use the [bug report template](https://github.com/Hum2a/blitz-extension/issues/new?template=bug_report.yml). Do **not** include API keys, CV content, or license keys.

## Security

See [SECURITY.md](SECURITY.md) for responsible disclosure.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
