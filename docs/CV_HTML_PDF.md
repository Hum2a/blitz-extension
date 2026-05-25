# CV HTML → PDF

Blitz renders tailored CVs as **HTML** (your template + structured data), then converts to **PDF** in an offscreen document for downloads and job-board uploads.

## Customise layout

1. Open **Settings** → **CV layout & PDF template**
2. Choose an editor mode:
   - **Visual** — rich text for the CV body + optional CSS panel
   - **HTML** — full template source with insert-variable helpers
   - **Import Word** — **How to export from Word** (recommended: Save As **Web Page, Filtered .htm**), upload `.htm`, `.docx`, or **Paste HTML**
3. On **Review**, expand **PDF HTML (download layout)** to edit the exact HTML for this application’s PDF (no AI)
4. **Save template** — stored in `chrome.storage.local` as `cv_html_template`
5. **Preview with sample data** before generating

### Match your original Word CV

Word **.docx** import is convenient but layout often differs from the desktop document. For the closest HTML:

1. Word → **File → Save As → Web Page, Filtered (*.htm)**
2. Blitz → Settings → Import Word → **Upload .htm** (or copy/paste the file contents)
3. Click **Fix Word lists & encoding** if needed — converts `MsoListParagraph` blocks to real `<ul><li>` bullets (Word does not export standard `<li>` tags)
4. Replace your name and sections with `{{fullName}}`, `{{#jobs}}`, etc.

The default template matches a classic UK CV layout (summary, education, skills, career blocks).

**Hyperlinks:** Use `{{{contactLineHtml}}}` in the template. URLs are taken from Settings → Your details (GitHub, Portfolio, LinkedIn). In the Visual editor, select text and click **Link**. Triple-brace fields `{{{…}}}` render rich HTML (anchors, bold, etc.).

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
