// Citirea PDF-urilor în browser cu pdf.js (local, fără server, fără AI).
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { buildPages, detectOutline, linesFromItems, type ParsedDocument, type PdfTextItem } from "../../lib/documents";

GlobalWorkerOptions.workerSrc = workerUrl;

export async function openPdf(source: File | Blob | ArrayBuffer | string): Promise<PDFDocumentProxy> {
  if (typeof source === "string") return getDocument({ url: source }).promise;
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  return getDocument({ data: new Uint8Array(data) }).promise;
}

/** PDF → pagini cu linii + cuprins. Folosește cuprinsul (bookmarks) din PDF dacă există. */
export async function parsePdf(source: File | Blob | ArrayBuffer | string, name = "document.pdf"): Promise<ParsedDocument> {
  const pdf = await openPdf(source);
  const linesByPage = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.filter((it) => "str" in it) as unknown as PdfTextItem[];
    linesByPage.push(linesFromItems(items, i));
  }
  const pages = buildPages(linesByPage);
  const detected = detectOutline(pages.flatMap((p) => p.lines));
  return { name: source instanceof File ? source.name : name, pages, ...detected };
}

/** Desenează o pagină într-un <canvas> (viewer de rezervă când nu există Client ID Adobe). */
export async function renderPage(pdf: PDFDocumentProxy, pageNumber: number, canvas: HTMLCanvasElement, width: number) {
  const page = await pdf.getPage(Math.min(Math.max(1, pageNumber), pdf.numPages));
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: (width / base.width) * devicePixelRatio });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${viewport.width / devicePixelRatio}px`;
  await page.render({ canvas, viewport }).promise;
}
