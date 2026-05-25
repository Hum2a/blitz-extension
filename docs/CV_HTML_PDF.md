# CV HTML → PDF

Blitz renders tailored CVs as **HTML** (your template + structured data), then converts to **PDF** in an offscreen document for downloads and job-board uploads.

## Customise layout

1. Open **Settings** → **CV HTML template**
2. Edit HTML/CSS and Mustache-style placeholders
3. **Save template** — stored in `chrome.storage.local` as `cv_html_template`
4. **Preview sample** to check layout before generating

The default template matches a classic UK CV layout (summary, education, skills, career blocks).

## Data flow

1. AI returns `cvDocument` (structured) + `tailoredCV` (plain text)
2. Template + data → HTML (`renderCvHtml`)
3. Offscreen: `html2canvas` + jsPDF → base64 PDF
4. Used on **Download PDF** (Review) and **Approve & fill** (form upload)

If you edit the CV text in Review, export parses the plain text instead of the original `cvDocument`.

## Dependencies

```bash
npm install
npm run copy:offscreen   # copies jspdf + html2canvas into offscreen/
npm run build
```

Reload the extension after building.
