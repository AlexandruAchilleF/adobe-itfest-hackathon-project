// Campanie nouă: referință → ce a văzut Spire → întrebări → kit verificat → salvare.
// Aceeași pagină se încarcă și în extensie (?din=extensie), într-un panou îngust.
import { type ClipboardEvent as ReactClipboardEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button, Card, ErrorNote, Spinner } from "../../components/ui";
import { critiqueWithAi } from "../../lib/critiqueClient";
import type { Anatomy } from "../../lib/anatomy";
import { NEW_CAMPAIGN_STEPS, newCampaignStep } from "../../lib/campaignList";
import { campaigns, type DesignFormat, FORMAT_LABEL, type Kit, kitVerdict, makeKit, saveCampaign } from "../../lib/campaigns";
import { campaignCandidates } from "../../lib/campaign";
import { DesignCanvas } from "../../modules/canvas/DesignCanvas";
import type { Design } from "../../lib/design";
import { revealDelay, SCAN_TIMEOUT_MS, scanRequest } from "../../lib/extensionPanel";
import { reducedMotion } from "../../lib/motion";
import { hasPendingReference, takePendingReference } from "../../lib/pendingReference";
import { isFromExtension, type CritiqueBrief, type PageElement, type PageSummary, parseExtensionMessage, type SectionNode } from "../../lib/extensionBridge";
import { type Answers, type FormatId, type Question, questionsFor, fillBriefGaps, briefSeed } from "../../lib/gaps";
import { analyzeReference, checkMascot, generateMascot, summarizePage, writeCopy } from "../../lib/spireAi";
import { illustrationSignature, readFile, toDataUrl } from "../../lib/spireImages";
import { mascot } from "../../modules/mascot/mascot";
import { MascotFigure } from "../../modules/mascot/MascotFigure";
import { useMascotPage } from "../../modules/mascot/page";
import { CampaignWorkspace } from "./CampaignWorkspace";
import { CheckList, FormatTabs, PanelNav, PanelSection, useBrand, WhatIsNew } from "./parts";
import { ReferenceDrop } from "./ReferenceDrop";

const ROLE_LABEL: Record<Anatomy["zones"][number]["role"], string> = { headline: "titlu", offer: "ofertă", cta: "buton", body: "text", illustration: "ilustrație", logo: "logo", photo: "fotografie" };
const COLOR_LABEL = { background: "fundal", primary: "principală", accent: "accent", text: "text" } as const;

const READING = "Mă uit la imagine…";

