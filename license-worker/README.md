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
4. Deploy: `npm run deploy` — note the URL in the output (e.g. `https://blitz-license.<your-subdomain>.workers.dev`)

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
npm run test -- https://blitz-license.humzab1711.workers.dev YOUR-KEY
```

Default test key is `BLITZ-TEST-PRO-001`. Add keys with `npm run license:add -- YOUR-KEY`.
5. Route `license.blitz.workers.dev` to this worker (or update `LICENSE_ENDPOINT` in `popup/src/lib/config.js`)

## API

`POST /validate`

```json
{ "key": "your-license-key" }
```

Response:

```json
{ "valid": true, "tier": "pro", "message": "License valid" }
```
