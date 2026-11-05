// Prima pagină pe care o vede juriul: fraza produsului, cele două roluri și cifrele de impact.
// Cifrele sunt calculate de cod din cererile confirmate de ambele părți (src/lib/gamification.ts).

import { Link, useLocation } from "wouter";
import { QrPanel } from "../components/QrPanel";
import { Card } from "../components/ui";
import { impact, leaderboard } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { useCollection } from "../lib/store";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { requests } from "../scenario/model";
import type { RoleId } from "../scenario/types";
import { Avatar } from "../scenario/ui/parts";

const S = scenario;

function Big({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/70 p-4">
      <p className="text-3xl font-bold text-accent">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

export function ScenarioHome() {
  const { items } = useCollection(requests);
  const { people, setMe } = useMe();
  const [, navigate] = useLocation();
  const all = items.map((r) => r.data);
  const total = impact(all);
  const top = leaderboard(people.filter((p) => p.role === "giver"), all, S).slice(0, 3);
  useMascotPage({ title: "Start", context: () => `${total.open} ${S.request.plural} deschise` });

  const enter = (role: RoleId) => {
    const first = people.find((p) => p.role === role);
    if (first) setMe(first.handle);
    navigate("/harta");
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{S.app.name}</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-300">{S.app.tagline}</p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2" data-testid="roles">
        {(["receiver", "giver"] as const).map((role) => (
          <button key={role} onClick={() => enter(role)} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-left transition hover:border-accent/60">
            <span className="text-4xl">{S.roles[role].icon}</span>
            <p className="mt-2 text-xl font-semibold">Sunt {S.roles[role].label.toLowerCase()}</p>
            <p className="mt-1 text-sm text-slate-400">{S.roles[role].pitch}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="impact">
        <Big value={total.units} label={S.app.impactLabel} />
        <Big value={total.confirmed} label="livrări confirmate de ambele părți" />
        <Big value={total.open} label={`${S.request.plural} care așteaptă acum`} />
        <Big value={total.helpers} label={`${S.roles.giver.plural.toLowerCase()} care au ajutat`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Cine a ajutat cel mai mult" actions={<Link href="/clasament" className="text-sm text-accent">clasament →</Link>}>
          <ol className="space-y-2">
            {top.map((r) => (
              <li key={r.handle} className="flex items-center gap-3">
                <Avatar name={r.name} rank={r.rank} size={32} />
                <span className="flex-1">
                  {r.name} <span className="text-xs" style={{ color: r.rank.frame }}>{r.rank.name}</span>
                </span>
                <b className="text-accent">{r.points}</b>
              </li>
            ))}
          </ol>
        </Card>
        {S.reports.enabled && (
          <Card title={S.reports.title}>
            <QrPanel url={`${location.origin}/raport`} size={140} label={S.reports.prompt} />
          </Card>
        )}
      </div>
    </div>
  );
}
