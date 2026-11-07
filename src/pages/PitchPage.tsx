// Pitch deck-ul, pe capitolele landing-ului (src/pages/spire/LandingPage.tsx): cerul pictat cu uliul,
// hârtia crem cu aripi, machetele animate, noaptea, zorii lila și apusul; titluri cu un cuvânt în serif
// coral, panglici. Imaginile sunt cele din public/landing/. Textele vin din scenariu și din
// PITCH (src/pitch/deck.ts). Slide-ul are 1600×900 și se scalează la ecran.
//   ← → / Space / clicker: pasul sau slide-ul următor (arhitectura se aprinde pas cu pas) · F: ecran complet · P: PDF (o slide pe pagină)
//   /pitch#4 deschide direct slide-ul 4.

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Accent, Ribbon } from "../components/ui";
import { HawkMark } from "../pitch/HawkMark";
import { buildDeck, isTodo, type Fact, type Maybe, type Mock, move, PITCH, type Position, type Slide, type Theme } from "../pitch/deck";
import { useTypewriter } from "../lib/motion";
import { AskMock, GuardMock, KitMock, type LandingData, ReferenceMock, Scaled, ScanMock, useLandingData } from "./spire/LandingMockups";
import { scenario } from "../scenario/config";

const W = 1600;
const H = 900;
const DECK = buildDeck(scenario, PITCH, typeof window === "undefined" ? "" : window.location.origin);

/** fundalul fiecărui capitol: imaginea pictată (dacă are) și culoarea de sub ea */
const BG: Record<Theme, { className: string; img?: string }> = {
  hero: { className: "bg-cream", img: "/landing/hero.webp" },
  cream: { className: "bg-cream" },
  night: { className: "bg-night text-white", img: "/landing/night.webp" },
  dawn: { className: "pitch-dawn" },
  sky: { className: "bg-cream", img: "/landing/sky.webp" },
  dusk: { className: "bg-cream", img: "/landing/dusk.webp" },
};

function startIndex() {
  const n = Number(window.location.hash.slice(1));
  return Number.isInteger(n) && n >= 1 && n <= DECK.length ? n - 1 : 0;
}

export function PitchPage() {
  const [pos, setPos] = useState<Position>(() => ({ slide: startIndex(), reveal: 1 }));
  const i = pos.slide;
  const [scale, setScale] = useState(1);
  const data = useLandingData();

  const go = useCallback((d: 1 | -1) => setPos((x) => move(DECK, x, d)), []);

  useEffect(() => {
    document.title = `${scenario.app.name} · pitch`;
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    history.replaceState(null, "", `#${i + 1}`);
  }, [i]);

  useEffect(() => {
    const onHash = () => setPos((x) => (x.slide === startIndex() ? x : { slide: startIndex(), reveal: 1 }));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) go(1);
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) go(-1);
      else if (e.key === "Home") setPos({ slide: 0, reveal: 1 });
      else if (e.key === "End") setPos({ slide: DECK.length - 1, reveal: 1 });
      else if (e.key === "f" || e.key === "F") void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
      else if (e.key === "p" || e.key === "P") window.print();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div
      className="pitch-viewport fixed inset-0 overflow-hidden bg-night"
      onClick={(e) => go(e.clientX < window.innerWidth / 3 ? -1 : 1)}
      data-testid="pitch"
    >
      <div
        className="pitch-stage absolute"
        style={{ width: W, height: H, left: (window.innerWidth - W * scale) / 2, top: (window.innerHeight - H * scale) / 2, transform: `scale(${scale})` }}
      >
        {DECK.map((s, n) => (
          <section key={n} className={`pitch-slide ${BG[s.theme].className} ${n === i ? "" : "hidden"}`} aria-hidden={n !== i} data-testid={`slide-${n + 1}`}>
            {BG[s.theme].img && !(s.kind === "cover" && s.mark) && <img src={BG[s.theme].img} alt="" className={`absolute inset-0 h-full w-full object-cover ${s.theme === "hero" ? "pitch-hero-img" : ""}`} />}
            <div key={n === i ? "on" : "off"} className="pitch-in relative flex h-full flex-col">
              <SlideBody s={s} active={n === i} reveal={n === i ? pos.reveal : Infinity} data={data} />
            </div>
            {s.kind !== "video" && <Footer theme={s.theme} n={n} />}
          </section>
        ))}
      </div>
      <p className="pointer-events-none fixed right-3 bottom-2 text-xs text-white/40 print:hidden">← → · F ecran complet · P PDF</p>
    </div>
  );
}

