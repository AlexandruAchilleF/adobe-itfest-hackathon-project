// Prima pagină: povestea pentru juriu, în primele 90 de secunde (docs/JURIU.md, întrebarea 6).
//  1. cerul: fraza produsului, caseta în care cererea se scrie singură, produsul ca erou (documentul + cardul)
//  2. cifra spusă de un om real (întrebarea 2)
//  3. drumul cererii la derulare: pașii fluxului în stânga, macheta fixă în dreapta se schimbă (întrebarea 5)
//  4. capitolul întunecat: AI-ul citește, codul verifică, omul confirmă (întrebarea 4)
//  5. cifrele reale și alegerea rolului
// Tot textul vine din scenariu; cifrele le calculează codul (src/lib/gamification.ts, src/lib/checks.ts).

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { isDevMode } from "../components/DevPanel";
import { QrPanel } from "../components/QrPanel";
import { Accent, Ribbon } from "../components/ui";
import { checkDocument, Doc, type DocCheck } from "../lib/checks";
import { happyPath, stateOf } from "../lib/flow";
import { impact, leaderboard } from "../lib/gamification";
import { useMe } from "../lib/identity";
import { useInView, useTypewriter } from "../lib/motion";
import { useCollection } from "../lib/store";
import { MascotFigure } from "../modules/mascot/MascotFigure";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { requests, roleOf } from "../scenario/model";
import { DocPaper } from "../scenario/ui/DocPaper";
import { Avatar, formatQty, StatusPill } from "../scenario/ui/parts";

