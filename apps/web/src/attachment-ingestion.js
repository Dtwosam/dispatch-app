import * as pdfjsLib from "/@modules/pdfjs-dist/build/pdf.mjs";
import { createWorker } from "/@modules/tesseract.js/dist/tesseract.esm.min.js";

const PDF_WORKER_SRC = "/@modules/pdfjs-dist/build/pdf.worker.mjs";
const MAX_INLINE_TEXT_LENGTH = 20000;
const MAX_PDF_PAGES = 8;
const OCR_WORKER_SRC = "/@modules/tesseract.js/dist/worker.min.js";
const OCR_CORE_PATH = "/@modules/tesseract.js-core";
const OCR_LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0";

let mammothLoader = null;
let ocrWorkerPromise = null;

pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

export async function ingestAttachmentFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type || guessMimeType(extension) || "application/octet-stream";

  if (isPdf(extension, mimeType)) {
    const text = await extractPdfText(file);
    const finalText = hasMeaningfulText(text) ? text : await extractPdfTextWithOcr(file);
    return buildAttachmentPayload(file, finalText, hasMeaningfulText(text) ? "pdf" : "pdf_ocr");
  }

  if (isDocx(extension, mimeType)) {
    const text = await extractDocxText(file);
    return buildAttachmentPayload(file, text, "docx");
  }

  if (isTextLike(extension, mimeType)) {
    const text = await file.text();
    return buildAttachmentPayload(file, text, "text");
  }

  if (isImageLike(extension, mimeType)) {
    const text = await extractImageTextWithOcr(file);
    return buildAttachmentPayload(file, text, "image_ocr");
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, images, TXT, MD, CSV, or JSON.");
}

function buildAttachmentPayload(file, text, source) {
  const trimmed = (text || "").replace(/\u0000/g, "").trim();
  return {
    title: file.name.replace(/\.[^.]+$/, ""),
    pointer: `inline://files/${file.name}`,
    textContent: trimmed.slice(0, MAX_INLINE_TEXT_LENGTH),
    mimeType: file.type || null,
    sizeBytes: file.size,
    extractionSource: source,
    truncated: trimmed.length > MAX_INLINE_TEXT_LENGTH,
  };
}

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const parts = [];
  const pageCount = Math.min(pdfDocument.numPages, MAX_PDF_PAGES);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      parts.push(`Page ${pageNumber}: ${text}`);
    }
  }

  return parts.join("\n");
}

async function extractPdfTextWithOcr(file) {
  const buffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const parts = [];
  const pageCount = Math.min(pdfDocument.numPages, 3);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport }).promise;
    const text = await recognizeWithOcr(canvas);
    if (text) {
      parts.push(`Page ${pageNumber}: ${text}`);
    }
  }

  return parts.join("\n");
}

async function extractDocxText(file) {
  const mammoth = await loadMammoth();
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return (result?.value || "").replace(/\s+\n/g, "\n").trim();
}

async function extractImageTextWithOcr(file) {
  return recognizeWithOcr(file);
}

function loadMammoth() {
  if (window.mammoth) {
    return Promise.resolve(window.mammoth);
  }
  if (mammothLoader) {
    return mammothLoader;
  }

  mammothLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mammoth-loader="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.mammoth), { once: true });
      existing.addEventListener("error", () => reject(new Error("Mammoth failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "/@modules/mammoth/mammoth.browser.js";
    script.async = true;
    script.dataset.mammothLoader = "true";
    script.addEventListener("load", () => {
      if (window.mammoth) {
        resolve(window.mammoth);
      } else {
        reject(new Error("Mammoth did not expose a browser parser."));
      }
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Mammoth failed to load.")), { once: true });
    document.head.appendChild(script);
  });

  return mammothLoader;
}

async function recognizeWithOcr(imageLike) {
  const worker = await loadOcrWorker();
  const result = await worker.recognize(imageLike);
  return (result?.data?.text || "").replace(/\s+\n/g, "\n").replace(/\s+/g, " ").trim();
}

function loadOcrWorker() {
  if (ocrWorkerPromise) return ocrWorkerPromise;
  ocrWorkerPromise = createWorker("eng", 1, {
    workerPath: OCR_WORKER_SRC,
    corePath: OCR_CORE_PATH,
    langPath: OCR_LANG_PATH,
  });
  return ocrWorkerPromise;
}

function isPdf(extension, mimeType) {
  return extension === "pdf" || mimeType === "application/pdf";
}

function isDocx(extension, mimeType) {
  return extension === "docx" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function isTextLike(extension, mimeType) {
  return Boolean(
    mimeType.startsWith("text/") ||
    ["txt", "md", "csv", "json"].includes(extension) ||
    mimeType === "application/json",
  );
}

function isImageLike(extension, mimeType) {
  return Boolean(
    mimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp"].includes(extension),
  );
}

function hasMeaningfulText(text) {
  return text.replace(/\s+/g, " ").trim().length >= 80;
}

function guessMimeType(extension) {
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "md":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "json":
      return "application/json";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "txt":
      return "text/plain";
    default:
      return null;
  }
}
