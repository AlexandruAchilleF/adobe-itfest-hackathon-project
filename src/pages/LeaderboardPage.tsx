// Clasamentul celor care dau, calculat de cod din livrările confirmate.
import { Card, PageHeader } from "../components/ui";
import { impact, leaderboard } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { useCollection } from "../lib/store";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { requests, roleOf } from "../scenario/model";
import { Avatar } from "../scenario/ui/parts";

const S = scenario;

export function LeaderboardPage() {
  const { items } = useCollection(requests);
  const { me, people } = useMe();
  const all = items.map((r) => r.data);
  const rows = leaderboard(people.filter((p) => p.role === S.points.role), all, S);
  const total = impact(all, S);
  useMascotPage({ title: "Clasament", context: () => rows.map((r) => `${r.place}. ${r.name} ${r.points}p`).join("\n") });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Clasament" title={`${roleOf(S.points.role).plural} care *țin promisiunea.*`} description={`${total.units} ${S.app.impactLabel}, ${total.confirmed} livrări confirmate de ambele părți, ${total.helpers} oameni care au ajutat.`} />
      <Card>
        <ol className="space-y-2" data-testid="leaderboard">
          {rows.map((r) => (
            <li key={r.handle} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.handle === me?.handle ? "bg-accent/15 ring-1 ring-accent/50" : "bg-slate-800/50"}`}>
              <span className="w-6 text-right tabular-nums text-muted">{r.place}</span>
              <Avatar name={r.name} rank={r.rank} />
              <span className="min-w-0 flex-1">
                <b>{r.name}</b>
                {r.suspended && <span className="ml-2 rounded bg-rose-500/20 px-1.5 text-xs text-rose-200">suspendat</span>}
                <span className="block text-xs" style={{ color: r.rank.frame }}>
                  {r.rank.name}
                </span>
              </span>
              <span className="hidden text-right text-xs text-slate-400 sm:block">
                {r.confirmed} livrări · {r.units} {S.app.impactLabel}
              </span>
              <span className="w-16 text-right text-lg font-bold text-accent">{r.points}</span>
            </li>
          ))}
        </ol>
      </Card>
      <Card title="Rangurile">
        <ul className="flex flex-wrap gap-3 text-sm">
          {S.ranks.map((r) => (
            <li key={r.name} className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ background: r.frame }} /> {r.name} <span className="text-slate-500">de la {r.min}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
