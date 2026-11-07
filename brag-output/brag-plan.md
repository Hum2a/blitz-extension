# Blitz launch video plan

**Angle:** Sending the same CV everywhere is the problem; Blitz tailors each application and still lets you check it first.
**Format:** 20 seconds, 1920x1080, 30fps, 120 BPM, original soundtrack, cuts on the beat.

| Time | Type | On screen |
|---|---|---|
| 0-3s | title | Same CV. Every job. Hmm. |
| 3-6s | title | Blitz |
| 6-11s | flow | For each job |
| 11-15s | list | Works on major job boards |
| 15-17s | title | Your API key stays in the browser. |
| 17-20s | outro | Apply faster. Land sooner. |

## Source and stand-ins
- No product UI is shown: the flow is an illustrative graphic using README wording.
- No real CV, name or job listing appears.

Public sites were loaded signed out with /api, /v1 and third-party requests blocked. No secrets or .env files were read.

## Check before posting
- Autofilling on LinkedIn and the other job boards may conflict with their terms. Check before promoting it.
- Indeed and Workday autofill have limits in the README table (detect only on company sites, best-effort on Workday).
