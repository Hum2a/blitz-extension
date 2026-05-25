# Blitz — Cursor rules

Rules live in `.cursor/rules/*.mdc`. Each file covers one area of the codebase.

| Rule file | When it applies |
|-----------|-----------------|
| `blitz-overview.mdc` | Always — conventions, layout, hard rules |
| `features-architecture.mdc` | Always — feature map, messages, cross-layer flows |
| `maintain-cursor-rules.mdc` | Always — **agents must update rules/docs when shipping features** |
| `popup-react.mdc` | `blitz-extension/popup/**` |
| `background-worker.mdc` | `blitz-extension/background/**`, `offscreen/**` |
| `content-scripts.mdc` | `blitz-extension/content/**` |
| `shared-lib.mdc` | `blitz-extension/popup/src/lib/**` |
| `license-worker.mdc` | `blitz-extension/license-worker/**` |
| `build-release.mdc` | `package.json`, `scripts/**`, `manifest.json`, `CHANGELOG.md` |

Full spec (historical): `blitz-extension/blitz-extension.cursorrules`
