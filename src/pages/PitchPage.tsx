// Pitch deck-ul, în același sistem vizual ca prima pagină (docs/DESIGN.md): cerul, crem, capitolul
// de noapte, titluri cu un cuvânt în serif coral, panglici. Textele vin din scenariu și din
// PITCH (src/pitch/deck.ts). Slide-ul are 1600×900 și se scalează la ecran.
//   ← → / Space / clicker: slide-ul următor · F: ecran complet · P: PDF (o slide pe pagină)
//   /pitch#4 deschide direct slide-ul 4.

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Accent, Ribbon } from "../components/ui";
import { buildDeck, isTodo, type Maybe, PITCH, type Slide, type Theme } from "../pitch/deck";
import { qrDataUrl } from "../lib/share";
import { scenario } from "../scenario/config";

const W = 1600;
const H = 900;
const DECK = buildDeck(scenario, PITCH, typeof window === "undefined" ? "" : window.location.origin);

const BG: Record<Theme, string> = { sky: "sky", cream: "bg-cream", paper: "bg-paper", night: "sky-night text-white" };

function startIndex() {
  const n = Number(window.location.hash.slice(1));
  return Number.isInteger(n) && n >= 1 && n <= DECK.length ? n - 1 : 0;
}

export function PitchPage() {
  const [i, setI] = useState(startIndex);
  const [scale, setScale] = useState(1);

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
          <section key={n} className={`pitch-slide ${BG[s.theme]} ${n === i ? "" : "hidden"}`} aria-hidden={n !== i} data-testid={`slide-${n + 1}`}>
            <div key={n === i ? "on" : "off"} className="pitch-in flex h-full flex-col">
              <SlideBody s={s} />
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
    <div className={`absolute inset-x-[120px] bottom-[44px] flex items-center justify-between text-[18px] ${dark ? "text-white/60" : "text-muted"}`}>
      <span className="flex items-center gap-3 font-medium">
        <span className={`grid h-7 w-7 place-items-center rounded-md ${dark ? "bg-white" : "bg-ink"}`} aria-hidden>
          <span className="h-3 w-3 rounded-[3px] bg-coral-bright" />
        </span>
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
  return <div className="h-[420px] w-[420px] rounded-3xl bg-white p-5">{src && <img src={src} alt={`Cod QR pentru ${url}`} className="h-full w-full" />}</div>;
}

const H1 = "leading-[1.02] font-semibold tracking-[-0.04em] text-ink";
const H2 = "mt-8 leading-[1.06] font-semibold tracking-[-0.035em] text-ink";
const LEAD = "leading-snug text-ink-2";
const PAD = "flex h-full flex-col px-[120px] pt-[96px] pb-[130px]";

