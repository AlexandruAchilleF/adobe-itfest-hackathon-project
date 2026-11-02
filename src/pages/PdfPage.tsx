// Adobe PDF Embed API + întrebări despre document. AI-ul primește PDF-ul întreg
// și răspunde cu pagina sursă, iar viewer-ul sare la ea.

import { useRef, useState } from "react";
import { z } from "zod";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { AiError, ask } from "../lib/ai";
import { type AdobePdfHandle, AdobePdfViewer } from "../modules/adobe/AdobePdfViewer";

const Answer = z.object({
  answer: z.string(),
  page: z.number().describe("numărul paginii (de la 1) unde se află informația"),
  quote: z.string().describe("citat scurt, exact din document"),
});

export function PdfPage() {
  const viewer = useRef<AdobePdfHandle>(null);
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("Care e ideea principală a documentului?");
  const [answer, setAnswer] = useState<z.infer<typeof Answer> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);

  async function askPdf() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await ask({
        prompt: `Răspunde la întrebare folosind doar documentul atașat. Întrebare: ${question}`,
        schema: Answer,
        files: [file],
        mock: { answer: "(demo) Documentul descrie regulile hackathonului.", page: 1, quote: "Construiește. Colaborează. Inovează." },
      });
      setAnswer(data);
      await viewer.current?.gotoPage(data.page);
      if (data.quote) await viewer.current?.search(data.quote.slice(0, 60));
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Adobe PDF"
        description="Viewer oficial Adobe (PDF Embed API) + AI care răspunde cu pagina și citatul, iar documentul sare singur acolo."
      />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card title="Document">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setAnswer(null);
            }}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
          />
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="mt-4 h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
          <Button variant="primary" className="mt-3" onClick={askPdf} disabled={!file || busy}>
            {busy && <Spinner />} Întreabă
          </Button>
          <ErrorNote error={error?.msg} hint={error?.hint} />
          {answer && (
            <div className="mt-4 space-y-2 text-sm">
              <p>{answer.answer}</p>
              <blockquote className="border-l-2 border-accent pl-3 text-slate-400">„{answer.quote}”</blockquote>
              <Button onClick={() => viewer.current?.gotoPage(answer.page)}>Mergi la pagina {answer.page}</Button>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">
            PDF-ul se trimite întreg la AI (limită ~4 MB pe Vercel). Viewer-ul cere <Code>VITE_ADOBE_PDF_CLIENT_ID</Code>.
          </p>
        </Card>
        {file ? (
          <AdobePdfViewer ref={viewer} file={file} className="h-[75vh]" />
        ) : (
          <div className="grid h-[50vh] place-items-center rounded-2xl border border-dashed border-slate-700 text-slate-500">Alege un PDF</div>
        )}
      </div>
    </div>
  );
}
