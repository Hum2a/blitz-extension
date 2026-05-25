import { readFileSync } from "fs";
import { resolveCvDocument } from "../popup/src/lib/cv-document.js";
import {
  injectHumzaWordCvTemplate,
  isHumzaWordCvTemplate,
} from "../popup/src/lib/humza-word-cv-inject.js";

const templatePath =
  "e:/Humza/Job Searching/CV's/Past CVs/Humza Butt CV - My Finance Club.htm";
const template = readFileSync(templatePath, "latin1");

const tailored = `HUMZA BUTT
humzab1711@hotmail.com

PROFESSIONAL SUMMARY
Full-stack developer and technical problem-solver with IT support focus for Solar Systems role.

EDUCATION
University of Portsmouth – 2019 – 2023
MEng Computer Science

TECHNICAL SKILLS
Operating Systems: Windows 10/11, macOS, Linux

CAREER
TestCo | IT Support Engineer | Jan 2024 – Present | London
• Resolved 50 tickets daily
Tech: Windows, Active Directory`;

const doc = resolveCvDocument({
  cvDocument: null,
  tailoredCV: tailored,
  userProfile: { name: "Humza Butt", email: "humzab1711@hotmail.com" },
});

console.log("isWord", isHumzaWordCvTemplate(template));
console.log("doc summary", doc.summary?.slice(0, 100));
const { html, changed } = injectHumzaWordCvTemplate(template, doc, {});
console.log("changed", changed);
console.log("has tailored summary", html.includes("IT support focus for Solar"));
console.log("has old QA text", html.includes("dedicated QA role"));
console.log("has TestCo", html.includes("TestCo"));
console.log("changed valid", changed);
