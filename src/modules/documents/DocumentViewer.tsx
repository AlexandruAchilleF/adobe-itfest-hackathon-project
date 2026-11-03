// Viewer de PDF: Adobe PDF Embed dacă există Client ID, altfel pdf.js (local, fără cont).
// Același API în ambele cazuri: ref.current.gotoPage(n).
import type { PDFDocumentProxy } from "pdfjs-dist";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "../../components/ui";
import { type AdobePdfHandle, AdobePdfViewer, adobeClientId } from "../adobe/AdobePdfViewer";
import { openPdf, renderPage } from "./pdfjs";

export interface DocumentViewerHandle {
  gotoPage(page: number): void;
}

export const DocumentViewer = forwardRef<DocumentViewerHandle, { file: File; className?: string }>(function DocumentViewer({ file, className = "h-[75vh]" }, ref) {
  const adobe = useRef<AdobePdfHandle>(null);
  const local = useRef<DocumentViewerHandle>(null);
  useImperativeHandle(ref, () => ({
    gotoPage: (p) => (adobeClientId ? void adobe.current?.gotoPage(p) : local.current?.gotoPage(p)),
  }));
  return adobeClientId ? <AdobePdfViewer ref={adobe} file={file} className={className} /> : <PdfJsViewer ref={local} file={file} className={className} />;
});

const PdfJsViewer = forwardRef<DocumentViewerHandle, { file: File; className?: string }>(function PdfJsViewer({ file, className }, ref) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    void openPdf(file).then((d) => alive && (setPdf(d), setPage(1)));
    return () => {
      alive = false;
    };
  }, [file]);

  useEffect(() => {
    if (pdf && canvas.current && box.current) void renderPage(pdf, page, canvas.current, Math.min(900, box.current.clientWidth - 16));
  }, [pdf, page]);

  useImperativeHandle(ref, () => ({ gotoPage: (p) => setPage(Math.min(Math.max(1, p), pdf?.numPages ?? p)) }), [pdf]);

  return (
    <div ref={box} className={`flex flex-col overflow-auto rounded-2xl bg-slate-200 p-2 ${className}`}>
      <div className="sticky top-0 mb-2 flex items-center justify-center gap-2 text-sm text-slate-900">
        <Button onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Button>
        <span data-testid="pdf-page">
          Pagina {page} / {pdf?.numPages ?? "…"}
        </span>
        <Button onClick={() => setPage((p) => Math.min(pdf?.numPages ?? p, p + 1))}>›</Button>
      </div>
      <canvas ref={canvas} className="mx-auto shadow-lg" />
    </div>
  );
});