const isEmbedded = () => new URLSearchParams(window.location.search).get("din") === "extensie";

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem]" aria-label="Pașii" data-testid="pasii">
      {NEW_CAMPAIGN_STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
          {i > 0 && (
            <svg className="text-muted" width="7" height="12" viewBox="0 0 7 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m1 1 5 5-5 5" />
            </svg>
          )}
          <span className={`grid h-6 w-6 place-items-center rounded-full text-[0.8rem] font-medium ${i <= current ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line"}`} aria-hidden>
            {i + 1}
          </span>
          <span className={i === current ? "font-medium text-ink" : "text-ink-2"}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function WhatISaw({ reference, anatomy, compact }: { reference: string; anatomy: Anatomy; compact: boolean }) {
  return (
    <Card title="Ce am văzut" label="Anatomia">
      <div className="space-y-4">
        <div className={`relative overflow-hidden rounded-lg border border-line ${compact ? "max-lg:mx-auto max-lg:max-w-[240px]" : ""}`}>
          <img src={reference} alt="Referința aleasă" className="block w-full" />
          {anatomy.zones.map((z) => (
            <span
              key={z.id}
              className="absolute border border-ink/70 bg-white/20 text-[0.65rem] leading-none text-ink"
              style={{ left: `${z.box.x * 100}%`, top: `${z.box.y * 100}%`, width: `${z.box.w * 100}%`, height: `${z.box.h * 100}%` }}
            >
              <span className="bg-white/85 px-1">{ROLE_LABEL[z.role]}</span>
            </span>
          ))}
        </div>
        <div>
          <ul className="list-disc space-y-1.5 pl-4 text-[0.95rem] text-ink-2">
            {anatomy.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="mt-4 mb-2 text-sm text-muted">Rolurile culorilor{anatomy.colors.source === "pixeli" ? ", ghicite din pixeli" : ", citite din pagină"}</p>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(COLOR_LABEL) as Array<keyof typeof COLOR_LABEL>).map((role) => (
              <span key={role} className="inline-flex items-center gap-1.5 text-sm text-ink-2">
                <span className="h-4 w-4 rounded border border-line" style={{ background: anatomy.colors[role] }} aria-hidden />
                {COLOR_LABEL[role]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuestionBlock({ q, answers, onAnswer }: { q: Question; answers: Answers; onAnswer: (next: Answers) => void }) {
  const isFormats = q.id === "formats";
  const value = q.id === "formats" ? undefined : answers[q.id];
  const selected = (option: string) => (isFormats ? (answers.formats ?? []).includes(option as FormatId) : value === option);
  const pick = (option: string) => {
    if (!isFormats) return onAnswer({ ...answers, [q.id]: option });
    const current = answers.formats ?? [];
    const f = option as FormatId;
    onAnswer({ ...answers, formats: current.includes(f) ? current.filter((x) => x !== f) : [...current, f] });
  };
  return (
    <fieldset>
      <legend className="mb-2 text-[0.95rem] font-medium text-ink">{q.text}</legend>
      <div className="flex flex-wrap gap-2">
        {q.options.map((option) => (
          <button key={option} type="button" aria-pressed={selected(option)} onClick={() => pick(option)} className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${selected(option) ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-paper-2"}`}>
            {isFormats ? FORMAT_LABEL[option as FormatId] : option}
          </button>
        ))}
        {q.free && <input maxLength={500} aria-label={`${q.text} Scrie tu`} placeholder="Sau scrie tu" value={value && !q.options.includes(value) ? value : ""} onChange={(e) => onAnswer({ ...answers, [q.id]: e.target.value })} className="min-w-40 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink" />}
      </div>
      {q.id === "offer" && (
        <label className="mt-2 flex items-center gap-2 text-sm text-ink-2">
          Prețul, dacă are
          <input placeholder="49 lei" value={answers.price ?? ""} onChange={(e) => onAnswer({ ...answers, price: e.target.value || undefined })} className="w-28 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink" />
        </label>
      )}
    </fieldset>
  );
}

/** Panoul din extensie, înainte de scanare: drumul în trei pași, ca panoul să nu stea gol. */
const PANEL_STEPS = [
  ["Mă uit pe pagină", "Citesc culorile, fonturile, titlurile și butoanele site-ului."],
  ["Îți spun ce aș schimba", "Apoi te întreb ce promovezi și cui te adresezi."],
  ["Facem materialele", "Imagine, logo și video, pe stilul site-ului tău."],
] as const;

function PanelSteps() {
  return (
    <ol className="space-y-4 px-1 pt-3">
      {PANEL_STEPS.map(([title, text], i) => (
        <li key={title} className="panel-step flex gap-3" style={{ animationDelay: `${120 + i * 70}ms` }}>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-ink tabular-nums ring-1 ring-line">{i + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[0.92rem] font-medium text-ink">{title}</p>
            <p className="mt-0.5 text-sm leading-snug text-muted">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Imaginile mari se micșorează înainte de salvare, ca să încapă în browser. */
async function shrinkDesigns(designs: Kit["designs"]): Promise<Kit["designs"]> {
  const shrink = async (design: Design): Promise<Design> => ({
    ...design,
    elements: await Promise.all(design.elements.map(async (e) => (e.type === "image" && e.src.startsWith("data:") ? { ...e, src: await toDataUrl(e.src) } : e))),
  });
  return Object.fromEntries(await Promise.all((Object.entries(designs) as Array<[DesignFormat, Design]>).map(async ([f, d]) => [f, await shrink(d)])));
}

export function NewCampaignPage() {
  const embedded = useMemo(isEmbedded, []);
  const [, navigate] = useLocation();
  const brand = useBrand();
  const brandRef = useRef(brand);
  brandRef.current = brand;

  const [reference, setReference] = useState<string | null>(null);
  const [anatomy, setAnatomy] = useState<Anatomy | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [brief, setBrief] = useState<CritiqueBrief | null>(null);
  const receivedBrief = useRef(false);
  const critiqueRequests = useRef(new Set<string>());
  const [kit, setKit] = useState<Kit | null>(null);
  const [format, setFormat] = useState<DesignFormat>("post");
  // când imaginea vine de pe Acasă, zona de pornire nu mai apare deloc
  const [busy, setBusy] = useState<string | null>(() => (hasPendingReference() ? READING : null));
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  // scanarea din extensie: începe la clic, se încheie după răspuns (cel puțin SCAN_MIN_MS) sau la timeout
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const scanStart = useRef(0);
  const scanTimers = useRef<{ timeout?: number; reveal?: number }>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const page = useRef<PageSummary | null>(null);
  const elements = useRef<PageElement[]>([]);
  const retry = useRef<(() => void) | null>(null);

  useMascotPage({
    title: "Campanie nouă",
    context: () => `Referință: ${reference ? "aleasă" : "nealeasă"}. Anatomie: ${anatomy ? `${anatomy.zones.length} zone` : "încă nu"}. Kit: ${kit ? `${kit.checks.filter((c) => c.ok).length} din ${kit.checks.length} verificări trecute` : "încă nu"}.`,
  });

  const analyze = useCallback(async (image: string, extra?: { elements?: PageElement[]; root?: SectionNode }) => {
    retry.current = () => void analyze(image, extra);
    setReference(image);
    setAnatomy(null);
    setKit(null);
    setSavedId(null);
    setError(null);
    setBusy(READING);
    try {
      const read = await analyzeReference(image.startsWith("data:") ? image : await toDataUrl(image), extra);
      setAnatomy(read);
      // ce are o variantă evidentă vine precompletat și se vede; produsul îl alege omul
      setAnswers((current) => ({ offer: questionsFor(read, brandRef.current, {}).find((q) => q.id === "offer")?.options[0], cta: read.suggestions.cta[0], formats: ["post", "story"], ...current }));
      setSaid(`Am văzut ${read.zones.length} zone. Spune-mi ce promovezi.`);
    } catch (err) {
      setError((err as Error).message);
      setSaid("N-am reușit să citesc imaginea.");
    } finally {
      setBusy(null);
    }
  }, []);

  const pick = useCallback(
    (image: string) => {
      (image.startsWith("data:") ? toDataUrl(image) : Promise.resolve(image)).then(
        (small) => analyze(small),
        (err: Error) => {
          setError(err.message);
          setBusy(null);
        },
      );
    },
    [analyze],
  );

  // imaginea venită de pe /acasa intră pe același drum ca una aleasă aici
  useEffect(() => {
    const image = takePendingReference();
    if (image) pick(image);
  }, [pick]);

  // legătura cu extensia: doar mesaje de la fereastra părinte, care trec schema
  useEffect(() => {
    if (!embedded) return;
    const onMessage = (event: MessageEvent) => {
      if (!isFromExtension(event, window)) return;
      const message = parseExtensionMessage(event.data);
      if (!message) return;
      if (message.type === "spire:critique-request") {
        if (critiqueRequests.current.has(message.requestId)) return;
        critiqueRequests.current.add(message.requestId);
        void critiqueWithAi(message.input).then(
          (result) => window.parent.postMessage({ type: "spire:critique-result", requestId: message.requestId, result }, event.origin),
          () => window.parent.postMessage({ type: "spire:critique-result", requestId: message.requestId, error: "Analiza AI nu este disponibilă." }, event.origin),
        );
      } else if (message.type === "spire:brief") {
        if (receivedBrief.current || new URL(message.brief.source.url).origin !== event.origin) return;
        receivedBrief.current = true;
        setBrief(message.brief);
        setAnswers((current) => ({ ...message.brief.answers, ...current }));
        page.current = { ...message.brief.source, headings: [], ctas: [], colors: [], fonts: [] };
        setSaid("Am păstrat brief-ul. Spune-mi ce materiale facem.");
      } else if (message.type === "spire:page") {
        window.clearTimeout(scanTimers.current.timeout);
        setScanFailed(false);
        page.current = message.page;
        elements.current = message.elements;
        const seed = briefSeed(message.page, message.elements);
        setAnswers(current => fillBriefGaps(current, seed));
        try {
          if (new URL(message.page.url).origin === event.origin) {
            setBrief(current => current || { source: { url: message.page.url, title: message.page.title.slice(0, 300) }, answers: {} });
          }
        } catch { /* O adresă invalidă nu devine sursa unui brief. */ }
        window.parent.postMessage({ type: "spire:brief-suggested", answers: seed }, event.origin);
        void summarizePage(message.page, message.elements)
          .then((read) => {
            setAnswers(current => fillBriefGaps(current, read.suggestedAnswers));
            window.parent.postMessage({ type: "spire:brief-suggested", answers: read.suggestedAnswers }, event.origin);
            // lupa stă cel puțin SCAN_MIN_MS de la apăsare, ca animația să se vadă
            window.clearTimeout(scanTimers.current.reveal);
            scanTimers.current.reveal = window.setTimeout(() => {
              setSaid(read.said);
              setScanning(false);
              setScanned(true);
              sendPicks(read);
            }, revealDelay(scanStart.current, Date.now()));
          })
          .catch((err) => {
            setError((err as Error).message);
            setScanning(false);
          });
      } else if (message.type === "spire:reference") {
        void analyze(message.image, { elements: elements.current.filter((e) => message.elementIds.includes(e.id)) });
      } else {
        void analyze(message.image, { root: message.root });
      }
    };
    // alegerile pleacă spre extensie, ca să aprindă chenarele
    function sendPicks(read: { picks: Array<{ elementId: string; reason: string }> }) {
      const found = elements.current;
      const reasons = new Map(read.picks.map((p) => [p.elementId, p.reason]));
      const w = Math.max(1440, ...found.map((e) => e.box.x + e.box.w));
      const picks = campaignCandidates(found, { w, h: Math.round(w * 0.625) })
        .filter((c) => reasons.has(c.elementId))
        .map((c) => ({ ...c, reason: reasons.get(c.elementId) ?? c.reason }));
      window.parent.postMessage({ type: "spire:picks", picks }, "*");
    }
    window.addEventListener("message", onMessage);
    const hostOrigin = new URLSearchParams(window.location.search).get("hostOrigin");
    try { window.parent.postMessage({ type: "spire:brief-ready" }, new URL(hostOrigin || document.referrer).origin); } catch { window.parent.postMessage({ type: "spire:brief-ready" }, "*"); }
    const timers = scanTimers.current;
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timers.timeout);
      window.clearTimeout(timers.reveal);
    };
  }, [embedded, analyze]);

  const scan = () => {
    setError(null);
    setScanning(true);
    setSaid("Mă uit pe pagină…");
    scanStart.current = Date.now();
    window.parent.postMessage(scanRequest(), "*");
    window.clearTimeout(scanTimers.current.timeout);
    scanTimers.current.timeout = window.setTimeout(() => {
      setScanning(false);
      setScanFailed(true);
      setSaid("Nu primesc nimic de la pagină. Închide Spire și deschide-l din nou.");
    }, SCAN_TIMEOUT_MS);
  };

  const onPaste = (e: ReactClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) void readFile(file).then(pick);
  };

  const run = async () => {
    if (!anatomy || !reference) return;
    retry.current = () => void run();
    setError(null);
    setKit(null);
    setSavedId(null);
    setBusy("Fac campania și o verific…");
    try {
      const next = await makeKit(
        { anatomy, brand, answers, reference },
        {
          writeCopy: (failed) => writeCopy(anatomy, brand, answers, failed),
          generateMascot: () => generateMascot(reference, anatomy, brand),
          checkMascot: (generated) => checkMascot(generated, brand),
          signature: (generated) => illustrationSignature(generated, reference),
        },
      );
      setKit(next);
      setFormat((Object.keys(next.designs) as DesignFormat[])[0] ?? "post");
      const message = kitVerdict(next);
      mascot.say(message, next.checks.every((c) => c.ok) ? "happy" : "worried");
      setSaid(message);
    } catch (err) {
      setError((err as Error).message);
      setSaid("Campania n-a ieșit de data asta.");
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!kit || !anatomy || !reference) return;
    setError(null);
    setBusy("Salvez…");
    try {
      const rec = await saveCampaign(campaigns, {
        title: Object.values(kit.copy)[0] ?? answers.product ?? "Campanie",
        source: page.current ? { url: page.current.url, title: page.current.title } : null,
        reference,
        anatomy,
        answers,
        copy: kit.copy,
        illustration: kit.illustration?.startsWith("data:") ? await toDataUrl(kit.illustration) : kit.illustration,
        designs: await shrinkDesigns(kit.designs),
        hero: null,
        checks: kit.checks,
        createdAt: new Date().toISOString(),
      });
      if (embedded) setSavedId(rec.id);
      else navigate(`/campanii/${rec.id}`);
    } catch (err) {
      retry.current = () => void save();
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // pe pagina întreagă, kitul iese sub întrebări: îl aducem la vedere
  const kitCard = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (kit && !embedded) kitCard.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  }, [kit, embedded]);

  const questions = anatomy ? questionsFor(anatomy, brand, {}) : [];
  const ready = Boolean(answers.product?.trim());
  const formats = kit ? (Object.keys(kit.designs) as DesignFormat[]) : [];
  const design = kit?.designs[format];
  // în panou, designul pe referință pornește doar dintr-un chenar ales pe pagină, nu dintr-o imagine încărcată
  const showPicker = !anatomy && !busy && !embedded;
  const mood = scanning ? "searching" : scanFailed || error ? "worried" : busy ? "thinking" : kit ? "happy" : "idle";
  const sectioned = embedded && Boolean(brief);
  const scanButton = (
    <Button variant={scanned || sectioned ? "secondary" : "primary"} className="w-full" onClick={scan} disabled={scanning || Boolean(busy)} aria-busy={scanning}>
      {scanning && <Spinner />}
      {scanning ? "Mă uit pe pagină…" : scanned ? "Scanează din nou" : "Scanează pagina"}
    </Button>
  );

  // Drumul pe o referință (imagine aleasă sau zonă din pagină): ce am văzut, întrebările, kitul.
  const referenceFlow = (
    <>
      {showPicker && <ReferenceDrop onPick={pick} action="primary" />}

      {reference && anatomy && (
        <div className={embedded ? "space-y-4" : "grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start"}>
          <WhatISaw reference={reference} anatomy={anatomy} compact={!embedded} />
          <Card title="Câteva lucruri de la tine" label="Întrebările">
            <div className="space-y-5">
              {questions.map((q) => (
                <QuestionBlock key={q.id} q={q} answers={answers} onAnswer={setAnswers} />
              ))}
            </div>
            <div className="mt-6">
              <Button variant={kit ? "secondary" : "primary"} disabled={!ready || Boolean(busy)} onClick={() => void run()}>
                {kit ? "Refă campania" : "Fă campania"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {busy && !embedded && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <Spinner /> {busy}
        </p>
      )}

      {kit && (
        <div ref={kitCard} className="scroll-mt-24">
          <Card title="Kitul tău" label="Rezultatul" actions={<FormatTabs formats={formats} value={format} onChange={setFormat} />}>
            <div className={embedded ? "space-y-4" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"}>
              {design && (
                <div className="pointer-events-none min-w-0">
                  {embedded ? (
                    <DesignCanvas design={design} />
                  ) : (
                    <div className="kit-stage" style={{ "--design-ratio": design.height / design.width } as CSSProperties}>
                      <DesignCanvas design={design} fitHeight />
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-4">
                <CheckList checks={kit.checks} />
                <WhatIsNew />
                {kit.error && <p className="text-sm text-muted">AI-ul n-a răspuns ({kit.error}), așa că textele sunt chiar răspunsurile tale.</p>}
                {savedId ? (
                  <a className="btn btn-secondary" href={`/campanii/${savedId}`} target="_blank" rel="noreferrer">
                    Deschide în Campanii
                  </a>
                ) : (
                  <Button variant="primary" disabled={Boolean(busy)} onClick={() => void save()}>
                    Salvează campania
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );

  return (
    <div onPaste={showPicker ? undefined : onPaste} className={embedded ? "mx-auto max-w-[480px] space-y-4 p-3 pb-10" : "space-y-5"}>
      {embedded && (
          /* uliul rămâne la vedere cât derulezi panoul (copil direct al paginii, altfel `sticky` s-ar
             opri la capătul părintelui); replica lui reapare la fiecare schimbare. Cu brief-ul primit,
             dedesubt apar secțiunile, ca să sari direct unde ai treabă. */
          <div className="sticky top-0 z-10 -mx-3 -mt-3 space-y-2.5 border-b border-line bg-paper px-3 pt-2 pb-3 [@media(max-height:520px)]:static">
            <div className="flex items-start gap-1">
              <div className="shrink-0">
                <MascotFigure mood={mood} size={sectioned ? 64 : 84} />
              </div>
              <div className={`speech card min-w-0 flex-1 px-3.5 ${sectioned ? "mt-1.5 py-2.5" : "mt-3 py-3"}`}>
                <p key={busy ?? said} className="speech-text text-[0.92rem] leading-snug text-ink" role="status" aria-live="polite">
                  {busy ?? (said || "Sunt Spire. Apasă „Scanează pagina” și mă uit pe site-ul tău.")}
                </p>
              </div>
            </div>
            {sectioned && (
              <PanelNav
                sections={[
                  { id: "observatii", label: "Observații" },
                  { id: "brief", label: "Brief" },
                  { id: "materiale", label: "Materiale" },
                  ...(anatomy ? [{ id: "design", label: "Design" }] : []),
                ]}
              />
            )}
          </div>
      )}
      {embedded && !sectioned && (
        <div className="space-y-3">
          {scanButton}
          {!brief && !scanned && !scanning && !reference && <PanelSteps />}
        </div>
      )}
      {/* după critică, panoul are brief-ul: scanarea aprinde chenarele, iar chenarul ales e referința campaniei */}
      {sectioned && !anatomy && scanButton}
      {!embedded && (
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h1 className="text-[1.6rem] leading-tight font-semibold text-ink sm:text-[1.9rem]">Campanie nouă</h1>
          <Steps current={newCampaignStep({ anatomy, kit })} />
        </header>
      )}

      {error && (
        <div className="space-y-2">
          <ErrorNote error={error} />
          {retry.current && (
            <Button variant="secondary" onClick={() => retry.current?.()}>
              Încearcă din nou
            </Button>
          )}
        </div>
      )}

      {brief && <CampaignWorkspace brief={brief} answers={answers} brand={brand} onAnswersChange={setAnswers} />}
      {/* în panou, designul pe referință apare doar când alegi un chenar de pe pagină;
          pentru o zonă recreată în cod e butonul Inspire din bara panoului */}
      {sectioned ? (
        anatomy && (
          <div className="pt-5">
            <PanelSection id="design" title="Design pe stilul ales">
              {referenceFlow}
            </PanelSection>
          </div>
        )
      ) : (
        referenceFlow
      )}
    </div>
  );
}
