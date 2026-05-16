# Blitz Chrome Extension (Phase 1)

AI-tailored job applications for Greenhouse listings.

## Setup

```bash
cd blitz-extension
npm install
node scripts/generate-icons.mjs
npm run build
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `blitz-extension` folder
4. Open extension **Settings** and add your API key + CV + profile
5. Visit a Greenhouse job listing and open the Blitz popup

## Phase 1 scope

- Greenhouse job detection and scraping
- AI tailoring (Anthropic / OpenAI BYOK)
- Review panel with approve / regenerate / skip
- Human-like form filling on Greenhouse
- Application tracker (IndexedDB)
- 15-application free tier counter

## Development

```bash
npm run dev   # rebuild popup on change
```

After popup changes, reload the extension in `chrome://extensions`.
