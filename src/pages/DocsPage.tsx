// Rețeta DOCUMENTE („Rethink Reading"): PDF → structură JSON (titlu, H1-H3, pagini) →
// întrebări cu citate VERIFICATE în text → secțiunile cele mai utile pentru o persona.
// Exact problemele de la Adobe India Hackathon 2025, plus viewerul Adobe.

import { useRef, useState } from "react";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { AiError } from "../lib/ai";
import { askDocument, type DocAnswerResult, rankSections } from "../lib/docAi";
import type { ParsedDocument } from "../lib/documents";
import { downloadText } from "../lib/share";
import { DocumentViewer, type DocumentViewerHandle } from "../modules/documents/DocumentViewer";
import { parsePdf } from "../modules/documents/pdfjs";
import { z } from "zod";
import { defineAction } from "../lib/agent";
import { mascot, moodForChecks } from "../modules/mascot/mascot";
import { useMascotPage } from "../modules/mascot/page";

const SAMPLE = "/samples/caiet-de-sarcini-exemplu.pdf";

export function DocsPage() {
  const viewer = useRef<DocumentViewerHandle>(null);
  const [file, setFile] = useState<File | null>(null);
  const [doc, setDoc] = useState<ParsedDocument | null>(null);
  const [question, setQuestion] = useState("Ce documente trebuie să depunem și până când?");
  const [answer, setAnswer] = useState<DocAnswerResult | null>(null);
  const [persona, setPersona] = useState("Firmă de IT cu 8 angajați, la prima licitație publică");
  const [job, setJob] = useState("Să decidă în 30 de minute dacă îndeplinește cerințele și merită să participe");
  const [ranked, setRanked] = useState<Awaited<ReturnType<typeof rankSections>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);

  async function load(f: File) {
    setBusy("parse");
    setError(null);
    setAnswer(null);
    setRanked(null);
    try {
      setFile(f);
      const parsed = await parsePdf(f);
      setDoc(parsed);
      mascot.say(`Am citit ${parsed.pages.length} pagini și am găsit ${parsed.outline.length} titluri. Întreabă-mă ceva!`, "happy");
    } catch (err) {
      setError({ msg: `Nu am putut citi PDF-ul: ${(err as Error).message}` });
    } finally {
      setBusy(null);
    }
  }

  async function run<T>(kind: string, fn: () => Promise<T>, set: (v: T) => void) {
    setBusy(kind);
    setError(null);
    try {
      set(await fn());
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(null);
    }
  }

  const go = (p: number) => viewer.current?.gotoPage(p);

  async function openSample() {
    const blob = await (await fetch(SAMPLE)).blob();
    await load(new File([blob], "caiet-de-sarcini-exemplu.pdf", { type: "application/pdf" }));
  }

  function askNow(q: string) {
    if (!doc) throw new Error("încarcă întâi un document");
    setQuestion(q);
    return run(
      "ask",
      () => askDocument(doc, q),
      (a) => {
        setAnswer(a);
        const r = moodForChecks(a.citations.filter((c) => c.verified).length, a.citations.length);
        mascot.say(r.message, r.mood);
      },
    );
  }

  // Uli poate face aceleași lucruri, la cerere, și prezintă pagina
  useMascotPage({
    title: "Documente",
    context: () =>
      doc ? `Document deschis: ${doc.title || doc.name}, ${doc.pages.length} pagini. Titluri: ${doc.outline.map((h) => `${h.text} (p. ${h.page})`).join("; ")}` : "Niciun document deschis.",
    actions: [
      defineAction({ name: "open_sample", kind: "read", description: "Deschide documentul exemplu", args: z.object({}), run: openSample, examples: ["deschide exemplul"], mockArgs: {} }),
      defineAction({
        name: "ask_document",
        kind: "read",
        description: "Pune o întrebare documentului deschis; răspunsul vine cu citate verificate",
        args: z.object({ question: z.string() }),
        run: ({ question: q }) => askNow(q),
        examples: ["întreabă documentul ce documente trebuie depuse"],
        mockArgs: (input: string) => ({ question: input.replace(/^.*?întreabă( documentul)?\s*/i, "") || input }),
      }),
      defineAction({
        name: "show_pdf_page",
        kind: "read",
        description: "Arată o anumită pagină din document",
        args: z.object({ page: z.number() }),
        run: ({ page: p }) => go(p),
        examples: ["arată pagina 3"],
        mockArgs: (input: string) => ({ page: Number(input.match(/\d+/)?.[0] ?? 1) }),
      }),
    ],
    tour: [
      { target: "doc-upload", text: "Începe aici: încarcă un PDF sau folosește exemplul. Structura o citesc local, fără AI." },
      { target: "doc-ask", text: "Pune o întrebare. Răspund doar cu citate din document și caut fiecare citat în text, ca să nu inventez." },
      { target: "doc-persona", text: "Spune-mi cine ești și ce ai de făcut, iar eu îți arăt ce secțiuni contează pentru tine." },
      { target: "doc-viewer", text: "Orice citat sau titlu te duce direct la pagina lui din document." },
    ],
  });

  return (
    <div>
      <PageHeader
        title="Documente → răspunsuri verificate"
        description="Structura PDF-ului se extrage local (fără AI). AI-ul răspunde doar cu citate din document, iar fiecare citat e căutat în text: dacă nu există, e marcat. Rețeta pentru teme cu documente, educație sau „Rethink Reading”."
      />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="1. Documentul" tour="doc-upload">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm">
                📄 Încarcă PDF
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && void load(e.target.files[0])} />
              </label>
              <Button onClick={() => void openSample()}>
                Folosește exemplul
              </Button>
            </div>
            {busy === "parse" && <p className="mt-2 text-sm text-slate-400">Citesc documentul…</p>}
            {doc && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">{doc.title || doc.name}</p>
                <p className="text-slate-400">
                  {doc.pages.length} pagini · {doc.outline.length} titluri detectate
                </p>
                <ul className="mt-2 max-h-48 space-y-1 overflow-auto" data-testid="outline">
                  {doc.outline.map((h, i) => (
                    <li key={i} style={{ paddingLeft: (Number(h.level[1]) - 1) * 12 }}>
                      <button className="text-left hover:text-accent" onClick={() => go(h.page)}>
                        <span className="text-xs text-slate-500">{h.level}</span> {h.text} <span className="text-xs text-slate-500">p. {h.page}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => downloadText(JSON.stringify({ title: doc.title, outline: doc.outline }, null, 2), "structura.json", "application/json")}
                >
                  ⬇ Structura JSON
                </Button>
              </div>
            )}
          </Card>
          {doc && (
            <Card title="2. Întreabă documentul" tour="doc-ask">
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="h-20 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
              <Button variant="primary" className="mt-2" disabled={busy !== null || !question.trim()} onClick={() => void askNow(question)}>
                {busy === "ask" && <Spinner />} Întreabă
              </Button>
              {answer && (
                <div className="mt-3 space-y-2 text-sm" data-testid="answer">
                  <p>{answer.answer}</p>
                  {answer.citations.map((c, i) => (
                    <button key={i} onClick={() => go(c.page)} className="block w-full rounded-xl bg-slate-800/60 p-2 text-left hover:bg-slate-800">
                      <span className={c.verified ? (c.corrected ? "text-amber-300" : "text-emerald-300") : "text-rose-300"}>
                        {c.verified ? (c.corrected ? "⚠ găsit pe altă pagină" : "✓ verificat în text") : "✗ citatul nu există în document"}
                      </span>{" "}
                      · p. {c.page}
                      <span className="block text-slate-300">„{c.quote}”</span>
                    </button>
                  ))}
                  {!answer.found && <p className="text-amber-300">Documentul nu pare să conțină răspunsul.</p>}
                </div>
              )}
            </Card>
          )}
          {doc && (
            <Card title="3. Ce contează pentru cine" tour="doc-persona">
              <input value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" aria-label="Persona" />
              <input value={job} onChange={(e) => setJob(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm" aria-label="Sarcina" />
              <Button className="mt-2" disabled={busy !== null || !doc.outline.length} onClick={() => run("rank", () => rankSections(doc, persona, job), setRanked)}>
                {busy === "rank" && <Spinner />} Ierarhizează secțiunile
              </Button>
              {ranked && (
                <ol className="mt-3 space-y-2 text-sm">
                  {ranked.map((s, i) => (
                    <li key={i}>
                      <button onClick={() => go(s.page)} className="w-full rounded-xl bg-slate-800/60 p-2 text-left hover:bg-slate-800">
                        <b>{s.title}</b> <span className="text-accent">{s.relevance}%</span> · p. {s.page}
                        <span className="block text-slate-400">{s.why}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}
          <ErrorNote error={error?.msg} hint={error?.hint} />
          <p className="text-xs text-slate-500">
            În cod: <Code>parsePdf()</Code>, <Code>askDocument()</Code>, <Code>verifyCitations()</Code>, <Code>rankSections()</Code>.
          </p>
        </div>
        {file ? <div data-tour="doc-viewer"><DocumentViewer ref={viewer} file={file} /></div> : <div data-tour="doc-viewer" className="grid h-[50vh] place-items-center rounded-2xl border border-dashed border-slate-700 text-slate-500">Alege un PDF sau exemplul</div>}
      </div>
    </div>
  );
}
