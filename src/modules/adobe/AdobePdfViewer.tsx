// Adobe PDF Embed API (gratuit, are nevoie doar de un Client ID legat de domeniu).
// Docs: https://developer.adobe.com/document-services/docs/overview/pdf-embed-api/
//
//   const ref = useRef<AdobePdfHandle>(null);
//   <AdobePdfViewer ref={ref} file={file} />
//   ref.current?.gotoPage(3); ref.current?.search("buget");

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";

const SDK_URL = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
export const adobeClientId = import.meta.env.VITE_ADOBE_PDF_CLIENT_ID as string | undefined;

interface AdobeApis {
  gotoLocation(page: number, x?: number, y?: number): Promise<void>;
  search(term: string): Promise<unknown>;
  getCurrentPage(): Promise<number>;
}
interface AdobeViewer {
  getAPIs(): Promise<AdobeApis>;
}
interface AdobeView {
  previewFile(
    file: { content: { promise: Promise<ArrayBuffer> } | { location: { url: string } }; metaData: { fileName: string } },
    options: Record<string, unknown>,
  ): Promise<AdobeViewer>;
}
declare global {
  interface Window {
    AdobeDC?: { View: new (opts: { clientId: string; divId: string }) => AdobeView };
  }
}

let sdkPromise: Promise<void> | null = null;
function loadSdk(): Promise<void> {
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    if (window.AdobeDC) return resolve();
    document.addEventListener("adobe_dc_view_sdk.ready", () => resolve(), { once: true });
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Nu am putut încărca SDK-ul Adobe (internet?)."));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export interface AdobePdfHandle {
  gotoPage(page: number): Promise<void>;
  search(term: string): Promise<void>;
  currentPage(): Promise<number | null>;
}

interface Props {
  /** File încărcat de utilizator sau URL public */
  file: File | string;
  className?: string;
  embedMode?: "SIZED_CONTAINER" | "FULL_WINDOW" | "IN_LINE" | "LIGHT_BOX";
}

export const AdobePdfViewer = forwardRef<AdobePdfHandle, Props>(function AdobePdfViewer(
  { file, className = "h-[70vh]", embedMode = "SIZED_CONTAINER" },
  ref,
) {
  const divId = `adobe-pdf-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const apisRef = useRef<AdobeApis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adobeClientId) {
      setError("Lipsește VITE_ADOBE_PDF_CLIENT_ID în .env.");
      return;
    }
    let cancelled = false;
    apisRef.current = null;
    loadSdk()
      .then(async () => {
        if (cancelled || !window.AdobeDC) return;
        const view = new window.AdobeDC.View({ clientId: adobeClientId, divId });
        const content =
          typeof file === "string" ? { location: { url: file } } : { promise: file.arrayBuffer() };
        const fileName = typeof file === "string" ? file.split("/").pop() || "document.pdf" : file.name;
        const viewer = await view.previewFile(
          { content, metaData: { fileName } },
          { embedMode, showDownloadPDF: false, showPrintPDF: false },
        );
        if (!cancelled) apisRef.current = await viewer.getAPIs();
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [file, divId, embedMode]);

  useImperativeHandle(ref, () => ({
    gotoPage: async (page) => void (await apisRef.current?.gotoLocation(page)),
    search: async (term) => void (await apisRef.current?.search(term)),
    currentPage: async () => (apisRef.current ? apisRef.current.getCurrentPage() : null),
  }));

  if (error) {
    return (
      <div className={`grid place-items-center rounded-2xl border border-dashed border-slate-600 p-6 text-center text-sm text-slate-400 ${className}`}>
        <div>
          <p className="font-medium text-slate-200">Viewer-ul Adobe nu e disponibil</p>
          <p className="mt-1">{error}</p>
        </div>
      </div>
    );
  }
  return <div id={divId} className={`overflow-hidden rounded-2xl bg-white ${className}`} />;
});
