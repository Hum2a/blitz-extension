export async function generatePdf(payload) {
  const result = await chrome.runtime.sendMessage({
    type: "GENERATE_PDF",
    payload,
  });
  if (result?.error) throw new Error(result.error);
  return result.base64;
}
