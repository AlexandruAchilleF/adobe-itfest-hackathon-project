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
  if (!S.reports.enabled)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 bg-paper px-6 py-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-ink" aria-hidden>
            <span className="h-2 w-2 rounded-[2px] bg-coral-bright" />
          </span>
          {S.app.name}
        </p>
        <h1 className="text-2xl font-semibold text-ink">Raportarea de pe telefon nu e pornită aici.</h1>
        <p className="text-ink-2">Deschide aplicația pentru {S.request.plural}.</p>
        <Link href="/cereri" className="btn btn-primary mt-2 self-start">
          Mergi la {S.request.plural}
        </Link>
      </main>
    );
  return (
    <div className="min-h-dvh bg-paper">
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-8">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-ink" aria-hidden>
            <span className="h-2 w-2 rounded-[2px] bg-coral-bright" />
          </span>
          {S.app.name}
        </p>
        <h1 className="mt-4 text-[2rem] font-semibold leading-[1.05] text-ink">{S.reports.prompt}</h1>
        <p className="mt-2 text-sm text-ink-2" data-testid="report-location">
          {pos === undefined ? "Caut locația…" : pos ? `Locația ta, precizie ±${pos.accuracy} m` : "Fără GPS: pun raportul în centrul orașului"}
        </p>
      </header>
      <div className="grid gap-3">
        {S.reports.types.map((t) => (
          <button key={t.id} onClick={() => void report(t.id)} disabled={pos === undefined} className="card flex items-center gap-4 px-5 py-5 text-left text-lg font-semibold text-ink transition hover:border-[#cfccc4] active:translate-y-0.5 disabled:opacity-50">
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden /> {t.label}
          </button>
        ))}
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Un detaliu (opțional)" className="prompt-box px-4 py-3" aria-label="Detaliu" />
      {sent && (
        <p role="status" className="rounded-xl bg-ok-tint px-4 py-3 text-ok">
          {sent}. Apare acum pe hartă.
          {followUrl && (
            <Link href={followUrl} className="mt-1 block underline">
              Urmărește ce se întâmplă cu ea →
            </Link>
          )}
        </p>
      )}
      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">Raportate recent</h2>
        <ul className="card divide-y divide-line text-sm" data-testid="recent-reports">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: reportTypeOf(r.data.type).color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.data.note || reportTypeOf(r.data.type).label}</span>
              <span className="text-muted">{ageLabel(ageMinutes(r.data))}</span>
            </li>
          ))}
        </ul>
      </section>
      <Link href="/cereri" className="text-center text-sm font-medium text-ink-2 underline">
        {S.features.map ? "Vezi harta" : `Vezi ${S.request.plural}`}
      </Link>
    </main>
    </div>
  );
}
