// Dashboard-ul omului curent: punctele, rangul (rama pozei crește cu scorul), ce are de făcut.
// Toate cifrele vin din src/lib/gamification.ts, calculate din istoricul cererilor.

import { Link } from "wouter";
import { Card, PageHeader } from "../components/ui";
import { giverStats, pointsFor, rankFor } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { useCollection } from "../lib/store";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { categoryOf, requests } from "../scenario/model";
import { Avatar, StatusPill } from "../scenario/ui/parts";

const S = scenario;

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "bad" }) {
  return (
    <div className="rounded-xl bg-slate-800/60 p-3">
      <p className={`text-2xl font-bold ${tone === "bad" ? "text-rose-300" : ""}`}>{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

export function ProfilePage() {
  const { items } = useCollection(requests);
  const { me } = useMe();
  const all = items.map((r) => r.data);
  useMascotPage({ title: "Profil", context: () => (me ? `Profilul lui ${me.name}` : "") });
  if (!me) return <p className="text-slate-400">Alege cine ești din antet.</p>;

  const role = S.roles[me.role];
  const mine = items.filter((r) => (me.role === "giver" ? r.data.giver === me.handle || r.data.history.some((h) => h.giver === me.handle) : r.data.receiver === me.handle));
  const stats = me.role === "giver" ? giverStats(me.handle, all, S) : null;
  const rank = stats ? rankFor(stats.points, S.ranks) : null;
  const toConfirm = me.role === "receiver" ? mine.filter((r) => r.data.status === "livrat") : [];

  return (
    <div className="space-y-6">
      <PageHeader title={me.name} description={`${role.icon} ${role.label} · ${me.area}`} />
      {stats && rank && (
        <Card>
          <div className="flex flex-wrap items-center gap-5" data-testid="profile-rank">
            <Avatar name={me.name} rank={rank.rank} size={72} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-400">Rang</p>
              <p className="text-xl font-bold" style={{ color: rank.rank.frame }}>
                {rank.rank.name}
              </p>
              <div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={Math.round(rank.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progres spre rangul următor">
                <div className="h-full rounded-full" style={{ width: `${Math.round(rank.progress * 100)}%`, background: rank.next?.frame ?? rank.rank.frame }} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{rank.next ? `Încă ${rank.toNext} puncte până la ${rank.next.name}` : "Cel mai înalt rang"}</p>
            </div>
            <p className="text-4xl font-bold text-accent" data-testid="profile-points">
              {stats.points} <span className="text-base font-normal text-slate-400">puncte</span>
            </p>
          </div>
          {stats.suspended && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              Cont suspendat: {stats.disputes} livrări marcate „nu am primit”. Nu mai poți accepta {S.request.plural} noi.
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="livrări confirmate" value={stats.confirmed} />
            <Stat label={S.app.impactLabel} value={stats.units} />
            <Stat label="așteaptă confirmarea" value={stats.pending} />
            <Stat label="„nu am primit”" value={stats.disputes} tone={stats.disputes ? "bad" : undefined} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Punctele le calculează codul, nu AI-ul: ({S.points.base} + {S.points.perUnit} × cantitate, max {S.points.maxUnits}) × urgență ({S.points.urgency.join(" / ")}), doar după ce confirmă cel care a primit. Fiecare „nu am primit” scade {S.points.disputePenalty}.
          </p>
        </Card>
      )}
      {toConfirm.length > 0 && (
        <Card title="Ai de confirmat">
          <ul className="space-y-2">
            {toConfirm.map((r) => (
              <li key={r.id}>
                <Link href={`/c/${r.id}`} className="text-accent hover:underline">
                  {categoryOf(r.data.category).icon} {r.data.title} →
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card title={me.role === "giver" ? "Ce am adus" : `${S.request.plural[0].toUpperCase()}${S.request.plural.slice(1)} mele`}>
        <ul className="space-y-1" data-testid="profile-requests">
          {mine.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2 text-sm">
              <span>{categoryOf(r.data.category).icon}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.data.title} · {r.data.quantity} {r.data.unit}
              </span>
              {me.role === "giver" && r.data.status === "confirmat" && <span className="text-xs text-accent">+{pointsFor(r.data, S.points)}</span>}
              <StatusPill status={r.data.status} />
            </li>
          ))}
          {!mine.length && <li className="text-sm text-slate-500">Nimic încă. <Link href="/harta" className="text-accent">Vezi harta →</Link></li>}
        </ul>
      </Card>
    </div>
  );
}
