# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| Latest release on `master` | Yes |
| Older tagged releases | Best effort |
| Unreleased / fork builds | No |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead:

1. Use [GitHub private vulnerability reporting](https://github.com/Hum2a/blitz-extension/security/advisories/new) if enabled on the repository, **or**
2. Contact the maintainer through a private channel you already use for Blitz support.

Include:

- Description of the issue and impact
- Steps to reproduce
- Affected version / commit
- Any proof-of-concept (redacted — no real API keys or user CV data)

We aim to acknowledge reports within **72 hours** and provide a fix or mitigation plan as soon as practical.

## Scope

In scope:

- Blitz Chrome extension (this repository)
- The Cloudflare license worker in `license-worker/` when deployed by the project maintainer
- Supabase Edge Functions in `supabase/functions/` when deployed by the project maintainer (account delete, license linking)

Out of scope:

- Third-party job boards (Greenhouse, LinkedIn, Indeed, Workday)
- User-provided API keys stored locally in the browser (BYOK model — users control their keys)
- Issues that require physical access to an unlocked machine with the extension already loaded

## Safe development practices

- Never commit API keys, license keys, `.env`, or `.dev.vars`
- Never embed the Supabase **service role** key in the extension — anon key + user JWT only
- Never log `apiKey`, `cv_text`, sync passphrases, auth tokens, or decrypted sync payloads
- Run `npm run build:check` before shipping; review `host_permissions` in `manifest.json` when adding new integrations
- Cloud sync uses client-side encryption (E2EE); treat lost sync passphrases as unrecoverable by design

See [docs/SYNC_AND_AUTH.md](docs/SYNC_AND_AUTH.md) for operator setup.

## CodeQL (GitHub Actions)

The [CodeQL workflow](.github/workflows/codeql.yml) runs on push, PR, and weekly schedule.

If Actions logs **"Code scanning is not enabled for this repository"**, enable it once:

1. Open **Settings → Code security and analysis** for this repo  
   `https://github.com/Hum2a/blitz-extension/settings/security_analysis`
2. Under **Code scanning**, set **CodeQL analysis** to **Enabled** (or "Default").

**Public repositories** usually get CodeQL for free. **Private repositories** require [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) on the org or repo.

Until code scanning is enabled, the workflow still runs analysis locally but cannot upload SARIF results; the analyze step is marked `continue-on-error` so other CI jobs are not blocked.
