// Pitch deck-ul, pe capitolele landing-ului (src/pages/spire/LandingPage.tsx): cerul pictat cu uliul,
// hârtia crem cu aripi, machetele animate, noaptea, zorii lila și apusul; titluri cu un cuvânt în serif
// coral, panglici. Imaginile sunt cele din public/landing/. Textele vin din scenariu și din
// PITCH (src/pitch/deck.ts). Slide-ul are 1600×900 și se scalează la ecran.
//   ← → / Space / clicker: slide-ul următor · F: ecran complet · P: PDF (o slide pe pagină)
//   /pitch#4 deschide direct slide-ul 4.

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Accent, Ribbon } from "../components/ui";
import { HawkMark } from "../pitch/HawkMark";
import { buildDeck, isTodo, type Maybe, type Mock, PITCH, type Slide, type Theme } from "../pitch/deck";
import { qrDataUrl } from "../lib/share";
import { useTypewriter } from "../lib/motion";
import { AfterMock, AskMock, GuardMock, KitMock, type LandingData, ReferenceMock, Scaled, ScanMock, useLandingData } from "./spire/LandingMockups";
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
  const [i, setI] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const data = useLandingData();

  const go = useCallback((d: number) => setI((x) => Math.min(DECK.length - 1, Math.max(0, x + d))), []);

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
    const onHash = () => setI(startIndex());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) go(1);
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) go(-1);
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(DECK.length - 1);
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
              <SlideBody s={s} active={n === i} data={data} />
            </div>
            <Footer theme={s.theme} n={n} />
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

/** Textele lungi din scenariu (problema, plătitorul) coboară o treaptă, ca să încapă fără să fie tăiate. */
const fitText = (text: string) => (text.length > 150 ? "text-[46px]" : text.length > 90 ? "text-[56px]" : "text-[64px]");

function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void qrDataUrl(url, 760).then((d) => alive && setSrc(d));
    return () => {
      alive = false;
    };
  }, [url]);
  return <div className="land-frame h-[400px] w-[400px] p-7">{src && <img src={src} alt={`Cod QR pentru ${url}`} className="h-full w-full" />}</div>;
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

