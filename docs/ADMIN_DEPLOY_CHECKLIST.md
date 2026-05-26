# Admin dashboard deploy checklist

After pulling admin changes:

1. `npm run db:migrate`
2. `npm run deploy:admin` (or `admin:dev` locally, then `npm run admin:build`)
3. Deploy Edge Functions:
   - `admin-delete-user` (developer)
   - `admin-revoke-sessions` (admin+)
   - `lemonsqueezy-webhook` (optional billing)
4. Reload Chrome extension build for telemetry + app config banner
5. Lemon Squeezy: point webhook URL to `https://<project>.supabase.co/functions/v1/lemonsqueezy-webhook`