function Footer({ theme, n }: { theme: Theme; n: number }) {
  const dark = theme === "night";
  return (
    <div className={`absolute inset-x-[100px] bottom-[36px] flex items-center justify-between text-[18px] ${dark ? "text-white/70" : "text-ink-2"}`}>
      <span className={`flex items-center gap-2.5 text-[22px] font-semibold tracking-[-0.03em] ${dark ? "text-white" : "text-ink"}`}>
        <img src="/landing/hawk-mark.svg" alt="" className="h-7 w-7" />
        {scenario.app.name}
      </span>
      <span className="tabular-nums">
        {n + 1} / {DECK.length}
      </span>
    </div>
  );
}

/** Ce lipsește: casetă punctată, ca echipa s-o vadă la repetiție și s-o completeze. */
function Todo({ text, dark }: { text: string; dark?: boolean }) {
  return (
    <p className={`rounded-2xl border-2 border-dashed px-6 py-4 text-[24px] ${dark ? "border-white/40 text-white/80" : "border-warn-dot bg-warn-tint/60 text-warn"}`} data-testid="pitch-todo">
      De completat: {text}
    </p>
  );
}

function Show<T>({ v, dark, children }: { v: Maybe<T>; dark?: boolean; children: (v: T) => ReactNode }) {
  return isTodo(v) ? <Todo text={v.todo} dark={dark} /> : <>{children(v)}</>;
}

/** Video-ul demo, pe tot ecranul, fără sunet: echipa vorbește peste el. Pornește de la început când intri pe slide. */
function DemoVideo({ src, missing, active }: { src: string; missing: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    } else video.pause();
  }, [active]);
  if (failed) {
    return (
      <div className="flex h-full items-center justify-center px-[100px]" data-testid="pitch-video-missing">
        <p className="text-center text-[40px] font-medium text-white">{missing}</p>
      </div>
    );
  }
  return <video ref={ref} src={src} muted playsInline preload="auto" onError={() => setFailed(true)} className="h-full w-full bg-night object-contain" data-testid="pitch-video" />;
}

const H2 = "leading-[1.04] font-semibold tracking-[-0.04em] whitespace-pre-line";
const LEAD = "leading-snug text-ink-2";
const PAD = "flex h-full flex-col px-[100px] pt-[72px] pb-[120px]";
const LABEL = "text-[19px] font-medium tracking-[0.06em] text-muted uppercase";

const OWNER_DOT = { AI: "bg-coral-bright", cod: "bg-ink", om: "bg-ok" };

/** iconițele durerilor, aceleași ca pe landing */
const PAIN_ICONS: ReactNode[] = [
  <path key="0" d="M6 30c6-12 12-18 22-20M8 12h10M8 18h6M24 24l6 6M30 24l-6 6" />,
  <g key="1">
    <circle cx="13" cy="14" r="7" />
    <circle cx="25" cy="14" r="7" />
    <circle cx="19" cy="25" r="7" />
  </g>,
  <path key="2" d="M8 8h14l10 10-12 12L8 20zM14 14h.01M17 25l8-8" />,
];

