// Business canvas generat de AI: problemă, cine plătește, piață, adopție, întrebări grele de la juriu.
// Întrebările de validare se trimit direct în sondajul live.

import { useState } from "react";
import { useLocation } from "wouter";
import { Button, Card, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { AiError, ask } from "../lib/ai";
import { BUSINESS_SYSTEM_PROMPT, BusinessCanvas, canvasToMarkdown, exampleCanvas, type BusinessCanvas as Canvas } from "../lib/business";
import { downloadText } from "../lib/share";

export const SURVEY_HANDOFF_KEY = "hackathon:survey-questions";

export function BusinessPage() {
  const [, navigate] = useLocation();
  const [idea, setIdea] = useState("Asistent care citește caietele de sarcini din licitațiile publice și le spune firmelor mici, cu citate, dacă îndeplinesc cerințele.");
  const [theme, setTheme] = useState("");
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await ask({
        system: BUSINESS_SYSTEM_PROMPT,
        prompt: `Ideea: ${idea}${theme ? `\nTema hackathonului: ${theme}` : ""}\nContext: hackathon Adobe la ITFest, București, juriu format din ingineri Adobe.`,
        schema: BusinessCanvas,
        mock: exampleCanvas,
      });
      setCanvas(data);
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  function toSurvey() {
    if (!canvas) return;
    try {
      localStorage.setItem(SURVEY_HANDOFF_KEY, JSON.stringify(canvas.validation_survey));
    } catch {
      /* ignorăm */
    }
    navigate("/survey");
  }

  return (
    <div>
      <PageHeader
        title="Business canvas"
        description="Ce problemă rezolvăm, cine plătește și cum ajunge produsul la oameni. Juriul vrea răspunsuri concrete, nu „toată lumea, freemium”."
      />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="Ideea">
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Tema hackathonului (opțional)"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
            <Button variant="primary" className="mt-3" onClick={generate} disabled={busy || !idea.trim()}>
              {busy && <Spinner />} Generează canvas
            </Button>
            <ErrorNote error={error?.msg} hint={error?.hint} />
          </Card>
          {canvas && (
            <Card title="Mai departe">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={toSurvey}>
                  Validează cu un sondaj live →
                </Button>
                <Button onClick={() => downloadText(canvasToMarkdown(canvas), "business-canvas.md", "text/markdown")}>Export Markdown</Button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Puneți întrebările participanților și mentorilor în timpul hackathonului. „18 din 25 au spus că ar plăti” bate orice estimare de piață.
              </p>
            </Card>
          )}
        </div>
        {canvas ? <CanvasView c={canvas} /> : <Checklist />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">{title}</h3>
      <div className="space-y-1.5 text-sm text-slate-200">{children}</div>
    </section>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <p>
    <span className="text-slate-400">{k}: </span>
    {v}
  </p>
);

function CanvasView({ c }: { c: Canvas }) {
  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-accent/10 p-4 text-lg font-semibold text-accent">{c.one_liner}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Problema">
          <p>{c.problem.statement}</p>
          <Row k="Cine suferă" v={c.problem.who_suffers} />
          <Row k="Cât de des / cât costă" v={c.problem.how_often} />
          <Row k="Ce fac azi" v={c.problem.current_workaround} />
        </Section>
        <Section title="Cine folosește, cine plătește">
          <Row k="Utilizator" v={c.customers.user} />
          <Row k="Cumpărător" v={c.customers.buyer} />
          <Row k="Primii clienți" v={c.customers.early_adopters} />
        </Section>
        <Section title="Valoare & MVP">
          <p>{c.value_proposition}</p>
          <Row k="Demo" v={c.mvp} />
        </Section>
        <Section title="Model de business">
          <Row k="Model" v={c.business_model.model} />
          <Row k="Preț" v={c.business_model.pricing} />
          <Row k="De ce plătesc" v={c.business_model.why_they_pay} />
        </Section>
        <Section title="Piață">
          <Row k="Primul segment" v={c.market.first_segment} />
          <Row k="Dimensionare" v={c.market.sizing} />
        </Section>
        <Section title="Adopție">
          <Row k="Canale" v={c.adoption.channels.join(" · ")} />
          <Row k="Ce îi oprește" v={c.adoption.friction.join(" · ")} />
          <Row k="De ce revin" v={c.adoption.hook} />
        </Section>
        <Section title="Concurență">
          {c.competition.map((x) => (
            <Row key={x.name} k={x.name} v={x.gap} />
          ))}
        </Section>
        <Section title="Riscuri">
          {c.risks.map((r) => (
            <Row key={r.risk} k={r.risk} v={r.mitigation} />
          ))}
        </Section>
      </div>
      <Section title="Întrebări grele de la juriu">
        {c.judge_questions.map((q) => (
          <details key={q.question} className="rounded-xl bg-slate-800/50 px-3 py-2">
            <summary className="cursor-pointer font-medium">{q.question}</summary>
            <p className="mt-1 text-slate-300">{q.answer}</p>
          </details>
        ))}
      </Section>
      <Section title="Metrici">
        <p>{c.metrics.join(" · ")}</p>
      </Section>
    </div>
  );
}

function Checklist() {
  const items = [
    ["Problema", "O propoziție, fără să pomenești soluția. Cine anume suferă și cât de des?"],
    ["Cine plătește", "Utilizatorul și cumpărătorul sunt adesea diferiți (elev vs. școală, locatar vs. firma de administrare)."],
    ["Preț", "Un număr concret. „Freemium” nu e un preț."],
    ["Primul segment", "Mic și accesibil: „cele 400 de firme de administrare din București”, nu „piața globală de design”."],
    ["Adopție", "Cum îi găsiți pe primii 10 clienți? Ce i-ar opri? De ce ar reveni mâine?"],
    ["Dovadă", "Validați la hackathon: sondaj live cu participanții și mentorii (pagina Sondaj)."],
  ];
  return (
    <Card title="Ce vrea juriul să audă">
      <ol className="space-y-3">
        {items.map(([k, v], i) => (
          <li key={k} className="flex gap-3 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent">{i + 1}</span>
            <span>
              <b>{k}.</b> <span className="text-slate-300">{v}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
