// Machetele de pe landing page: fluxul Spire cap-coadă, construit din piesele reale ale aplicației
// (DesignPreview, CheckList, MascotFigure, WhatIsNew) și din datele calculate de cod (src/lib/landingDemo.ts).
// Fiecare machetă e desenată la o mărime fixă și scalată la lățimea coloanei, ca să arate la fel la 390 și la 1680 px.
// Mișcarea pornește doar cât macheta e activă și sare la starea finală cu prefers-reduced-motion.
import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { demoBrand } from "../../lib/brand";
import { type Campaign, FORMAT_LABEL, guardCampaign, kitVerdict, seedCampaign } from "../../lib/campaigns";
import { FORMATS } from "../../lib/compose";
import type { Check } from "../../lib/guard";
import { boxPercent, DEMO_SITE, demoQuestions, demoScan, guardReplay, type Measured, type ReplayStep } from "../../lib/landingDemo";
import { useSequence } from "../../lib/motion";
import { illustrationSignature } from "../../lib/spireImages";
import { MascotFigure } from "../../modules/mascot/MascotFigure";
import { scenario } from "../../scenario/config";
import { StatusDot } from "../../scenario/ui/parts";
import { DesignPreview } from "./DesignPreview";
import { CheckList, WhatIsNew } from "./parts";

const S = scenario;

// ——— datele: campania de exemplu, ilustrația măsurată de gardă, bucla reluată ———

export interface LandingData {
  campaign: Campaign;
  /** verificările kitului, cu ilustrația măsurată când s-a putut citi */
  checks: Check[];
  /** încercările buclei gărzii (prima pică la preț, a doua trece) */
  steps: ReplayStep[] | null;
}

export function useLandingData(): LandingData {
  const campaign = useMemo(seedCampaign, []);
  const [measured, setMeasured] = useState<{ value: Measured } | null>(null);
  useEffect(() => {
    let live = true;
    const done = (value: Measured) => live && setMeasured({ value });
    if (!campaign.illustration) done(undefined);
    // amprenta se calculează în browser, ca în aplicație; dacă imaginea nu se poate citi, garda nu inventează rândurile
    else illustrationSignature(campaign.illustration, campaign.reference).then(done, () => done(undefined));
    return () => {
      live = false;
    };
  }, [campaign]);
  const checks = useMemo(
    () => (measured ? guardCampaign({ designs: campaign.designs, brand: demoBrand, answers: campaign.answers, copy: campaign.copy, illustration: measured.value }) : campaign.checks),
    [campaign, measured],
  );
  const [steps, setSteps] = useState<ReplayStep[] | null>(null);
  useEffect(() => {
    if (!measured) return;
    let live = true;
    void guardReplay(campaign, demoBrand, measured.value).then((s) => live && setSteps(s));
    return () => {
      live = false;
    };
  }, [campaign, measured]);
  return { campaign, checks, steps };
}

// ——— piese comune ———