function Head({ ribbon, title, center = true, dark = false, size = 68 }: { ribbon: string; title: string; center?: boolean; dark?: boolean; size?: number }) {
  return (
    <div className={center ? "text-center" : undefined}>
      <Ribbon>{ribbon}</Ribbon>
      <h2 className={`${H2} mt-7 ${dark ? "text-white" : "text-ink"}`} style={{ fontSize: size }}>
        <Accent text={title} />
      </h2>
    </div>
  );
}

function Mockup({ mock, active, data }: { mock: Mock; active: boolean; data: LandingData }) {
  if (mock === "scan") return <ScanMock active={active} />;
  if (mock === "ask") return <AskMock active={active} campaign={data.campaign} />;
  return <KitMock active={active} data={data} />;
}

function Cover({ s, active }: { s: Extract<Slide, { kind: "cover" }>; active: boolean }) {
  const { typed, done } = useTypewriter(s.says, { active, loop: true, speed: 32, pause: 2600 });
  const text = active ? typed : s.says;
  return (
    <div className={`${PAD} relative items-center pt-[90px]`}>
      {s.mark && <HawkMark width={540} className="pointer-events-none absolute top-[120px] left-[-60px]" />}
      {s.notThis && <p className="rounded-lg bg-[#fbe9df]/90 px-4 py-1.5 text-[24px] text-coral-deep line-through decoration-coral-deep/70">{s.notThis}</p>}
      <h1 className="mt-6 max-w-[1100px] text-center text-[92px] leading-[1.0] font-semibold tracking-[-0.045em] whitespace-pre-line text-ink">
        <Accent text={s.headline.replace("? ", "?\n")} />
      </h1>
      <div className="story-prompt mt-9 w-[740px] px-7 py-5 text-left">
        <p className="flex items-center gap-2.5 text-[21px] font-medium text-coral-deep">
          <img src="/landing/hawk-mark.svg" alt="" className="h-6 w-6" />
          {s.name} se uită la pagina ta
        </p>
        <p className="mt-2 min-h-[84px] text-[24px] leading-relaxed text-ink" aria-label={s.says}>
          <span aria-hidden>
            {text}
            {active && !done && <span className="caret" />}
          </span>
        </p>
      </div>
      <div className="mt-auto flex flex-col items-center gap-1 text-[22px] text-ink-2">
        <Show v={s.team}>{(team) => <p className="font-medium text-ink">{team.join(" · ")}</p>}</Show>
        <p>{s.event}</p>
      </div>
    </div>
  );
}

