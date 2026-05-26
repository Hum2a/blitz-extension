/** Fuzzy match form labels to AI screening answers (LinkedIn Easy Apply, etc.). */

export function findAnswerForLabel(labelText, screeningAnswers) {
  if (!screeningAnswers?.length) return null;
  const lower = String(labelText || "").toLowerCase();
  return (
    screeningAnswers.find((a) => {
      const q = (a.question || "").toLowerCase();
      return lower.includes(q.slice(0, 20)) || q.includes(lower.slice(0, 20));
    }) || null
  );
}
