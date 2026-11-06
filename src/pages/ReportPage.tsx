// Pagina de pe telefon (din QR): raportezi în 2 secunde ce vezi, la locația curentă, cu oră.
// Apare live pe hartă la toți (colecția de rapoarte + LiveProvider).

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMe } from "../lib/identity";
import { ageLabel, ageMinutes, visibleReports } from "../lib/reports";
import { useCollection } from "../lib/store";
import { currentPosition, type LatLng } from "../modules/map/geo";
import { scenario } from "../scenario/config";
import { reports, reportTypeOf, requestFromReport, requests, roleOf } from "../scenario/model";
import { timeOf } from "../scenario/ui/parts";

const S = scenario;

export function ReportPage() {
  const { items, add } = useCollection(reports);
  const { me, people, join } = useMe();
  const { add: addRequest } = useCollection(requests);
  const [followUrl, setFollowUrl] = useState<string | null>(null);
  const [pos, setPos] = useState<(LatLng & { accuracy: number }) | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    void currentPosition().then(setPos);
    const t = setInterval(() => tick((n) => n + 1), 30_000); // „acum X min” rămâne corect
    return () => clearInterval(t);
  }, []);

  async function report(type: string) {
    const where = pos ?? S.app.center;
    const at = new Date().toISOString();
    const report = { type, note: note.trim(), lat: where.lat, lng: where.lng, at, by: me?.handle ?? "anonim", approx: !pos };
    if (S.reports.toRequest) {
      // raportul devine o cerere cu flux; cine raportează trebuie să aibă rolul care cere (ex: cetățean)
      const reporter = me?.role === S.flow.requester ? me : await join(`${roleOf(S.flow.requester).label} ${people.filter((p) => p.role === S.flow.requester).length + 1}`, S.flow.requester);
      const rec = await addRequest(requestFromReport(S, report, reporter.handle));
      await add({ ...report, by: reporter.handle, requestId: rec.id });
      setFollowUrl(`/c/${rec.id}`);
    } else {
      await add(report);
    }
    setSent(`${reportTypeOf(type).label}, trimis la ${timeOf(at)}`);
    setNote("");
    navigator.vibrate?.(30);
  }

  const recent = visibleReports(items, S.reports).slice(0, 6);
  return (
    <div className="sky min-h-dvh">
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-8">
      <header>
        <p className="label-caps">{S.app.name}</p>
        <h1 className="mt-2 text-[2.1rem] font-semibold leading-[1.02] text-ink">{S.reports.prompt}</h1>
        <p className="mt-2 text-sm text-ink-2" data-testid="report-location">
          {pos === undefined ? "Caut locația…" : pos ? `Locația ta, precizie ±${pos.accuracy} m` : "Fără GPS: pun raportul în centrul orașului"}
        </p>
      </header>
      <div className="grid gap-3">
        {S.reports.types.map((t) => (
          <button key={t.id} onClick={() => void report(t.id)} disabled={pos === undefined} className="card flex items-center gap-4 px-5 py-5 text-left text-lg font-semibold text-ink transition active:translate-y-0.5 disabled:opacity-50">
            <span className="h-9 w-9 shrink-0 rounded-full" style={{ background: t.color, boxShadow: `0 0 0 6px ${t.color}22` }} aria-hidden /> {t.label}
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un detaliu (opțional)" className="prompt-box px-4 py-3" aria-label="Detaliu" />
      {sent && (
        <p role="status" className="rounded-xl bg-emerald-500/15 px-4 py-3 text-emerald-200">
          ✓ {sent}. Apare acum pe hartă.
          {followUrl && (
            <Link href={followUrl} className="mt-1 block underline">
              Urmărește ce se întâmplă cu ea →
            </Link>
          )}
        </p>
      )}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-400">Raportate recent</h2>
        <ul className="space-y-1 text-sm" data-testid="recent-reports">
          {recent.map((r) => (
            <li key={r.id} className="flex gap-2 rounded-lg bg-slate-900 px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: reportTypeOf(r.data.type).color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.data.note || reportTypeOf(r.data.type).label}</span>
              <span className="text-slate-500">{ageLabel(ageMinutes(r.data))}</span>
            </li>
          ))}
        </ul>
      </section>
      <Link href="/cereri" className="text-center text-sm text-slate-500 underline">
        Vezi harta
      </Link>
    </main>
    </div>
  );
}
