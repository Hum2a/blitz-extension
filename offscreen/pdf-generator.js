const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

function waitForIframeLoad(iframe) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("PDF layout load timeout")), 15000);
    iframe.onload = () => {
      clearTimeout(timeout);
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    };
    iframe.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Could not load CV HTML for PDF"));
    };
  });
}

async function htmlToPdfBase64(html) {
  if (typeof html2canvas !== "function") {
    throw new Error(
      "html2canvas missing. Run: npm install && npm run copy:offscreen — then reload the extension."
    );
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin");
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:210mm;min-height:297mm;border:0;background:#fff;";
  document.body.appendChild(iframe);

  try {
    iframe.srcdoc = html;
    await waitForIframeLoad(iframe);

    const doc = iframe.contentDocument;
    const body = doc?.body;
    if (!body) throw new Error("CV HTML produced an empty document");

    const page = body.querySelector(".cv-page") || body;

    const canvas = await html2canvas(page, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: page.scrollWidth || 794,
      windowHeight: page.scrollHeight || 1123,
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const imgWidth = A4_WIDTH_MM;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= A4_HEIGHT_MM;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= A4_HEIGHT_MM;
    }

    const dataUri = pdf.output("datauristring");
    return dataUri.split(",")[1];
  } finally {
    iframe.remove();
  }
}

/** Legacy plain-text PDF (fallback) */
function generatePlainPdfBase64(cvText) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;
  const lines = doc.splitTextToSize(cvText || "", maxWidth);
  const lineHeight = 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }
  return doc.output("datauristring").split(",")[1];
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GENERATE_PDF_OFFSCREEN") {
    (async () => {
      try {
        const { html, cvText } = message.payload || {};
        const base64 = html?.trim()
          ? await htmlToPdfBase64(html)
          : generatePlainPdfBase64(cvText);
        sendResponse({ base64 });
      } catch (err) {
        sendResponse({ error: err.message || String(err) });
      }
    })();
    return true;
  }
});
