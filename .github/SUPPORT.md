# Support

## Documentation

- [README](../README.md) — setup and scripts
- [Architecture](../docs/ARCHITECTURE.md) — how Blitz is structured
- [Dashboard](../DASHBOARD.md) — full-tab workspace
- [License worker](../license-worker/README.md) — Pro tier deployment

## Getting help

1. Check [existing issues](https://github.com/Hum2a/blitz-extension/issues) and [discussions](https://github.com/Hum2a/blitz-extension/discussions) if enabled.
2. Open a [bug report](https://github.com/Hum2a/blitz-extension/issues/new?template=bug_report.yml) or [feature request](https://github.com/Hum2a/blitz-extension/issues/new?template=feature_request.yml).
3. For security issues, use [private reporting](https://github.com/Hum2a/blitz-extension/security/policy) — do not file public issues.

## Common fixes

| Problem | Try |
|---------|-----|
| Missing popup / build errors | `npm run setup` then reload on `chrome://extensions` |
| Validation failed | `npm run icons && npm run build:check` |
| Form fill not running | Approve in review panel first (fill is never automatic) |
| Pro license invalid | Confirm `LICENSE_ENDPOINT` in `config.js` matches your worker URL |
