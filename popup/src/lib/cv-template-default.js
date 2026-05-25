/** Default A4 CV HTML — edit in Settings; uses Mustache-style {{tags}}. */
export const DEFAULT_CV_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Calibri, "Segoe UI", Arial, sans-serif;
    font-size: 10.5pt;
    color: #1a1a1a;
    line-height: 1.38;
    margin: 0;
    padding: 0;
    width: 210mm;
  }
  .cv-page { padding: 14mm 16mm 16mm; }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
  }
  .contact {
    font-size: 9.5pt;
    margin-bottom: 14px;
    color: #333;
  }
  h2 {
    font-size: 11pt;
    font-weight: 700;
    margin: 14px 0 6px;
    padding: 0;
  }
  .summary p {
    margin: 0 0 8px;
    text-align: justify;
  }
  .edu-block, .job-block { margin-bottom: 10px; }
  .role-line {
    font-weight: 600;
    font-size: 10.5pt;
    margin-bottom: 4px;
  }
  .edu-heading { font-weight: 600; }
  .edu-line { margin: 1px 0; }
  ul {
    margin: 4px 0 6px;
    padding-left: 18px;
  }
  li { margin-bottom: 3px; }
  .tech {
    font-size: 9.5pt;
    font-style: italic;
    margin-top: 2px;
    color: #333;
  }
  .skills-line { margin-bottom: 4px; }
  .skills-line strong { font-weight: 600; }
  .career-note {
    font-size: 9.5pt;
    font-style: italic;
    margin-bottom: 8px;
    color: #444;
  }
</style>
</head>
<body>
<div class="cv-page">
  <h1>{{fullName}}</h1>
  <div class="contact">{{contactLine}}</div>

  <h2>Professional Summary</h2>
  <div class="summary"><p>{{summary}}</p></div>

  <h2>Education</h2>
  {{#education}}
  <div class="edu-block">
    <div class="edu-heading">{{heading}}</div>
    {{#lines}}<div class="edu-line">{{text}}</div>{{/lines}}
  </div>
  {{/education}}

  <h2>Technical Skills</h2>
  {{#skillGroups}}
  <div class="skills-line"><strong>{{label}}:</strong> {{value}}</div>
  {{/skillGroups}}

  <h2>Career</h2>
  {{#careerNote}}<div class="career-note">{{careerNote}}</div>{{/careerNote}}
  {{#jobs}}
  <div class="job-block">
    <div class="role-line">{{company}} | {{role}} {{dates}} | {{location}}</div>
    <ul>{{#bullets}}<li>{{text}}</li>{{/bullets}}</ul>
    {{#tech}}<div class="tech">Tech: {{tech}}</div>{{/tech}}
  </div>
  {{/jobs}}
</div>
</body>
</html>`;

export const CV_TEMPLATE_VARIABLES_HELP = `Available fields (Mustache-style):
  {{fullName}}  {{contactLine}}  {{summary}}  {{careerNote}}

  {{#education}}  {{heading}}  {{#lines}}  {{text}}  {{/lines}}  {{/education}}

  {{#skillGroups}}  {{label}}  {{value}}  {{/skillGroups}}

  {{#jobs}}  {{company}}  {{role}}  {{dates}}  {{location}}
    {{#bullets}}  {{text}}  {{/bullets}}
    {{#tech}}  {{tech}}  {{/tech}}
  {{/jobs}}`;
