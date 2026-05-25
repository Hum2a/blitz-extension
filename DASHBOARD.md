# Blitz workspace (full tab + local website)

Use a **full website-style workspace** instead of reopening the small popup. Sidebar navigation, page headers, and multi-column layouts on desktop. Same `chrome.storage.local` data as the extension (CV, settings, pending job, queue, license).

The **420px popup** stays unchanged for quick actions on job pages.

## On-page widget (job sites)

On supported sites (Greenhouse, LinkedIn Jobs, Indeed, Workday), a **Blitz floating panel** appears bottom-right. It detects:

- **Ready** — single job listing (can tailor immediately)
- **Job list** — search or multiple listings (select one first)
- **Select job** — title visible but description not loaded yet

Use **Tailor application** on the widget, **Open Blitz**, or minimize to the pill. Reload the extension after `npm run build`.

## Option A — Extension dashboard (recommended)

No extra setup. Same storage as the popup automatically.

1. Run `npm run build` and reload the extension.
2. Open Blitz → click **Dashboard** in the header, **or**
3. Right-click the Blitz icon → **Options** (opens the dashboard in a new tab).
4. Bookmark the tab and leave it open — changes sync live with the popup.

URL shape: `chrome-extension://<your-extension-id>/popup/dist/dashboard.html`

## Option B — Local website (`npm run web:dev`)

A normal browser tab at `http://localhost:3789` that talks to the extension over Chrome’s external messaging API.

1. Load the unpacked extension (Developer mode).
2. From `blitz-extension`: `npm run web:dev`
3. Open http://localhost:3789
4. Copy the extension **ID** from `chrome://extensions` and paste it on the connect screen.
5. Click **Connect** — the full UI loads and uses extension storage.

Keep the extension installed; the site is only a window into the same background worker + storage.

## What stays in sync

| Data | Storage | Synced in dashboard? |
|------|---------|-------------------------|
| CV, LinkedIn PDF text, profile, API key, preferences | `chrome.storage.local` | Yes |
| Pending job / application | `chrome.storage.local` | Yes |
| Job queue | `chrome.storage.local` | Yes |
| Application history (History tab) | IndexedDB (per origin) | Same on extension popup + extension dashboard; **not** on localhost web |

**Home** shows stats + a short recent-applications list. **Open job tabs** (workspace only) lists every supported job tab in your browser, marks which are **Ready** vs need you to select a listing, and lets you add several to the **Queue** at once. **History** is the full log with search, filters, and CV/cover letter snapshots.

## CV PDF (HTML template)

Settings → **CV HTML template** — edit layout/CSS; saved as `cv_html_template` in extension storage (syncs with popup and web workspace). Review → **Download PDF** / **Preview PDF layout**.

See [docs/CV_HTML_PDF.md](docs/CV_HTML_PDF.md).

## Development

```bash
npm install
npm run build      # popup + extension dashboard
npm run web:dev    # localhost dashboard (optional)
```