function SlideBody({ s }: { s: Slide }) {
  switch (s.kind) {
    case "cover":
      return (
        <div className={`${PAD} justify-center`}>
          {s.notThis && <p className="text-[30px] text-muted line-through decoration-coral/70 decoration-2">{s.notThis}</p>}
          <h1 className={`${H1} mt-6 max-w-[1300px] text-[96px]`}>
            <Accent text={s.headline} />
          </h1>
          <p className={`${LEAD} mt-10 max-w-[1150px] text-[34px]`}>{s.tagline}</p>
          <div className="mt-auto flex items-end justify-between gap-10 text-[24px] text-ink-2">
            <Show v={s.team}>{(team) => <p>{team.join(" · ")}</p>}</Show>
            <p className="shrink-0 text-muted">{s.event}</p>
          </div>
        </div>
      );

    case "problem":
      return (
        <div className={PAD}>
          <div>
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <p className={`${H2} max-w-[1300px] ${fitText(s.problem)}`}>{s.problem}</p>
          <div className="mt-auto max-w-[1250px]">
            <Show v={s.evidence}>{(e) => <p className="font-serif text-[52px] leading-snug text-coral-deep [font-variation-settings:'opsz'_72,'SOFT'_100]">„{e}”</p>}</Show>
          </div>
        </div>
      );

    case "people":
      return (
        <div className={PAD}>
          <div>
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <h2 className={`${H2} text-[64px]`}>{s.title}</h2>
          <div className="mt-auto grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.min(s.roles.length, 3)}, minmax(0, 1fr))` }}>
            {s.roles.map((r) => (
              <div key={r.label} className="card px-9 py-9">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-[28px] font-semibold text-white">{r.label[0]}</span>
                <p className="mt-6 text-[40px] font-semibold tracking-[-0.02em] text-ink">{r.label}</p>
                <p className="mt-3 text-[26px] leading-snug text-muted">{r.pitch}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "how":
      return (
        <div className={PAD}>
          <div>
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <h2 className={`${H2} text-[64px]`}>{s.title}</h2>
          <ol className="relative mt-auto grid gap-6" style={{ gridTemplateColumns: `repeat(${s.steps.length}, minmax(0, 1fr))` }}>
            <span className="absolute top-[31px] right-[8%] left-[4%] h-[3px] bg-ink/15" aria-hidden />
            {s.steps.map((t, n) => (
              <li key={n} className="relative">
                <span className={`relative grid h-16 w-16 place-items-center rounded-full text-[28px] font-semibold text-white ${t.done ? "bg-ok" : "bg-ink"}`}>{n + 1}</span>
                <p className="mt-6 text-[20px] font-medium tracking-[0.06em] text-muted uppercase">{t.role}</p>
                <p className="mt-2 text-[34px] leading-tight font-semibold text-ink">„{t.label}”</p>
              </li>
            ))}
          </ol>
          {s.failed && (
            <p className="mt-12 flex items-center gap-4 text-[26px] text-ink-2">
              <span className="h-3.5 w-3.5 rounded-full bg-warn-dot" aria-hidden />
              Când n-a mers: „{s.failed.label}” ({s.failed.role.toLowerCase()}). Nimic nu se socotește încheiat.
            </p>
          )}
        </div>
      );

    case "difference":
      return (
        <div className={PAD}>
          <div>
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <h2 className={`${H2} text-[64px]`}>
            <Accent text={s.title} />
          </h2>
          <div className="mt-auto grid grid-cols-3 gap-8">
            {s.columns.map((c, n) => (
              <div key={c.title} className="card px-9 py-9">
                <p className="font-serif text-[56px] leading-none text-coral-bright [font-variation-settings:'opsz'_72]">{n + 1}</p>
                <p className="mt-5 text-[36px] font-semibold tracking-[-0.02em] text-ink">{c.title}</p>
                <p className="mt-3 text-[26px] leading-snug text-muted">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "demo":
      return (
        <div className={`${PAD} flex-row items-center justify-between gap-16`}>
          <div className="max-w-[820px]">
            <h2 className="text-[120px] leading-none font-semibold tracking-[-0.045em]">
              <Accent text={s.title} />
            </h2>
            <p className="mt-10 text-[36px] leading-snug text-white/85">{s.text}</p>
          </div>
          <div className="shrink-0 text-center">
            <Qr url={s.url} />
            <p className="mt-6 text-[26px] font-medium text-white/85">{s.url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
      );

    case "payer":
      return (
        <div className={PAD}>
          <div>
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <p className={`${H2} max-w-[1300px] ${fitText(s.payer)}`}>{s.payer}</p>
          <div className="mt-auto space-y-5">
            {s.evidence.map((e) => (
              <p key={e} className="font-serif text-[34px] leading-snug text-coral-deep [font-variation-settings:'opsz'_48,'SOFT'_100]">
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
          <div>
            <Ribbon>{s.ribbon}</Ribbon>
          </div>
          <h2 className={`${H2} text-[64px]`}>{s.title}</h2>
          <div className="mt-auto">
            <Show v={s.rows}>
              {(rows) => (
                <ul className="card divide-y divide-line px-9 py-2">
                  {rows.map((r) => (
                    <li key={r.need} className="flex items-baseline gap-5 py-5 text-[28px]">
                      <span className="h-3.5 w-3.5 shrink-0 translate-y-[-3px] rounded-full bg-ok" aria-hidden />
                      <span className="flex-1 font-medium text-ink">{r.need}</span>
                      <span className="max-w-[45%] text-right text-muted">{r.where}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Show>
          </div>
        </div>
      );

    case "close":
      return (
        <div className={PAD}>
          <h1 className={`${H1} max-w-[1300px] text-[84px]`}>
            <Accent text={s.headline} />
          </h1>
          <p className={`${LEAD} mt-6 max-w-[1150px] text-[30px]`}>{s.tagline}</p>
          <div className="mt-auto grid grid-cols-2 gap-8">
            <div className="card px-8 py-7">
              <p className="text-[20px] font-medium tracking-[0.06em] text-muted uppercase">Construit azi</p>
              <Show v={s.builtToday}>{(l) => <List items={l} />}</Show>
            </div>
            <div className="card px-8 py-7">
              <p className="text-[20px] font-medium tracking-[0.06em] text-muted uppercase">Ce urmează</p>
              <Show v={s.next}>{(l) => <List items={l} />}</Show>
            </div>
          </div>
          <div className="mt-8 flex items-end justify-between gap-10 text-[24px] text-ink-2">
            <Show v={s.team}>{(team) => <p>{team.join(" · ")}</p>}</Show>
            {s.url && <p className="shrink-0 font-medium text-ink">{s.url.replace(/^https?:\/\//, "")}</p>}
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
