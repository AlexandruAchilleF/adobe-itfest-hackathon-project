// Prima pagină pe care o vede juriul: fraza produsului, rolurile și cifrele de impact.
// Cifrele sunt calculate de cod din cererile încheiate (src/lib/gamification.ts).

import { Link, useLocation } from "wouter";
import { QrPanel } from "../components/QrPanel";
import { Accent, Button, Card, Ribbon, Tag } from "../components/ui";
import { impact, leaderboard } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { useCollection } from "../lib/store";
import { MascotFigure } from "../modules/mascot/Mascot";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { requests, roleOf } from "../scenario/model";
import { pitchMode } from "../scenario/nav";
import { Avatar } from "../scenario/ui/parts";

const S = scenario;
// rolul care cere primul, apoi celelalte, în ordinea din config
const ROLES = [S.flow.requester, ...Object.keys(S.roles).filter((r) => r !== S.flow.requester)];

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card px-5 py-5">
      <p className="text-[2.6rem] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">{value}</p>
      <p className="mt-2 text-sm leading-snug text-muted">{label}</p>
    </div>
  );
}

export function ScenarioHome() {
  const { items } = useCollection(requests);
  const { people, setMe } = useMe();
  const [, navigate] = useLocation();
  const all = items.map((r) => r.data);
  const total = impact(all, S);
  const top = S.features.gamification ? leaderboard(people.filter((p) => p.role === S.points.role), all, S).slice(0, 3) : [];
  useMascotPage({ title: "Start", context: () => `${total.open} ${S.request.plural} deschise` });

  const enter = (role: string) => {
    const first = people.find((p) => p.role === role);
    if (first) setMe(first.handle);
    navigate("/cereri");
  };

  return (
    <div className="space-y-20">
      {/* cerul: secțiunea de deschidere, pe toată lățimea */}
      <section className="sky relative left-1/2 -mt-28 w-screen -translate-x-1/2 overflow-hidden px-4 pt-36 pb-20 text-center">
        {S.app.notThis && <p className="mx-auto inline-block rounded-lg bg-[#fbefe2]/90 px-3 py-1 text-[0.95rem] text-coral-deep/80 line-through decoration-coral-deep/60">{S.app.notThis}</p>}
        <h1 className="mx-auto mt-5 max-w-4xl text-[2.7rem] font-semibold leading-[0.98] tracking-[-0.045em] text-ink sm:text-[4.4rem]">
          <Accent text={S.app.headline ?? S.app.name} />
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-ink-2">{S.app.tagline}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3" data-testid="roles">
          {ROLES.map((role, i) => (
            <Button key={role} variant={i === 0 ? "primary" : "secondary"} className="!px-6 !py-3 text-base" onClick={() => enter(role)}>
              Sunt {roleOf(role).label.toLowerCase()}
            </Button>
          ))}
        </div>
        {S.mascot.enabled && (
          <div className="pointer-events-none absolute -bottom-3 left-[4%] hidden opacity-95 md:block" aria-hidden>
            <MascotFigure mood="happy" size={150} />
          </div>
        )}
      </section>

      {/* dovada: cifra spusă de un om real (docs/JURIU.md, întrebarea 2) */}
      {S.business.evidence[0] ? (
        <p className="mx-auto max-w-3xl text-center font-serif text-[1.45rem] leading-snug text-coral [font-variation-settings:'opsz'_48,'SOFT'_100]" data-testid="evidence">
          {S.business.evidence[0]}
        </p>
      ) : (
        !pitchMode(S) && (
          <p className="mx-auto max-w-2xl text-center text-sm text-amber-200" data-testid="evidence-missing">
            Lipsește cifra de la un om real (scenario.business.evidence). Aici o vede juriul în primele secunde.
          </p>
        )
      )}

      <section className="text-center">
        <Ribbon>Până acum</Ribbon>
        <h2 className="mx-auto mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.05] text-ink sm:text-[2.8rem]">
          <Accent text={`Calculat din ${S.request.plural}, *nu ghicit.*`} />
        </h2>
        <div className="mt-10 grid grid-cols-2 gap-5 text-left sm:grid-cols-4" data-testid="impact">
          <Stat value={total.units} label={S.app.impactLabel} />
          <Stat value={total.confirmed} label={`${S.request.plural} încheiate și confirmate`} />
          <Stat value={total.open} label={`${S.request.plural} care așteaptă acum`} />
          <Stat value={total.helpers} label={`${roleOf(S.points.role).plural.toLowerCase()} care au ajutat`} />
        </div>
      </section>

      {/* rolurile: câte un rând pe rol, cu eticheta lui colorată */}
      <section className="space-y-12">
        {ROLES.map((role, i) => (
          <div key={role} className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <Tag tone={i}>{roleOf(role).label}</Tag>
              <h3 className="mt-3 max-w-2xl text-[1.6rem] font-semibold leading-tight text-ink sm:text-[2rem]">{roleOf(role).pitch}</h3>
            </div>
            <Button variant="secondary" onClick={() => enter(role)}>
              Intră ca {roleOf(role).label.toLowerCase()} →
            </Button>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {S.features.gamification && (
          <Card label="Clasament" title="Cine a ajutat cel mai mult" actions={<Link href="/clasament" className="text-sm text-coral-deep hover:underline">tot clasamentul →</Link>}>
            <ol className="space-y-3">
              {top.map((r) => (
                <li key={r.handle} className="flex items-center gap-3">
                  <Avatar name={r.name} rank={r.rank} size={34} />
                  <span className="flex-1">
                    <b className="font-semibold">{r.name}</b> <span className="text-xs text-muted">{r.rank.name}</span>
                  </span>
                  <b className="tabular-nums text-coral-deep">{r.points}</b>
                </li>
              ))}
            </ol>
          </Card>
        )}
        {S.reports.enabled && (
          <Card label="De pe telefon" title={S.reports.title}>
            <QrPanel url={`${location.origin}/raport`} size={140} label={S.reports.prompt} />
          </Card>
        )}
      </div>
    </div>
  );
}