/** Desenul la mărime fixă, scalat la lățimea containerului. */
export function Scaled({ width, height, children, className = "" }: { width: number; height: number; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1.25, el.clientWidth / width) || 1);
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} className={`relative w-full ${className}`} style={{ height: height * scale }}>
      <div className="absolute top-0 left-1/2 origin-top" style={{ width, height, transform: `translateX(-50%) scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function Window({ address, title, children, className = "" }: { address?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`land-window ${className}`}>
      <div className="land-winbar">
        <span className="land-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {address ? (
          <span className="land-address">
            <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden>
              <rect x="0.5" y="4" width="7" height="4.5" rx="1" fill="currentColor" />
              <path d="M2 4V2.8a2 2 0 0 1 4 0V4" fill="none" stroke="currentColor" />
            </svg>
            {address}
          </span>
        ) : (
          <span className="flex-1 text-center text-[10.5px] font-medium text-ink-2">{title}</span>
        )}
        <span className="w-[34px]" aria-hidden />
      </div>
      {children}
    </div>
  );
}

function Cursor({ at, pressed }: { at: { x: number; y: number }; pressed?: boolean }) {
  return (
    <svg className="land-cursor" style={{ left: at.x, top: at.y }} data-pressed={Boolean(pressed)} viewBox="0 0 20 20" aria-hidden>
      <path d="M3 2l12.5 7.2-5.6 1.4 3.1 5.6-2.4 1.3-3.1-5.6L3.5 15z" fill="#1b2350" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function SpireToast({ on, children, className = "" }: { on: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`land-toast land-card absolute z-20 flex items-start gap-2 px-3 py-2.5 ${className}`} data-on={on} role="status" aria-hidden={!on}>
      <img src="/landing/hawk-mark.svg" alt="" className="mt-px h-4 w-4 shrink-0" />
      <p className="text-[11px] leading-snug text-ink">{children}</p>
    </div>
  );
}

/** Colțul stânga-sus al unui element, în coordonatele machetei (nescalate), plus un decalaj. */
function usePoint(target: RefObject<HTMLElement | null>, root: RefObject<HTMLElement | null>, dx: number, dy: number, deps: unknown[]) {
  const [p, setP] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const t = target.current;
    const r = root.current;
    if (!t || !r) return;
    const tr = t.getBoundingClientRect();
    const rr = r.getBoundingClientRect();
    const scale = rr.width / (r.offsetWidth || 1) || 1;
    setP({ x: (tr.left - rr.left) / scale + dx, y: (tr.top - rr.top) / scale + dy });
    // se recalculează la fiecare fază (deps vin de la cel care apelează)
  }, deps);
  return p;
}

// ——— 1. Se uită: extensia pe site-ul de referință ———

const W = 560;
const H = 470;
const VIEW_W = 520;
const VIEW_H = 390;
const u = (n: number) => (n * VIEW_W) / DEMO_SITE.viewport.w;
const SITE = { sand: "#F4E3C1", ink: "#2B1D14", rust: "#B5472F", teal: "#2F6F73" };
const PANEL = 0.37;
const KIND_LABELS = { hero: "hero", offer: "ofertă", mascot: "mascotă", cta: "buton", badge: "insignă" } as const; // ca în content.js

function DemoSite({ dim = false }: { dim?: boolean }) {
  const el = (id: string) => boxPercent(id);
  return (
    <div className="absolute inset-0" style={{ background: SITE.sand, filter: dim ? "blur(2px)" : undefined }}>
      <div className="absolute inset-x-0 top-0" style={{ height: `${(96 / DEMO_SITE.viewport.h) * 100}%`, background: "#FBF2E2" }} />
      {["el-1", "el-2", "el-3"].map((id) => (
        <span key={id} className="absolute font-medium" style={{ ...el(id), fontSize: u(26), color: SITE.ink }}>
          {DEMO_SITE.elements.find((e) => e.id === id)?.text}
        </span>
      ))}
      <span className="absolute font-bold tracking-[-0.04em] whitespace-nowrap" style={{ ...el("el-4"), fontSize: u(96), lineHeight: 1.1, color: SITE.ink }}>
        Ceai rece
      </span>
      <span className="absolute flex items-center justify-center rounded-full font-semibold text-white" style={{ ...el("el-5"), fontSize: u(26), background: SITE.teal }}>
        -30% azi la orice ceai rece
      </span>
      <span className="absolute flex items-center justify-center rounded-[10px] font-semibold text-white" style={{ ...el("el-6"), fontSize: u(28), background: SITE.rust }}>
        Comandă acum
      </span>
      <img src="/samples/spire/referinta-ilustratie.jpg" alt="" className="absolute rounded-[14px] object-cover" style={el("el-7")} />
    </div>
  );
}

function ExtensionPanel({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-y-0 right-0 flex flex-col gap-2.5 border-l border-[#e3e5ea] bg-white p-2.5 shadow-[-8px_0_24px_rgb(31_42_68/0.12)]" style={{ width: `${PANEL * 100}%` }}>
      <div className="flex items-center justify-end gap-1.5">
        {["Decupează", "Strânge"].map((b) => (
          <span key={b} className="rounded-md border border-[#e3e5ea] px-1.5 py-0.5 text-[9px] font-medium text-ink">
            {b}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

export function ScanMock({ active }: { active: boolean }) {
  const { picks, said } = useMemo(demoScan, []);
  const phase = useSequence(active, [700, 1400, 3200, 4600], { loop: true, rest: 3200 });
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLSpanElement>(null);
  const mascotBox = useRef<HTMLSpanElement>(null);
  const toButton = usePoint(button, root, 70, 10, [phase]);
  const toMascot = usePoint(mascotBox, root, 60, 90, [phase]);
  const scanning = phase === 2;
  const scanned = phase >= 3;
  const cursor = phase >= 4 ? toMascot : phase >= 1 ? toButton : { x: 170, y: 300 };
  const text = scanned ? said : scanning ? "Mă uit pe pagină…" : "Sunt Spire. Apasă „Scanează pagina” și mă uit pe site-ul tău.";
  return (
    <div ref={root} className="land-stage relative" style={{ width: W, height: H }}>
      <Window address={DEMO_SITE.url} className="absolute top-6 left-5">
        <div className="relative overflow-hidden" style={{ width: VIEW_W, height: VIEW_H }}>
          <DemoSite />
          {scanning && <span className="land-scanline" style={{ ["--h" as string]: `${VIEW_H}px` }} aria-hidden />}
          {picks.map((p, i) => (
            <span
              key={p.elementId}
              ref={p.kind === "mascot" ? mascotBox : undefined}
              className="land-xbox"
              data-lit={scanned}
              data-hover={phase >= 4 && p.kind === "mascot"}
              style={{ ...boxPercent(p.elementId), transitionDelay: scanned ? `${i * 250}ms` : "0ms" }}
            >
              <span className="land-xlabel">{KIND_LABELS[p.kind]}</span>
              {phase >= 4 && p.kind === "mascot" && <span className="land-xpick">Alege</span>}
            </span>
          ))}
          <ExtensionPanel>
            <div className="flex items-start gap-1.5">
              <span className="-mt-1 -ml-1 shrink-0">
                <MascotFigure mood={scanning ? "searching" : "idle"} size={46} />
              </span>
              <p className="land-card min-h-[74px] flex-1 rounded-[10px] p-2 text-[9.5px] leading-snug text-ink">{text}</p>
            </div>
            <span
              ref={button}
              data-pressed={phase === 2}
              className={`land-press block rounded-[8px] py-1.5 text-center text-[10px] font-medium ${scanned ? "bg-white text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "bg-coral text-white"}`}
            >
              {scanned ? "Scanează din nou" : "Scanează pagina"}
            </span>
            {scanned && (
              <ul className="space-y-1">
                {picks.map((p, i) => (
                  <li key={p.elementId} className="land-row flex items-start gap-1.5 text-[8.5px] leading-snug text-ink-2" data-on={scanned} style={{ transitionDelay: `${300 + i * 250}ms` }}>
                    <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-ok" aria-hidden />
                    {p.reason}
                  </li>
                ))}
              </ul>
            )}
          </ExtensionPanel>
        </div>
      </Window>
      <Cursor at={cursor} pressed={phase === 2} />
    </div>
  );
}

// ——— 2. Întreabă: panoul cu cele trei întrebări ———

export function AskMock({ active, campaign }: { active: boolean; campaign: Campaign }) {
  const questions = useMemo(() => demoQuestions(campaign, demoBrand), [campaign]);
  const phase = useSequence(active, [600, 1250, 1500, 2500], { loop: true, rest: 3000 });
  const root = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const run = useRef<HTMLSpanElement>(null);
  const toTarget = usePoint(target, root, 22, 9, [phase]);
  const toRun = usePoint(run, root, 50, 10, [phase]);
  const ctaPicked = phase >= 2;
  const cursor = phase >= 4 ? toRun : phase >= 1 ? toTarget : { x: 470, y: 400 };
  const picked = (id: string, option: string) => {
    if (id === "offer") return option === campaign.answers.offer;
    if (id === "cta") return ctaPicked && option === campaign.answers.cta;
    return (campaign.answers.formats ?? []).includes(option as "post");
  };
  return (
    <div ref={root} className="land-stage relative" style={{ width: W, height: H }}>
      <div className="absolute top-6 left-5 opacity-60" aria-hidden>
        <Window address={DEMO_SITE.url}>
          <div className="relative overflow-hidden" style={{ width: VIEW_W, height: VIEW_H }}>
            <DemoSite dim />
          </div>
        </Window>
      </div>
      <div className="land-card absolute top-10 right-8 w-[318px] space-y-3.5 p-4">
        <div className="flex items-start gap-2">
          <span className="-mt-1 -ml-1 shrink-0">
            <MascotFigure mood={phase >= 4 ? "happy" : "listening"} size={44} />
          </span>
          <p className="land-card flex-1 rounded-[10px] p-2.5 text-[10.5px] leading-snug text-ink">
            Am văzut {campaign.anatomy.zones.length} zone. Culorile, fonturile și pe {demoBrand.mascot.name} le iau din marcă.
          </p>
        </div>
        {questions.map((q) => (
          <div key={q.id}>
            <p className="mb-1.5 text-[11px] font-medium text-ink">{q.text}</p>
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((o) => {
                const on = picked(q.id, o);
                const isTarget = q.id === "cta" && o === campaign.answers.cta;
                return (
                  <span
                    key={o}
                    ref={isTarget ? target : undefined}
                    data-pressed={isTarget && phase === 2}
                    className={`land-press rounded-[7px] border px-2 py-1 text-[10px] ${on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink"}`}
                  >
                    {q.id === "formats" ? FORMAT_LABEL[o as "post"] : o}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <span ref={run} className="land-press inline-block rounded-[8px] bg-coral px-3 py-1.5 text-[10.5px] font-medium text-white" data-pressed={phase >= 4}>
          Fă campania
        </span>
      </div>
      <Cursor at={cursor} pressed={phase === 2} />
    </div>
  );
}

// ——— 3. Face: kitul generat, cu bifele gărzii ———

function Checks({ checks, on, size = "sm" }: { checks: Check[]; on: boolean; size?: "sm" | "xs" }) {
  return (
    <ul className={size === "xs" ? "space-y-[5px]" : "space-y-1.5"}>
      {checks.map((c, i) => (
        <li key={c.id} className={`land-row flex items-start gap-1.5 leading-snug text-ink ${size === "xs" ? "text-[9px]" : "text-[10.5px]"}`} data-on={on} style={{ transitionDelay: on ? `${i * 70}ms` : "0ms" }}>
          <span className="mt-[4px] flex">
            <StatusDot status={c.ok ? "verificat" : "respins"} />
          </span>
          <span className="min-w-0 flex-1">{c.message}</span>
          {c.source === "ai" && <span className="text-muted">AI</span>}
        </li>
      ))}
    </ul>
  );
}

const passedOf = (checks: Check[]) => checks.filter((c) => c.ok).length;

export function KitMock({ active, data }: { active: boolean; data: LandingData }) {
  const { campaign, checks, steps } = data;
  const phase = useSequence(active, [250, 650, 1100, 2300], { loop: true, rest: 3600 });
  const { post, story } = campaign.designs;
  const verdict = steps ? kitVerdict({ checks: steps.at(-1)?.checks ?? checks, attempts: steps.length }) : `${passedOf(checks)} din ${checks.length} verificări trec.`;
  return (
    <div className="land-stage relative" style={{ width: W, height: H }}>
      <Window title={`${S.app.name} · Kitul tău`} className="absolute top-6 left-5">
        <div className="flex gap-4 p-4" style={{ width: VIEW_W, height: VIEW_H }}>
          <div className="flex w-[262px] shrink-0 flex-col">
            <div className="flex items-center gap-1">
              {(["post", "story"] as const).map((f, i) => (
                <span key={f} className={`rounded-md px-2 py-0.5 text-[10px] ${i === 0 ? "bg-ink text-white" : "text-ink-2"}`}>
                  {FORMAT_LABEL[f]}
                </span>
              ))}
            </div>
            <div className="flex flex-1 items-center gap-2.5">
              {post && (
                <span className="land-toast block w-[170px]" data-on={phase >= 1}>
                  <DesignPreview design={post} rounded className="block w-full rounded-lg shadow-[0_14px_28px_-16px_rgb(27_35_80/0.5)]" />
                </span>
              )}
              {story && (
                <span className="land-toast block w-[82px]" data-on={phase >= 2}>
                  <DesignPreview design={story} rounded className="block w-full rounded-lg shadow-[0_14px_28px_-16px_rgb(27_35_80/0.5)]" />
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1 border-l border-line-2 pl-4">
            <p className="text-[11px] font-semibold text-ink">Garda</p>
            <p className="mt-0.5 mb-2.5 text-[10px] font-medium text-ok">
              {passedOf(checks)} din {checks.length} verificări trec
            </p>
            <Checks checks={checks} on={phase >= 3} size="xs" />
          </div>
        </div>
      </Window>
      <SpireToast on={phase >= 4} className="right-9 bottom-9 w-[250px]">
        {verdict}
      </SpireToast>
    </div>
  );
}

// ——— 5. Exportul: doar ce merge azi (PNG) ———

export function ExportMock({ active, campaign }: { active: boolean; campaign: Campaign }) {
  const phase = useSequence(active, [600, 1300, 1550], { loop: true, rest: 3600 });
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLSpanElement>(null);
  const toButton = usePoint(button, root, 56, 12, [phase]);
  const { post } = campaign.designs;
  const file = `${campaign.title}-post.png`;
  return (
    <div ref={root} className="land-stage relative" style={{ width: W, height: H }}>
      <Window title={`${S.app.name} · ${campaign.title}`} className="absolute top-6 left-5">
        <div className="flex gap-4 p-4" style={{ width: VIEW_W, height: VIEW_H }}>
          {post && <DesignPreview design={post} rounded className="w-[262px] self-start rounded-lg shadow-[0_14px_28px_-16px_rgb(27_35_80/0.5)]" />}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="land-card space-y-2.5 rounded-[12px] p-3">
              <p className="text-[11px] font-semibold text-ink">Exportul</p>
              <div className="text-[10px] [&_p]:text-[10px]">
                <WhatIsNew />
              </div>
              <span ref={button} data-pressed={phase === 2} className="land-press inline-block rounded-[8px] bg-coral px-3 py-1.5 text-[10.5px] font-medium text-white">
                Descarcă PNG
              </span>
            </div>
            <p className="text-[10px] leading-snug text-muted">
              Straturile rămân editabile în {S.app.name}: textul, culorile și poziția fiecărui element.
            </p>
          </div>
        </div>
      </Window>
      <div className="land-toast land-card absolute right-6 bottom-5 flex w-[244px] items-center gap-2.5 px-3 py-2.5" data-on={phase >= 3} aria-hidden={phase < 3}>
        <span className="grid h-8 w-7 shrink-0 place-items-center rounded-[5px] bg-paper-2 text-[8px] font-semibold text-ink-2">PNG</span>
        <span className="min-w-0">
          <span className="block truncate text-[10.5px] font-medium text-ink">{file}</span>
          <span className="block text-[9.5px] text-muted">
            {FORMATS.post.width} × {FORMATS.post.height} px, descărcat
          </span>
        </span>
      </div>
      <Cursor at={phase >= 1 ? toButton : { x: 200, y: 380 }} pressed={phase === 2} />
    </div>
  );
}

// ——— 4. Garda în acțiune: prețul greșit, apoi corectat de buclă ———

export function GuardMock({ active, data }: { active: boolean; data: LandingData }) {
  const { campaign, checks, steps } = data;
  const phase = useSequence(active && Boolean(steps), [1700, 3000], { loop: true, rest: 4200 });
  const first = steps?.[0];
  const last = steps?.at(-1);
  const step = phase >= 2 ? last : first;
  const shown = step?.checks ?? checks;
  const failed = shown.find((c) => !c.ok);
  const offerId = `${campaign.anatomy.zones.find((z) => z.role === "offer")?.id ?? "offer"}-bg`;
  const design = step?.designs.post ?? campaign.designs.post;
  const passed = passedOf(shown);
  const message = phase >= 2 && steps ? kitVerdict({ checks: shown, attempts: steps.length }) : phase === 1 ? "Refac textul ofertei, știind ce a picat…" : failed ? `${failed.message}. Corectez.` : "";
  return (
    <div className="relative" style={{ width: 680, height: 430 }}>
      <Window title={`Garda · ${demoBrand.name}`} className="absolute inset-x-0 top-0">
        <div className="flex gap-5 p-5" style={{ height: 398 }}>
          {design && (
            <DesignPreview design={design} rounded ring={failed && phase < 2 ? { id: offerId, color: "#b4372a" } : undefined} className="w-[262px] shrink-0 self-start rounded-lg shadow-[0_14px_28px_-16px_rgb(27_35_80/0.5)]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">{phase >= 2 ? "Corectura 1 din 2" : "Prima variantă"}</p>
              <p className={`text-[12px] font-medium ${passed === shown.length ? "text-ok" : "text-bad"}`}>
                {passed} din {shown.length} verificări trec
              </p>
            </div>
            <div className="mt-3 [&_li]:text-[11.5px]">
              <CheckList checks={shown} />
            </div>
          </div>
        </div>
      </Window>
      <SpireToast on={Boolean(message)} className="right-5 bottom-[-14px] w-[300px]">
        {message}
      </SpireToast>
    </div>
  );
}

// ——— Înainte și după ———

export function AfterMock({ data }: { data: LandingData }) {
  const { campaign, checks } = data;
  const shown = (["illustration-palette", "not-copy", "brand-colors"] as const).map((id) => checks.find((c) => c.id === id)).filter((c): c is Check => Boolean(c));
  return (
    <div className="relative">
      <Window title={`${demoBrand.name} · ${FORMAT_LABEL.post}`}>
        {campaign.designs.post && <DesignPreview design={campaign.designs.post} rounded className="block aspect-[4/5] w-full" />}
      </Window>
      {/* bifele calculate pe ilustrația măsurată, sub designul pe care îl verifică */}
      <ul className="land-card relative mx-3 -mt-3 space-y-1.5 rounded-[12px] px-3 py-2.5">
        {shown.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-[0.8rem] leading-snug text-ink">
            <StatusDot status={c.ok ? "verificat" : "respins"} />
            {c.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReferenceMock({ alt }: { alt: string }) {
  return (
    <Window address={DEMO_SITE.url}>
      <img src="/samples/spire/referinta.png" alt={alt} className="block aspect-[4/5] w-full object-cover" />
    </Window>
  );
}
