const TEMPLATES = {
  modern: { margin: 20, titleSize: 18, bodySize: 10, accent: [59, 91, 219] },
  minimal: { margin: 24, titleSize: 16, bodySize: 10, accent: [30, 30, 30] },
  classic: { margin: 18, titleSize: 20, bodySize: 11, accent: [0, 0, 0] },
};

function generatePdfBase64(cvText, templateName = "modern") {
  const { jsPDF } = window.jspdf;
  const tpl = TEMPLATES[templateName] || TEMPLATES.modern;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - tpl.margin * 2;
  let y = tpl.margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(tpl.titleSize);
  doc.setTextColor(...tpl.accent);
  const titleLine = (cvText.split("\n")[0] || "Curriculum Vitae").slice(0, 80);
  doc.text(titleLine, tpl.margin, y);
  y += tpl.titleSize + 8;

  doc.setDrawColor(...tpl.accent);
  doc.setLineWidth(0.5);
  doc.line(tpl.margin, y, pageWidth - tpl.margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(tpl.bodySize);
  doc.setTextColor(40, 40, 40);

  const lines = doc.splitTextToSize(cvText, maxWidth);
  const lineHeight = tpl.bodySize * 1.35;
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - tpl.margin) {
      doc.addPage();
      y = tpl.margin;
    }
    doc.text(line, tpl.margin, y);
    y += lineHeight;
  }

  const dataUri = doc.output("datauristring");
  return dataUri.split(",")[1];
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GENERATE_PDF_OFFSCREEN") {
    try {
      const base64 = generatePdfBase64(message.payload.cvText, message.payload.template);
      sendResponse({ base64 });
    } catch (err) {
      sendResponse({ error: err.message });
    }
    return true;
  }
});