const S = scenario;
// rolul care cere primul, apoi celelalte, în ordinea din config
const ROLES = [S.flow.requester, ...Object.keys(S.roles).filter((r) => r !== S.flow.requester)];
const PATH = happyPath(S.flow);
const SEED = S.seed.requests[0];
const parsedDoc = Doc.safeParse(SEED?.extra?.doc);
const SEED_DOC = parsedDoc.success ? parsedDoc.data : null;
const PROMPT = SEED_DOC ? `${SEED.title}: ${formatQty(SEED_DOC.total, SEED_DOC.currency)}. Bonul e în poză.` : S.request.addPlaceholder.replace(/^ex:\s*/i, "") || SEED?.description || "";
// în cer: primul pas al fluxului (ex: „Aprobă”) și alternativa lui, plus câte verificări trec pe documentul din seed
const HERO_STEP = PATH[0];
const HERO_DANGER = S.flow.transitions.find((t) => t.danger && HERO_STEP && t.from.some((f) => HERO_STEP.from.includes(f)));
const HERO_CHECKS = SEED_DOC && S.documents ? checkDocument(SEED_DOC, { rules: S.documents.rules, category: SEED.category, existing: [], now: new Date(SEED_DOC.date) }).filter((c) => c.level === "ok").length : 0;
const ICON: Record<DocCheck["level"], string> = { ok: "✓", warning: "!", error: "✗" };

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Cardul cererii-exemplu, într-o anumită stare: macheta din cer și din povestea de la derulare. */
function RequestMock({ status, stamp, compact = false, action = false }: { status: string; stamp?: { label: string; good: boolean }; compact?: boolean; action?: boolean }) {
  if (!SEED) return null;
  return (
    <div className={`card w-full ${compact ? "max-w-[340px] p-5" : "max-w-[360px] p-6"} shadow-[0_24px_48px_-24px_rgb(27_35_80/0.45)]`}>
      <p className="text-sm text-muted">
        {S.seed.people.find((p) => p.handle === SEED.requester)?.name ?? roleOf(S.flow.requester).label} · acum 2 min
      </p>
      <p className="mt-0.5 font-semibold text-ink">{SEED.title}</p>
      <p className="mt-3 text-[2.1rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">{formatQty(SEED.quantity, SEED.unit)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <StatusPill status={status} />
        {stamp && <span className={`stamp text-xs ${stamp.good ? "text-ok" : "text-bad"}`}>{stamp.label}</span>}
      </div>
      {action && (
        <>
          {HERO_CHECKS > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ok">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-ok text-[10px] text-white">✓</span>
              Toate cele {HERO_CHECKS} verificări trec
            </p>
          )}
          {HERO_STEP && (
            <div className="mt-4 flex gap-2">
              <span className="btn btn-primary">{HERO_STEP.label}</span>
              {HERO_DANGER && <span className="btn btn-secondary">{HERO_DANGER.label}</span>}
            </div>
          )}
        </>
      )}
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
  const { typed, done } = useTypewriter(PROMPT, { loop: true });

  const enter = (role: string) => {
    const first = people.find((p) => p.role === role);
    if (first) setMe(first.handle);
    navigate("/cereri");
  };
  const roleButtons = (big: boolean) => (
    <div className={`flex flex-wrap gap-3 ${big ? "" : "justify-center"}`} data-testid={big ? "roles" : undefined}>
      {ROLES.map((role, i) => (
        <button key={role} className={`btn btn-story ${i === 0 ? "btn-primary" : "btn-secondary"}`} onClick={() => enter(role)}>
          {big ? "Sunt" : "Încearcă ca"} {roleOf(role).label.toLowerCase()}
        </button>
      ))}
    </div>
  );

  return (
    <div className="overflow-x-clip">
      {/* 1. cerul */}
      <section className="sky relative">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-20 lg:pb-20">
          <div>
            {S.app.notThis && <p className="inline-block rounded-lg bg-[#fbefe2]/90 px-3 py-1 text-[0.95rem] text-coral-deep/80 line-through decoration-coral-deep/60">{S.app.notThis}</p>}
            <h1 className="mt-5 text-[2.8rem] leading-[0.98] font-semibold tracking-[-0.045em] text-ink sm:text-[4.2rem]">
              <Accent text={S.app.headline ?? S.app.name} />
            </h1>
            <p className="mt-5 max-w-xl text-[1.1rem] leading-relaxed text-ink-2">{S.app.tagline}</p>
            {PROMPT && (
              <div className="story-prompt mt-8 flex max-w-xl items-end gap-3 p-4 pl-5" aria-hidden>
                <p className="min-h-[3.2em] flex-1 text-[1.05rem] leading-snug text-ink">
                  {typed}
                  <span className="caret" />
                </p>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-colors ${done ? "bg-coral" : "bg-coral/50"}`}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" />
                  </svg>
                </span>
              </div>
            )}
            <div className="mt-8">{roleButtons(true)}</div>
          </div>

          {/* produsul ca erou: documentul și cardul cererii, plutind în cer (sau ilustrația voastră din Firefly) */}
          <div className={`relative mx-auto w-full max-w-[460px] ${SEED_DOC ? "h-[440px]" : "flex min-h-[340px] items-center justify-center"}`}>
            {S.app.heroImage ? (
              <img src={S.app.heroImage} alt="" className="w-full rounded-3xl object-cover shadow-[0_30px_60px_-30px_rgb(27_35_80/0.5)]" />
            ) : (
              <>
                {SEED_DOC && (
                  <div className="float absolute top-0 right-0 w-[240px] sm:right-2" style={{ ["--r" as string]: "4deg" }}>
                    <DocPaper doc={SEED_DOC} className="!max-w-[240px] text-[12.5px]" />
                  </div>
                )}
                <div className={`float ${SEED_DOC ? "absolute bottom-0 left-0" : "relative"}`} style={{ animationDelay: "-3s" }}>
                  <RequestMock status={S.flow.initial} action />
                </div>
              </>
            )}
            {S.mascot.enabled && S.mascot.character && (
              // mascota zboară pe cer, deasupra produsului, venind spre cel care citește
              <div className="pointer-events-none absolute -top-28 -left-16 hidden md:block lg:-top-32" aria-hidden>
                <MascotFigure mood="happy" size={190} />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="bg-cream">
        {/* 2. dovada: cifra spusă de un om real (docs/JURIU.md, întrebarea 2) */}
        {S.business.evidence[0] ? (
          <Reveal className="mx-auto max-w-3xl px-4 py-20 text-center">
            <p className="font-serif text-[1.7rem] leading-snug text-coral-deep [font-variation-settings:'opsz'_48,'SOFT'_100] sm:text-[2rem]" data-testid="evidence">
              {S.business.evidence[0]}
            </p>
          </Reveal>
        ) : (
          isDevMode() && (
            <p className="mx-auto max-w-2xl px-4 pt-10 text-center text-sm text-warn" data-testid="evidence-missing">
              Pentru echipă: lipsește cifra de la un om real (scenario.business.evidence). Aici o vede juriul în primele secunde.
            </p>
          )
        )}

        {/* 3. drumul cererii, la derulare */}
        {PATH.length > 0 && <Journey />}
      </div>

      {/* 4. capitolul întunecat: AI-ul citește, codul verifică */}
      <AiChapter />

      {/* 5. cifrele reale și alegerea rolului */}
      <section className="bg-cream">
        <div className="mx-auto max-w-5xl px-4 py-24 text-center">
          <Reveal>
            <Ribbon>Până acum</Ribbon>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3" data-testid="impact">
            {[
              [total.units.toLocaleString("ro-RO"), S.app.impactLabel],
              [total.confirmed, `${S.request.plural} încheiate și confirmate`],
              [total.open, `${S.request.plural} care așteaptă acum`],
            ].map(([value, label], i) => (
              <Reveal key={String(label)} delay={i * 90} className="card px-6 py-6">
                <p className="text-[2.6rem] leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums">{value}</p>
                <p className="mt-2 text-sm leading-snug text-muted">{label}</p>
              </Reveal>
            ))}
          </div>

          {(S.features.gamification || S.reports.enabled) && (
            <div className="mt-6 grid gap-4 text-left md:grid-cols-2">
              {S.features.gamification && (
                <Reveal className="card p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-ink">Cine a ajutat cel mai mult</h2>
                    <Link href="/clasament" className="text-sm text-ink-2 hover:text-coral-deep">
                      Tot clasamentul →
                    </Link>
                  </div>
                  <ol className="space-y-3">
                    {top.map((r) => (
                      <li key={r.handle} className="flex items-center gap-3">
                        <Avatar name={r.name} rank={r.rank} size={34} />
                        <span className="flex-1">
                          <b className="font-medium">{r.name}</b> <span className="text-xs text-muted">{r.rank.name}</span>
                        </span>
                        <b className="font-semibold text-ink tabular-nums">{r.points}</b>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              )}
              {S.reports.enabled && (
                <Reveal className="card p-6" delay={90}>
                  <h2 className="mb-4 font-semibold text-ink">{S.reports.title}: încercați de pe telefon</h2>
                  <QrPanel url={`${location.origin}/raport`} size={140} label={S.reports.prompt} />
                </Reveal>
              )}
            </div>
          )}

          <Reveal className="mt-20">
            <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-[2.6rem]">
              <Accent text="Încercați acum, *din rolul vostru.*" />
            </h2>
            <div className="mt-8">{roleButtons(false)}</div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

/** Pașii fluxului în stânga; în dreapta, cererea-exemplu stă pe loc și își schimbă starea la fiecare pas. */
function Journey() {
  const steps = [
    { who: roleOf(S.flow.requester).label, title: S.request.addTitle || `${roleOf(S.flow.requester).label}: cererea nouă`, text: roleOf(S.flow.requester).pitch, status: S.flow.initial, stamp: undefined as { label: string; good: boolean } | undefined },
    ...PATH.map((t, i) => {
      const firstOfRole = t.role !== S.flow.requester && PATH.findIndex((x) => x.role === t.role) === i;
      return {
        who: roleOf(t.role).label,
        title: t.label,
        text: t.outcome === "done" ? "Confirmă cel care a cerut, nu cel care a ajutat. Abia acum bucla e închisă, iar dacă n-a mers, spune asta dintr-un clic." : firstOfRole ? roleOf(t.role).pitch : `Toți văd că e rândul lui: ${t.label.toLowerCase()}.`,
        status: t.to,
        stamp: { label: stateOf(S.flow, t.to).label, good: true },
      };
    }),
  ];
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const stations = [S.flow.initial, ...PATH.map((t) => t.to)];

  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-8">
      <Reveal className="text-center">
        <Ribbon>Cum merge</Ribbon>
        <h2 className="mx-auto mt-5 max-w-3xl text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.035em] text-ink sm:text-[3rem]">
          <Accent text={`Un ${S.request.singular}, *de la cap la coadă.*`} />
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-2">Fiecare pas îl face omul care are voie. Toți văd la cine stă.</p>
      </Reveal>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <ol>
          {steps.map((s, i) => (
            <li
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-i={i}
              className={`flex min-h-[46vh] flex-col justify-center border-l-2 pl-6 transition-colors duration-300 lg:min-h-[62vh] ${active === i ? "border-coral" : "border-line"}`}
            >
              <p className="text-sm font-medium text-muted">
                Pasul {i + 1} · {s.who}
              </p>
              <h3 className={`mt-1 text-[1.8rem] leading-tight font-semibold tracking-[-0.03em] transition-colors duration-300 sm:text-[2.2rem] ${active === i ? "text-ink" : "text-ink/35"}`}>{s.title}</h3>
              <p className={`mt-3 max-w-md text-[1.05rem] leading-relaxed transition-colors duration-300 ${active === i ? "text-ink-2" : "text-ink-2/40"}`}>{s.text}</p>
              {/* pe telefon macheta stă sub fiecare pas */}
              <div className="mt-6 lg:hidden">
                <RequestMock status={s.status} stamp={s.stamp} compact />
              </div>
            </li>
          ))}
        </ol>
        <div className="hidden lg:block">
          <div className="sky sticky top-[14vh] grid h-[72vh] place-items-center overflow-hidden rounded-[28px] p-8">
            <div className="relative grid w-full place-items-center">
              {steps.map((s, i) => (
                <div key={i} className="morph col-start-1 row-start-1 flex w-full flex-col items-center gap-6" data-on={active === i}>
                  {SEED_DOC && i === 0 ? (
                    <div className="-rotate-2">
                      <DocPaper doc={SEED_DOC} />
                    </div>
                  ) : (
                    <RequestMock status={s.status} stamp={s.stamp} />
                  )}
                </div>
              ))}
            </div>
            {/* drumul: stațiile fluxului, cea curentă aprinsă */}
            <ol className="absolute inset-x-8 bottom-8 flex items-start justify-between" aria-label="Drumul cererii">
              <span className="absolute top-[7px] right-[6%] left-[6%] h-0.5 bg-ink/15" aria-hidden />
              {stations.map((st, i) => (
                <li key={st} className="relative z-10 flex w-24 flex-col items-center text-center">
                  <span className={`h-4 w-4 rounded-full border-2 transition-all duration-300 ${i < active ? "border-ink bg-ink" : i === active ? "scale-125 border-coral bg-white shadow-[0_0_0_5px_rgb(200_74_55/0.18)]" : "border-ink/25 bg-white"}`} />
                  <span className={`mt-2 text-xs leading-tight ${i === active ? "font-medium text-ink" : "text-ink/55"}`}>{stateOf(S.flow, st).label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/** AI-ul citește, codul verifică, omul confirmă: rulat pe documentul sau cererea din seed, când intră în ecran. */
function AiChapter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -30% 0px" });
  // textul de pe bonul verificat mai jos, ca omul să vadă că cifrele vin din el
  const text = SEED_DOC ? [SEED_DOC.vendor, SEED_DOC.cui && `CUI ${SEED_DOC.cui}`, ...SEED_DOC.lines.map((l) => `${l.label} ${l.amount.toFixed(2)}`), `TOTAL ${SEED_DOC.total.toFixed(2)}`].filter(Boolean).join(" · ") : PROMPT;
  const { typed, done } = useTypewriter(text, { active: inView, speed: 26 });
  // verificările reale (src/lib/checks.ts) pe documentul din seed; altfel câmpurile cererii structurate
  const rows: Array<{ icon: string; tone: string; label: string; detail: string }> =
    SEED_DOC && S.documents
      ? checkDocument(SEED_DOC, { rules: S.documents.rules, category: SEED.category, existing: [], now: new Date(SEED_DOC.date) }).map((c) => ({ icon: ICON[c.level], tone: c.level === "ok" ? "text-[#8fd3a8]" : c.level === "warning" ? "text-[#f1c36b]" : "text-[#ff9c8c]", label: c.label, detail: c.detail }))
      : SEED
        ? [
            { icon: "✓", tone: "text-[#8fd3a8]", label: "Titlu", detail: SEED.title },
            { icon: "✓", tone: "text-[#8fd3a8]", label: "Cât", detail: formatQty(SEED.quantity, SEED.unit) },
            { icon: "✓", tone: "text-[#8fd3a8]", label: "Urgență", detail: `${SEED.urgency} din 5, propusă de AI, decide omul` },
          ]
        : [];
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!done || !inView) return;
    if (shown >= rows.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 700 : 380);
    return () => clearTimeout(t);
  }, [done, inView, shown, rows.length]);

  return (
    <section className="sky-night text-white">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <Reveal>
          <Ribbon>AI-ul propune</Ribbon>
          <h2 className="mx-auto mt-5 max-w-3xl text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[3rem]">
            <Accent text="AI-ul citește, *codul verifică.*" />
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/75">Cifrele nu le inventează AI-ul: le calculează codul. Omul confirmă înainte de orice modificare.</p>
        </Reveal>
        <div ref={ref} className="mx-auto mt-10 max-w-2xl rounded-[22px] bg-cream p-3 text-left text-ink shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
          <div className="flex items-center justify-between px-3 pt-1 pb-3 text-sm">
            <span className="font-medium">{S.app.name}</span>
            <span className="rounded-md bg-ok-tint px-2 py-0.5 text-xs font-medium text-ok">verificare deterministă</span>
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-xs font-medium text-muted">{SEED_DOC ? "Textul de pe bon" : "Cum ar spune-o omul"}</p>
            <p className="mt-1 min-h-[3em] leading-snug">
              {typed}
              {!done && <span className="caret" />}
            </p>
          </div>
          <div className="mt-3 rounded-2xl bg-ink p-4 text-white">
            <p className="text-xs font-medium text-white/60">{shown === 0 && done ? "Se verifică…" : "Rezultatul"}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {rows.map((r, i) => (
                <li key={r.label} className={`flex gap-2 transition-all duration-300 ${i < shown ? "opacity-100" : "translate-y-1 opacity-0"}`}>
                  <span className={`w-4 shrink-0 font-bold ${r.tone}`}>{r.icon}</span>
                  <span>
                    <b className="font-medium">{r.label}:</b> <span className="text-white/80">{r.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
