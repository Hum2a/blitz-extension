import { DEFAULT_CV_HTML_TEMPLATE } from "./cv-template-default.js";

const CV_PAGE_RE =
  /(<div\s+class="cv-page"[^>]*>)([\s\S]*?)(<\/div>)(\s*(?:<\/body>|<\/html>)?)/i;
const STYLE_RE = /(<style[^>]*>)([\s\S]*?)(<\/style>)/i;

export function extractStyleBlock(template) {
  const m = template.match(STYLE_RE);
  return m ? m[2] : "";
}

export function extractCvPageInner(template) {
  const m = template.match(CV_PAGE_RE);
  if (m) return m[2].trim();
  const body = template.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return body ? body[1].trim() : template;
}

export function mergeCvPageInner(template, innerHtml) {
  if (CV_PAGE_RE.test(template)) {
    return template.replace(CV_PAGE_RE, `$1${innerHtml}$3$4`);
  }
  return wrapCvPageShell(innerHtml, extractStyleBlock(template));
}

export function mergeStyleBlock(template, css) {
  if (STYLE_RE.test(template)) {
    return template.replace(STYLE_RE, `$1${css}$3`);
  }
  return template.replace("</head>", `<style>${css}</style></head>`);
}

export function wrapCvPageShell(innerHtml, css = "") {
  const styleBlock = css.trim()
    ? `<style>${css}</style>`
    : extractStyleBlock(DEFAULT_CV_HTML_TEMPLATE)
      ? `<style>${extractStyleBlock(DEFAULT_CV_HTML_TEMPLATE)}</style>`
      : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
${styleBlock.startsWith("<style") ? styleBlock : `<style>${styleBlock}</style>`}
</head>
<body>
<div class="cv-page">
${innerHtml}
</div>
</body>
</html>`;
}

export const TEMPLATE_VARIABLES = [
  { key: "fullName", label: "Full name", snippet: "{{fullName}}" },
  { key: "contactLine", label: "Contact line", snippet: "{{contactLine}}" },
  { key: "summary", label: "Summary", snippet: "{{summary}}" },
  { key: "careerNote", label: "Career note", snippet: "{{careerNote}}" },
  {
    key: "educationBlock",
    label: "Education loop",
    snippet: `{{#education}}
<div class="edu-block">
  <div class="edu-heading">{{heading}}</div>
  {{#lines}}<div class="edu-line">{{text}}</div>{{/lines}}
</div>
{{/education}}`,
  },
  {
    key: "skillsBlock",
    label: "Skills loop",
    snippet: `{{#skillGroups}}
<div class="skills-line"><strong>{{label}}:</strong> {{value}}</div>
{{/skillGroups}}`,
  },
  {
    key: "jobBlock",
    label: "Job loop",
    snippet: `{{#jobs}}
<div class="job-block">
  <div class="role-line">{{company}} | {{role}} {{dates}} | {{location}}</div>
  <ul>{{#bullets}}<li>{{text}}</li>{{/bullets}}</ul>
  {{#tech}}<div class="tech">Tech: {{tech}}</div>{{/tech}}
</div>
{{/jobs}}`,
  },
];
