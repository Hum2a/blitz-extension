import { describe, expect, it } from "vitest";
import {
  extractCvPageInner,
  extractStyleBlock,
  mergeCvPageInner,
  wrapCvPageShell,
} from "../../../popup/src/lib/cv-template-utils.js";

const SAMPLE_TEMPLATE = `<!DOCTYPE html>
<html><head><style>.cv { color: red; }</style></head>
<body><div class="cv-page"><p>{{fullName}}</p></div></body></html>`;

describe("cv-template-utils", () => {
  it("extracts style and inner page", () => {
    expect(extractStyleBlock(SAMPLE_TEMPLATE)).toContain(".cv");
    expect(extractCvPageInner(SAMPLE_TEMPLATE)).toContain("{{fullName}}");
  });

  it("merges inner HTML into template shell", () => {
    const merged = mergeCvPageInner(SAMPLE_TEMPLATE, "<p>New body</p>");
    expect(merged).toContain("<p>New body</p>");
    expect(merged).toContain("cv-page");
  });

  it("wrapCvPageShell builds valid document", () => {
    const doc = wrapCvPageShell("<h1>Name</h1>", ".x { margin: 0; }");
    expect(doc).toMatch(/<!DOCTYPE html>/i);
    expect(doc).toContain("cv-page");
    expect(doc).toContain("Name");
  });
});
