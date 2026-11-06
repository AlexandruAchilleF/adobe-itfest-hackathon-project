// Pagina din SMS (/c/:id): cel care a cerut face pașii lui (ex: „Am primit” / „Nu am primit”).
// Fără login: linkul e trimis doar lui. Într-un produs real linkul ar purta un token semnat.

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { available, waitingOn } from "../lib/flow";
import { useMe } from "../lib/identity";
import { useCollection } from "../lib/store";
import { scenario } from "../scenario/config";
import { requests, roleOf } from "../scenario/model";
import { StatusPill, Timeline } from "../scenario/ui/parts";
import { useSteps } from "../scenario/useSteps";

const S = scenario;

export function ConfirmPage() {
  const [location] = useLocation();
  const id = location.split("/")[2] ?? "";
  const { items, loading } = useCollection(requests);
  const { nameOf } = useMe();
  const { step } = useSteps();
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = items.find((r) => r.id === id);

  if (loading) return <p className="p-6 text-center text-slate-400">Se încarcă…</p>;
  if (!rec) return <p className="p-6 text-center text-slate-400">Linkul nu mai e valid. <Link href="/" className="underline">Înapoi</Link></p>;

  // linkul din SMS acționează în numele celui care a cerut
  const actor = { handle: rec.data.requester, role: S.flow.requester };
  const can = available(S.flow, rec.data, actor);
  const helpers = Object.values(rec.data.actors).map(nameOf).join(", ");
  const big = "btn w-full !py-4 text-lg";

  async function act(event: string, danger?: boolean) {
    setError(null);
    try {
      const { notice } = await step(rec!, event, actor, note.trim() || undefined);
      setResult(danger ? `Am notat. ${notice ?? ""}` : `Mulțumim! ${notice ?? ""}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="sky min-h-dvh">
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-8">
      <p className="label-caps">{S.app.name}</p>
      <h1 className="text-[2rem] font-semibold leading-[1.05] text-ink">
        {rec.data.title}
      </h1>
      <p className="text-slate-300">
        {helpers || `${S.request.singular[0].toUpperCase()}${S.request.singular.slice(1)} ta`}
        {/* „1 sesizare” nu spune nimic; cantitatea apare doar când e o cantitate reală */}
        {!(rec.data.quantity === 1 && rec.data.unit === S.request.singular) && (
          <>
            :{" "}
            <b>
              {rec.data.quantity} {rec.data.unit}
            </b>
          </>
        )}{" "}
        <StatusPill status={rec.data.status} />
      </p>
      {result ? (
        <p role="status" className="rounded-xl bg-emerald-500/15 px-4 py-3 text-emerald-200" data-testid="confirm-result">
          {result}
        </p>
      ) : can.length ? (
        <>
          {can
            .filter((t) => !t.danger)
            .map((t) => (
              <button key={t.id} className={`${big} btn-primary`} onClick={() => void act(t.id)} disabled={t.note === "required" && !note.trim()}>
                ✓ {t.label}
              </button>
            ))}
          {can.some((t) => t.note) && <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce s-a întâmplat?" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3" aria-label="Ce s-a întâmplat" />}
          {can
            .filter((t) => t.danger)
            .map((t) => (
              <button key={t.id} className={`${big} btn-danger`} onClick={() => void act(t.id, true)} disabled={t.note === "required" && !note.trim()}>
                ✗ {t.label}
              </button>
            ))}
        </>
      ) : (
        <p className="text-slate-400" data-testid="confirm-waiting">
          {waitingOn(S.flow, rec.data).length
            ? `Acum așteaptă: ${waitingOn(S.flow, rec.data).map((r) => roleOf(r).label.toLowerCase()).join(" sau ")}. Primești SMS când e rândul tău.`
            : "Nu mai e nimic de făcut aici."}
        </p>
      )}
      <Timeline r={rec.data} nameOf={nameOf} />
      {error && <p role="alert" className="text-rose-300">{error}</p>}
    </main>
    </div>
  );
}
