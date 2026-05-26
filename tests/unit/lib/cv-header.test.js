import { describe, expect, it } from "vitest";
import {
  applyProfileCvHeader,
  applyTailoredCvHeader,
  buildCvHeaderPlainText,
  stripLeadingCvHeader,
} from "../../../popup/src/lib/cv-header.js";

const profile = {
  name: "Humza Butt",
  email: "humzabutt1711@hotmail.com",
  phone: "07450 251281",
  location: "Sutton, London",
  github: "https://github.com/Hum2a",
  portfolio: "https://humza-butt.space/?ref=d1bddi48",
  linkedin: "https://www.linkedin.com/in/humza-butt-201057208/",
};

describe("cv-header", () => {
  it("builds the three-line header from profile", () => {
    expect(buildCvHeaderPlainText(profile)).toBe(
      "Humza Butt\n• Sutton, London • 07450 251281\nhumzabutt1711@hotmail.com | GitHub | Portfolio | LinkedIn"
    );
  });

  it("prepends header and strips duplicate AI header", () => {
    const aiCv = `Humza Butt
• London • 000
email@test.com | GitHub

PROFESSIONAL SUMMARY
Experienced developer.`;

    const result = applyTailoredCvHeader(aiCv, profile);
    expect(result.startsWith("Humza Butt\n• Sutton, London")).toBe(true);
    expect(result).toContain("PROFESSIONAL SUMMARY");
    expect(result).toContain("Experienced developer.");
    expect(result).not.toContain("email@test.com");
  });

  it("stripLeadingCvHeader leaves body when no header present", () => {
    const body = "PROFESSIONAL SUMMARY\nLead engineer.";
    expect(stripLeadingCvHeader(body)).toBe(body);
  });

  it("applyProfileCvHeader sets cvDocument contact links", () => {
    const out = applyProfileCvHeader(
      {
        tailoredCV: "PROFESSIONAL SUMMARY\nSummary text.",
        cvDocument: { fullName: "Wrong", summary: "Summary text." },
      },
      profile
    );
    expect(out.tailoredCV).toMatch(/^Humza Butt/);
    expect(out.cvDocument.fullName).toBe("Humza Butt");
    expect(out.cvDocument.contactLineHtml).toContain('href="https://github.com/Hum2a"');
    expect(out.cvDocument.contactLineHtml).toContain("GitHub");
  });
});
