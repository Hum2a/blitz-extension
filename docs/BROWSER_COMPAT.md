# Browser compatibility (Firefox, Edge, Chromium)

Blitz targets **Manifest V3** on Chromium browsers (Chrome, Edge, Brave, Arc). Firefox support is **best-effort**.

## Chromium (primary)

1. `npm run build`
2. `chrome://extensions` → Load unpacked → select `blitz-extension/`
3. Pin the extension and open the dashboard from the toolbar

## Microsoft Edge

Edge is Chromium-based. Load the same unpacked folder via `edge://extensions` (Developer mode).

## Firefox

`manifest.json` includes `browser_specific_settings.gecko` with extension id `blitz@getblitz.io`.

1. `npm run build`
2. `about:debugging` → This Firefox → **Load Temporary Add-on** → select `manifest.json` from the repo root
3. Requires Firefox **109+** (Manifest V3 service worker support)

**Caveats:**

- Test content scripts on each job board after manifest changes
- `chrome.*` APIs are aliased to `browser.*` in Firefox; report gaps if a feature fails only on Firefox
- Temporary add-ons are removed when Firefox restarts

## API providers (all browsers)

Bring-your-own keys for Anthropic, OpenAI, Google Gemini, or OpenRouter. Host permissions are listed in `manifest.json`.
