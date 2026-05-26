import { describe, expect, it } from "vitest";
import { findAnswerForLabel } from "../../../popup/src/lib/screening-match.js";

describe("screening-match", () => {
  const answers = [
    { question: "Why do you want to work here?", answer: "Culture fit" },
    { question: "Years of experience with React?", answer: "5 years" },
  ];

  it("matches overlapping label text", () => {
    const match = findAnswerForLabel("Why do you want to work here? (required)", answers);
    expect(match?.answer).toBe("Culture fit");
  });

  it("matches when label contains question prefix", () => {
    const match = findAnswerForLabel("Years of experience", answers);
    expect(match?.answer).toBe("5 years");
  });

  it("returns null when no screening answers", () => {
    expect(findAnswerForLabel("Email", [])).toBeNull();
    expect(findAnswerForLabel("Email", null)).toBeNull();
  });
});
