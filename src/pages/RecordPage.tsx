// Fișa cererii (/fisa/:id): documentul final, gata de tipărit sau salvat ca PDF.
// Cifrele, oamenii și cronologia le pune codul din date; AI-ul propune doar textul de rezumat,
// pe care omul îl editează înainte de tipărire.

import { useEffect, useState } from "react";
import { z } from "zod";
import { useLocation } from "wouter";
import { EditableText } from "../components/EditableText";
import { Button, Spinner } from "../components/ui";
import { ask } from "../lib/ai";
import { checkDocument, Doc } from "../lib/checks";
import { describeEntry, stateOf } from "../lib/flow";
import { useMe } from "../lib/identity";
import { cycleMinutes, formatDuration } from "../lib/metrics";
import { useCollection } from "../lib/store";
import { scenario } from "../scenario/config";
import { categoryOf, requests, roleOf } from "../scenario/model";
import { ChecksList, DocTable } from "../scenario/ui/DocumentIntake";
import { timeOf } from "../scenario/ui/parts";

const S = scenario;
const Summary = z.object({ summary: z.string().describe("2-3 propoziții, ton administrativ, fără cifre noi") });

export function RecordPage() {
  const [location] = useLocation();
  const id = location.split("/")[2] ?? "";
  const { items, loading } = useCollection(requests);
  const { nameOf } = useMe();
  const rec = items.find((r) => r.id === id);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const doc = rec ? Doc.safeParse(rec.data.extra?.doc) : null;
  const facts = rec
    ? [
        `${S.request.singular[0].toUpperCase()}${S.request.singular.slice(1)}: ${rec.data.title} (${categoryOf(rec.data.category).label})`,
        `${roleOf(S.flow.requester).label}: ${nameOf(rec.data.requester)}`,
        ...Object.entries(rec.data.actors).map(([role, h]) => `${roleOf(role).label}: ${nameOf(h)}`),
        `Valoare: ${rec.data.quantity} ${rec.data.unit}`,
        `Stare: ${stateOf(S.flow, rec.data.status).label}`,
      ]
    : [];

  // rezumatul propus de AI, construit doar din faptele de mai sus; mock-ul e aceleași fapte, în propoziții
  async function propose() {
    if (!rec) return;
    setBusy(true);
    try {
      const mock = `${nameOf(rec.data.requester)} a solicitat „${rec.data.title}”, în valoare de ${rec.data.quantity} ${rec.data.unit}. ${rec.data.history
        .slice(1)
        .map((h) => `${describeEntry(S.flow, h, nameOf)}${h.note ? ` (${h.note})` : ""}`)
        .join(", ")}. Starea actuală: ${stateOf(S.flow, rec.data.status).label}.`;
      const { data } = await ask({
        system: "Scrii rezumatul unei fișe administrative. Folosești DOAR faptele date, fără cifre sau nume noi.",
        prompt: [...facts, ...rec.data.history.map((h) => `${timeOf(h.at)} ${describeEntry(S.flow, h, nameOf)}${h.note ? `: ${h.note}` : ""}`)].join("\n"),
        schema: Summary,
        mock: { summary: mock },
      });
      setSummary(data.summary);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (rec && !summary) void propose();
  }, [rec?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <p className="text-slate-400">Se încarcă…</p>;
  if (!rec) return <p className="text-slate-400">Nu există fișa asta.</p>;
  const cycle = cycleMinutes(S.flow, rec.data);
  const others = items.filter((r) => r.id !== rec.id).flatMap((r) => {
    const d = Doc.safeParse(r.data.extra?.doc);
    return d.success ? [d.data] : [];
  });

  return (
    <article className="mx-auto max-w-2xl space-y-5 card p-8 text-ink print:p-0 print:shadow-none print:border-0" data-testid="record">
      <header className="flex items-start justify-between gap-4 border-b border-slate-300 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{S.app.name}</p>
          <h1 className="text-2xl font-bold">{rec.data.title}</h1>
        </div>
        <p className="text-right text-xs text-slate-500">
          nr. {rec.id.slice(0, 8)}
          <br />
          {new Date(rec.data.history[0].at).toLocaleDateString("ro-RO")}
        </p>
      </header>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
        {cycle !== null && <li>Durata: {formatDuration(cycle)}</li>}
      </ul>
      {doc?.success && S.documents && (
        <section className="space-y-2 [&_*]:!text-ink">
          <h2 className="font-semibold">Documentul justificativ</h2>
          <DocTable doc={doc.data} />
          <ChecksList checks={checkDocument(doc.data, { rules: S.documents.rules, category: rec.data.category, existing: others, now: new Date(rec.data.history[0].at) })} />
        </section>
      )}
      <section>
        <h2 className="flex items-center gap-2 font-semibold">
          Rezumat <span className="text-xs font-normal text-slate-500 print:hidden">(propus de AI din faptele de mai sus; corectați-l)</span>
          {busy && <Spinner />}
        </h2>
        <EditableText value={summary} onChange={setSummary} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm print:border-0 print:p-0" aria-label="Rezumat" />
      </section>
      <section>
        <h2 className="font-semibold">Cronologie</h2>
        <ol className="mt-1 space-y-0.5 text-sm">
          {rec.data.history.map((h, i) => (
            <li key={i}>
              <span className="tabular-nums text-muted">
                {new Date(h.at).toLocaleDateString("ro-RO")} {timeOf(h.at)}
              </span>{" "}
              {describeEntry(S.flow, h, nameOf)}
              {h.note ? ` — ${h.note}` : ""}
            </li>
          ))}
        </ol>
      </section>
      <footer className="grid grid-cols-2 gap-8 pt-8 text-sm">
        {[S.flow.requester, ...Object.keys(rec.data.actors)].map((role) => (
          <p key={role} className="border-t border-ink/30 pt-1 text-muted">
            {roleOf(role).label}: {nameOf(role === S.flow.requester ? rec.data.requester : rec.data.actors[role])}
          </p>
        ))}
      </footer>
      <div className="flex gap-2 print:hidden">
        <Button variant="primary" onClick={() => window.print()}>
          Tipărește / salvează PDF
        </Button>
        <Button variant="ghost" onClick={() => void propose()} disabled={busy}>
          Propune alt rezumat
        </Button>
      </div>
    </article>
  );
}
