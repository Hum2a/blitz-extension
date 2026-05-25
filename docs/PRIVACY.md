# Blitz privacy summary

## Local by default

Most users never sign in. In that mode:

- CV, profile, applications, and API keys stay in the browser (`chrome.storage.local` and IndexedDB).
- AI requests go directly from the extension to **your** Anthropic or OpenAI account (BYOK).
- Optional license validation sends only the license key to the Blitz Cloudflare worker.

## Optional cloud account

If you enable **Account & sync** in Settings:

| Data | Where | Notes |
|------|--------|--------|
| Email, auth tokens | Supabase Auth | Sign-in with Google or email OTP |
| CV, profile, preferences, template | Supabase Postgres | **Encrypted on your device** before upload; we cannot read plaintext |
| Application history | Supabase Postgres | Same encryption |
| AI API key | **Never uploaded** | Stays on each device |

You choose a **sync passphrase**. If you lose it, encrypted cloud data cannot be recovered.

## Your controls

- **Sign out** — stops sync; keeps local data.
- **Reset cloud data** — deletes encrypted blobs in Supabase.
- **Delete cloud account** — removes cloud rows and auth user (local data remains).
- **Export** — download decrypted JSON while signed in.

## Processors

- Supabase (EU/US regions per project settings) — auth and database when sync is enabled
- Anthropic / OpenAI — when you use AI features with your key
- Cloudflare — license validation
- Lemon Squeezy — payments (checkout pages only)

For setup details see [SYNC_AND_AUTH.md](SYNC_AND_AUTH.md).