function SlideBody({ s, active, reveal, data }: { s: Slide; active: boolean; reveal: number; data: LandingData }) {
  switch (s.kind) {
    case "cover":
      return <Cover s={s} active={active} />;

    case "guess":
      return (
        <div className={`${PAD} flex-row items-center gap-20 pt-[56px]`}>
          <div className="w-[560px] shrink-0">
            <ReferenceMock alt="Referința: o postare pentru ceai rece, cu o cămilă" />
          </div>
          <div className="flex-1">
            <Head ribbon={s.ribbon} title={s.title} center={false} size={104} />
            <p className={`${LEAD} mt-8 text-[36px]`}>{s.text}</p>
            <ul className="mt-12 flex gap-6">
              {s.options.map((o) => (
                <li key={o} className="land-frame flex h-[120px] w-[170px] items-center justify-center text-[60px] font-semibold tracking-[-0.03em] text-ink">
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );

    case "problem":
      return (
        <div className={`${PAD} relative`}>
          <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute top-[40px] left-[-150px] w-[560px]" />
          <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute top-[40px] right-[-150px] w-[560px] -scale-x-100" />
          <div className="relative">
            <Head ribbon={s.ribbon} title={s.title} size={64} />
            <p className={`${LEAD} mx-auto mt-6 max-w-[1000px] text-center text-[28px]`}>{s.problem}</p>
          </div>
          <div className="relative mt-7 grid grid-cols-3 gap-7">
            {s.pains.map((p, n) => (
              <div key={p} className="land-sky-card flex flex-col items-center justify-center gap-3 px-8 text-center" style={{ minHeight: 150 }}>
                <svg width="40" height="40" viewBox="0 0 38 38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink" aria-hidden>
                  {PAIN_ICONS[n % PAIN_ICONS.length]}
                </svg>
                <p className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">{p}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-auto text-center">
            <Show v={s.evidence}>
              {(e) =>
                typeof e === "string" ? (
                  <p className="accent-serif text-[36px] leading-snug">„{e}”</p>
                ) : (
                  <FactLine fact={e} className="mx-auto max-w-[1200px] text-[24px]" />
                )
              }
            </Show>
          </div>
        </div>
      );

    case "how":
      return (
        <div className={`${PAD} pt-[60px]`}>
          <Head ribbon={s.ribbon} title={s.title} size={60} />
          <ol className="mt-9 grid grid-cols-3 gap-7">
            {s.steps.map((step) => (
              <li key={step.tag}>
                <div className="land-stage p-4">
                  <Scaled width={560} height={470}>
                    <Mockup mock={step.mock} active={active} data={data} />
                  </Scaled>
                </div>
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="rounded-md bg-coral-tint px-3 py-1 text-[19px] font-medium text-coral-deep">{step.tag}</span>
                  <p className="text-[32px] leading-tight font-semibold tracking-[-0.03em] text-ink">
                    <Accent text={step.title} />
                  </p>
                </div>
                <p className="mt-2 text-[22px] leading-snug text-ink-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      );

    case "guard":
      return (
        <div className={`${PAD} flex-row items-center gap-16`}>
          <div className="w-[520px] shrink-0">
            <Head ribbon={s.ribbon} title={s.title} center={false} size={76} />
            <p className={`${LEAD} mt-7 text-[27px]`}>{s.text}</p>
          </div>
          <div className="land-stage flex-1 px-8 py-9">
            <Scaled width={680} height={452}>
              <GuardMock active={active} data={data} />
            </Scaled>
          </div>
        </div>
      );

    case "architecture":
      return (
        <div className={`${PAD} pt-[52px] pb-[92px]`}>
          <Head ribbon={s.ribbon} title={s.title} size={54} />
          <div className="my-auto pt-4">
            <Show v={s.system}>
              {(a) => {
                const lit = (step: number) => (reveal >= step ? "pitch-reveal" : "pitch-reveal pitch-dim");
                const rest = lit(a.steps.length + 1);
                return (
                  <>
                    <ol className="grid grid-cols-6 gap-3">
                      {a.steps.map((step, n) => (
                        <li key={step.title} className={`relative ${lit(n + 1)}`}>
                          <div className="land-frame flex h-full flex-col px-5 py-5">
                            <span className="flex items-center gap-2 text-[18px] font-medium tracking-[0.06em] text-muted uppercase">
                              <span className={`h-3 w-3 rounded-full ${OWNER_DOT[step.owner]}`} aria-hidden />
                              {step.owner}
                            </span>
                            <p className="mt-3 text-[27px] font-semibold tracking-[-0.02em] text-ink">{step.title}</p>
                            <p className="mt-2 text-[20px] leading-snug text-ink-2">{step.text}</p>
                          </div>
                          {n < a.steps.length - 1 && (
                            <svg width="18" height="14" viewBox="0 0 40 24" className="absolute top-1/2 right-[-15px] z-10 -translate-y-1/2 text-coral" aria-hidden>
                              <path d="M2 12h34M26 3l10 9-10 9" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className={`relative h-[78px] ${rest}`}>
                      <svg viewBox="0 0 1400 78" className="absolute inset-0 h-full w-full text-coral" aria-hidden>
                        <path d="M1053 2V34H582V8M572 18l10-12 10 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="absolute top-[40px] left-[817px] -translate-x-1/2 text-[21px] font-medium whitespace-nowrap text-ink">{a.loop}</p>
                    </div>
                    <p className={`mt-3 text-center text-[23px] font-medium text-ink ${rest}`}>{a.video}</p>
                    <ul className={`mt-5 grid grid-cols-3 gap-8 ${rest}`}>
                      {a.failures.map((f) => (
                        <li key={f.when} className="text-[21px] leading-snug text-ink-2">
                          <span className="flex items-center gap-2.5 font-medium text-ink">
                            <span className="h-3 w-3 rounded-full bg-warn-dot" aria-hidden />
                            {f.when}
                          </span>
                          {f.then}
                        </li>
                      ))}
                    </ul>
                  </>
                );
              }}
            </Show>
          </div>
        </div>
      );

    case "payer":
      return (
        <div className={`${PAD} relative`}>
          <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute right-[-160px] bottom-[-40px] w-[560px] -scale-x-100" />
          <div className="relative">
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <div className="relative mt-8 max-w-[1200px]">
            <Show v={s.market}>
              {(m) => (
                <>
                  {m.figure && (
                    <p className="text-[176px] leading-none">
                      <span className="accent-serif">{m.figure}</span>
                    </p>
                  )}
                  <FactLine fact={m} big className="mt-4 text-[36px]" />
                </>
              )}
            </Show>
          </div>
          <div className="relative mt-auto max-w-[1150px] space-y-5">
            <p className="text-[32px] leading-snug font-semibold tracking-[-0.02em] text-ink">{s.payer}</p>
            {s.evidence.map((e) => (
              <p key={e} className="accent-serif text-[34px] leading-snug">
                „{e}”
              </p>
            ))}
            {s.facts.map((f) => (
              <FactLine key={f.text} fact={f} className="text-[26px]" />
            ))}
          </div>
        </div>
      );

    case "video":
      return <DemoVideo src={s.src} missing={s.missing} active={active} />;

    case "close":
      return (
        <div className={`${PAD} items-center pt-[56px] pb-[96px] text-center`}>
          <h1 className="mt-5 text-[80px] leading-[1.0] font-semibold tracking-[-0.045em] text-ink">{s.question}</h1>
          <p className="text-[80px] leading-[1.05] tracking-[-0.03em]">
            <span className="accent-serif">{s.answer}</span>
          </p>
          <div className="mt-auto grid w-full grid-cols-2 gap-7 text-left">
            <div className="land-frame px-8 py-5">
              <p className={LABEL}>Construit azi</p>
              <Show v={s.builtToday}>{(l) => <List items={l} />}</Show>
            </div>
            <div className="land-frame px-8 py-5">
              <p className={LABEL}>Ce urmează</p>
              <Show v={s.next}>{(l) => <List items={l} />}</Show>
            </div>
          </div>
          <div className="mt-4 flex w-full items-end justify-between gap-10 text-[22px] text-ink">
            <Show v={s.team}>{(team) => <p className="font-medium">{team.join(" · ")}</p>}</Show>
            {s.url && <p className="shrink-0 font-medium">{s.url.replace(/^https?:\/\//, "")}</p>}
          </div>
        </div>
      );
  }
}

/** O cifră de pe net, cu sursa sub ea: pe slide nu apare nicio cifră fără sursă. */
function FactLine({ fact, className = "", big = false }: { fact: Fact; className?: string; big?: boolean }) {
  return (
    <div className={className}>
      {fact.figure && !big && (
        <p className="mb-2 text-[68px] leading-none">
          <span className="accent-serif">{fact.figure}</span>
        </p>
      )}
      <p className="leading-snug font-medium text-ink">{fact.text}</p>
      <p className="mt-1 text-[20px] text-ink-2">Sursa: {fact.source}</p>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-[22px] leading-snug text-ink">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span className="mt-[12px] h-2 w-2 shrink-0 rounded-full bg-coral" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );
}
