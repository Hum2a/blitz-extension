# Supabase backend for Blitz sync

## Contents

| Path | Purpose |
|------|---------|
| `migrations/001_initial.sql` | Tables + RLS for sync and entitlements |
| `functions/link-license` | Validate license key → `license_entitlements` |
| `functions/delete-account` | GDPR-style cloud + auth user delete |

## Quick deploy

1. Create a Supabase project and run `migrations/001_initial.sql`.
2. Configure Auth redirect URLs (see [docs/SYNC_AND_AUTH.md](../docs/SYNC_AND_AUTH.md)).
3. Set extension `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `popup/src/lib/config.js`.
4. Deploy Edge Functions with service role secret (never in the extension).

```bash
npx supabase functions deploy link-license
npx supabase functions deploy delete-account
```