function SlideBody({ s, active, data }: { s: Slide; active: boolean; data: LandingData }) {
  switch (s.kind) {
    case "cover":
      return <Cover s={s} active={active} />;

    case "problem":
      return (
        <div className={`${PAD} relative`}>
          <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute top-[40px] left-[-150px] w-[560px]" />
          <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute top-[40px] right-[-150px] w-[560px] -scale-x-100" />
          <div className="relative">
            <Head ribbon={s.ribbon} title={s.title} size={64} />
            <p className={`${LEAD} mx-auto mt-6 max-w-[1000px] text-center text-[28px]`}>{s.problem}</p>
          </div>
          <div className="relative mt-10 grid grid-cols-3 gap-7">
            {s.pains.map((p, n) => (
              <div key={p} className="land-sky-card flex flex-col items-center justify-center gap-5 px-8 text-center" style={{ minHeight: 210 }}>
                <svg width="52" height="52" viewBox="0 0 38 38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink" aria-hidden>
                  {PAIN_ICONS[n % PAIN_ICONS.length]}
                </svg>
                <p className="text-[30px] leading-tight font-semibold tracking-[-0.02em] text-ink">{p}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-auto text-center">
            <Show v={s.evidence}>{(e) => <p className="accent-serif text-[36px] leading-snug">„{e}”</p>}</Show>
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

    case "beforeAfter":
      return (
        <div className={`${PAD} flex-row items-center gap-14`}>
          <div className="w-[500px] shrink-0">
            <Head ribbon={s.ribbon} title={s.title} center={false} dark size={72} />
            <p className="mt-7 text-[27px] leading-snug text-white/80">{s.text}</p>
          </div>
          <div className="land-stage grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-5 p-7">
            <figure>
              <div className="mx-auto w-[330px]">
                <ReferenceMock alt="Referința: o postare pentru ceai rece, cu o cămilă" />
              </div>
              <figcaption className="mt-3 text-center text-[19px] text-ink-2">Referința văzută pe un site</figcaption>
            </figure>
            <svg width="44" height="26" viewBox="0 0 40 24" className="text-coral" aria-hidden>
              <path d="M2 12h34M26 3l10 9-10 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <figure>
              <div className="mx-auto w-[330px]">
                <AfterMock data={data} />
              </div>
              <figcaption className="mt-3 text-center text-[19px] text-ink-2">Mascota, pe marca ta</figcaption>
            </figure>
          </div>
        </div>
      );

    case "architecture":
      return (
        <div className={`${PAD} pt-[60px] pb-[100px]`}>
          <Head ribbon={s.ribbon} title={s.title} size={58} />
          <div className="my-auto pt-6">
            <Show v={s.system}>
              {(a) => (
                <>
                  <ol className="grid grid-cols-6 gap-3">
                    {a.steps.map((step, n) => (
                      <li key={step.title} className="relative">
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
                  <p className="story-prompt mt-6 flex items-center gap-3 px-6 py-4 text-[24px] font-medium text-ink">
                    <img src="/landing/hawk-mark.svg" alt="" className="h-6 w-6" />
                    {a.loop}
                  </p>
                  <ul className="mt-6 grid grid-cols-3 gap-8">
                    {a.failures.map((f) => (
                      <li key={f.when} className="text-[22px] leading-snug text-ink-2">
                        <span className="flex items-center gap-2.5 font-medium text-ink">
                          <span className="h-3 w-3 rounded-full bg-warn-dot" aria-hidden />
                          {f.when}
                        </span>
                        {f.then}
                      </li>
                    ))}
                  </ul>
                </>
              )}
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
          <p className={`${H2} relative mt-8 max-w-[1200px] text-ink ${fitText(s.payer)}`}>{s.payer}</p>
          <div className="relative mt-auto max-w-[1150px] space-y-5">
            {s.evidence.map((e) => (
              <p key={e} className="accent-serif text-[34px] leading-snug">
                „{e}”
              </p>
            ))}
            <Show v={s.market}>{(m) => <p className="text-[30px] text-ink-2">{m}</p>}</Show>
          </div>
        </div>
      );

    case "brief":
      return (
        <div className={PAD}>
          <Head ribbon={s.ribbon} title={s.title} center={false} size={64} />
          <div className="mt-auto">
            <Show v={s.rows}>
              {(rows) => (
                <ul className="land-frame divide-y divide-line px-9 py-2">
                  {rows.map((r) => (
                    <li key={r.need} className="flex items-baseline gap-5 py-5 text-[27px]">
                      <span className="h-3.5 w-3.5 shrink-0 translate-y-[-3px] rounded-full bg-ok" aria-hidden />
                      <span className="flex-1 font-medium text-ink">{r.need}</span>
                      <span className="max-w-[45%] text-right text-ink-2">{r.where}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Show>
          </div>
        </div>
      );

    case "demo":
      return (
        <div className={`${PAD} flex-row items-center justify-between gap-16 pt-[96px]`}>
          <div className="max-w-[820px]">
            <h2 className="text-[124px] leading-none font-semibold tracking-[-0.045em] text-ink">
              <Accent text={s.title} />
            </h2>
            <p className={`${LEAD} mt-9 text-[34px]`}>{s.text}</p>
          </div>
          <div className="shrink-0 text-center">
            <Qr url={s.url} />
            <p className="mt-5 inline-block rounded-lg bg-white/85 px-4 py-1.5 text-[24px] font-medium text-ink">{s.url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      );

    case "close":
      return (
        <div className={`${PAD} items-center pt-[80px] text-center`}>
          <Ribbon>reSPIRĂ</Ribbon>
          <h1 className="mt-7 text-[104px] leading-[1.0] font-semibold tracking-[-0.045em] text-ink">{s.question}</h1>
          <p className="text-[104px] leading-[1.05] tracking-[-0.03em]">
            <span className="accent-serif">{s.answer}</span>
          </p>
          <div className="mt-auto grid w-full grid-cols-2 gap-7 text-left">
            <div className="land-frame px-8 py-6">
              <p className={LABEL}>Construit azi</p>
              <Show v={s.builtToday}>{(l) => <List items={l} />}</Show>
            </div>
            <div className="land-frame px-8 py-6">
              <p className={LABEL}>Ce urmează</p>
              <Show v={s.next}>{(l) => <List items={l} />}</Show>
            </div>
          </div>
          <div className="mt-6 flex w-full items-end justify-between gap-10 text-[22px] text-ink">
            <Show v={s.team}>{(team) => <p className="font-medium">{team.join(" · ")}</p>}</Show>
            {s.url && <p className="shrink-0 font-medium">{s.url.replace(/^https?:\/\//, "")}</p>}
          </div>
        </div>
      );
  }
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-[26px] leading-snug text-ink">
      {items.map((t) => (
        <li key={t} className="flex gap-3">
          <span className="mt-[14px] h-2 w-2 shrink-0 rounded-full bg-coral" aria-hidden />
          {t}
        </li>
      ))}
    </ul>
  );
}
