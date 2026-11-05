// Pagina din SMS (/c/:id): cel care a cerut confirmă că a primit sau spune „nu am primit”.
// Fără login: linkul e trimis doar lui. Într-un produs real linkul ar purta un token semnat.

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { availableEvents } from "../lib/lifecycle";
import { useMe } from "../lib/identity";
import { useCollection } from "../lib/store";
import { scenario } from "../scenario/config";
import { categoryOf, requests } from "../scenario/model";
import { StatusPill } from "../scenario/ui/parts";
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
  const actor = { handle: rec.data.receiver, role: "receiver" as const };
  const can = availableEvents(rec.data, actor);
  const big = "w-full rounded-2xl py-5 text-lg font-semibold disabled:opacity-50";

  async function act(event: "confirm" | "dispute") {
    setError(null);
    try {
      const { notice } = await step(rec!, event, actor, note.trim() || undefined);
      setResult(event === "confirm" ? `Mulțumim! ${notice ?? ""}` : `Am notat. ${notice ?? ""}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6 py-8">
      <p className="text-xs uppercase tracking-wider text-slate-500">{S.app.name}</p>
      <h1 className="text-2xl font-bold">
        {categoryOf(rec.data.category).icon} {rec.data.title}
      </h1>
      <p className="text-slate-300">
        {nameOf(rec.data.giver)} spune că a adus{" "}
        <b>
          {rec.data.quantity} {rec.data.unit}
        </b>
        . <StatusPill status={rec.data.status} />
      </p>
      {result ? (
        <p role="status" className="rounded-xl bg-emerald-500/15 px-4 py-3 text-emerald-200" data-testid="confirm-result">
          {result}
        </p>
      ) : can.length ? (
        <>
          <button className={`${big} bg-emerald-500 text-slate-950`} onClick={() => void act("confirm")}>
            ✓ {S.request.actions.confirm}
          </button>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ce s-a întâmplat? (opțional)" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3" aria-label="Ce s-a întâmplat" />
          <button className={`${big} bg-rose-600 text-white`} onClick={() => void act("dispute")}>
            ✗ {S.request.actions.dispute}
          </button>
        </>
      ) : (
        <p className="text-slate-400">Nu mai e nimic de confirmat aici.</p>
      )}
      {error && <p role="alert" className="text-rose-300">{error}</p>}
    </main>
  );
}
