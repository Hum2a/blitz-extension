export async function generatePdf(cvText, template = "modern") {
  const result = await chrome.runtime.sendMessage({
    type: "GENERATE_PDF",
    payload: { cvText, template },
  });
  if (result?.error) throw new Error(result.error);
  return result.base64;
}
