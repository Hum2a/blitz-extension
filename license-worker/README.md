# Blitz License Worker

Cloudflare Worker for validating LemonSqueezy license keys.

## Deploy

Wrangler is installed locally in this folder (no global install needed).

```bash
cd blitz-extension/license-worker
npm install
```

1. Log in to Cloudflare: `npx wrangler login`
2. Create a KV namespace: `npm run kv:create`
3. Copy the namespace `id` from the output into `wrangler.toml` (replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`)
4. Deploy from repo root: `npm run deploy:license` (or `npm run deploy` in this folder) — `https://license.blitzai.online`

5. Add a license key (PowerShell-safe):

   ```bash
   npm run license:add -- YOUR-LICENSE-KEY
   ```

6. Point the extension at your worker URL in `popup/src/lib/config.js` (`LICENSE_ENDPOINT`), then rebuild the popup.

## Browser shows "Method not allowed"?

That's normal if you opened the URL in a tab — the API only accepts **POST**. After redeploying, a **GET** returns a small JSON health check instead.

Test validation:

```bash
npm run test
# Or test a specific key:
npm run test -- BLITZ-TEST-PRO-001
# Or URL + key:
npm run test -- https://license.blitzai.online YOUR-KEY
```

Default test key is `BLITZ-TEST-PRO-001`. Add keys with `npm run license:add -- YOUR-KEY`.
5. Ensure DNS for `license.blitzai.online` points at your Cloudflare zone and the production route is active.

## API

`POST /validate`

```json
{ "key": "your-license-key" }
```

Response:

```json
{ "valid": true, "tier": "pro", "message": "License valid" }
```
