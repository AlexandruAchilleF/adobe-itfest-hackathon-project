// Campanie nouă: referință → ce a văzut Spire → întrebări → kit verificat → salvare.
// Aceeași pagină se încarcă și în extensie (?din=extensie), într-un panou îngust.
import { type ClipboardEvent as ReactClipboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button, Card, ErrorNote, PageHeader, Spinner } from "../../components/ui";
import { critiqueWithAi } from "../../lib/critiqueClient";
import type { Anatomy } from "../../lib/anatomy";
import { campaigns, type DesignFormat, FORMAT_LABEL, type Kit, kitVerdict, makeKit, saveCampaign } from "../../lib/campaigns";
import { campaignCandidates } from "../../lib/campaign";
import { DesignCanvas } from "../../modules/canvas/DesignCanvas";
import type { Design } from "../../lib/design";
import { revealDelay, SCAN_TIMEOUT_MS, scanRequest } from "../../lib/extensionPanel";
import { isFromExtension, type CritiqueBrief, type PageElement, type PageSummary, parseExtensionMessage, type SectionNode } from "../../lib/extensionBridge";
import { type Answers, type FormatId, type Question, briefQuestions, questionsFor } from "../../lib/gaps";
import { analyzeReference, checkMascot, generateMascot, summarizePage, writeCopy } from "../../lib/spireAi";
import { illustrationSignature, readFile, toDataUrl } from "../../lib/spireImages";
import { mascot } from "../../modules/mascot/mascot";
import { MascotFigure } from "../../modules/mascot/MascotFigure";
import { useMascotPage } from "../../modules/mascot/page";
import { CampaignWorkspace } from "./CampaignWorkspace";
import { CheckList, FormatTabs, useBrand, WhatIsNew } from "./parts";

const ROLE_LABEL: Record<Anatomy["zones"][number]["role"], string> = { headline: "titlu", offer: "ofertă", cta: "buton", body: "text", illustration: "ilustrație", logo: "logo", photo: "fotografie" };
const COLOR_LABEL = { background: "fundal", primary: "principală", accent: "accent", text: "text" } as const;
const SAMPLE = "/samples/spire/referinta.png";

const isEmbedded = () => new URLSearchParams(window.location.search).get("din") === "extensie";

function ReferencePicker({ onPick }: { onPick: (image: string) => void }) {
  return (
    <Card title="De la ce pornim?" label="Referința">
      <p className="mb-4 text-[0.95rem] text-ink-2">Alege o imagine cu un stil care îți place, pe care ai dreptul să o folosești, sau lipește-o aici cu Ctrl+V.</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn btn-primary cursor-pointer">
          Alege o imagine
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFile(file).then(onPick);
            }}
          />
        </label>
        <Button variant="ghost" onClick={() => onPick(SAMPLE)}>
          Folosește exemplul
        </Button>
      </div>
    </Card>
  );
}

function WhatISaw({ reference, anatomy }: { reference: string; anatomy: Anatomy }) {
  return (
    <Card title="Ce am văzut" label="Anatomia">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,240px)_1fr]">
        <div className="relative self-start overflow-hidden rounded-lg border border-line">
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
  const [busy, setBusy] = useState<string | null>(null);
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
    setBusy("Mă uit la imagine…");
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
      void (image.startsWith("data:") ? toDataUrl(image) : Promise.resolve(image)).then((small) => analyze(small));
    },
    [analyze],
  );

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
        setSaid("Am păstrat brief-ul. Alege o referință pentru campanie.");
      } else if (message.type === "spire:page") {
        window.clearTimeout(scanTimers.current.timeout);
        setScanFailed(false);
        page.current = message.page;
        elements.current = message.elements;
        void summarizePage(message.page, message.elements)
          .then((read) => {
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

  const questions = anatomy ? questionsFor(anatomy, brand, {}) : [];
  const ready = Boolean(answers.product?.trim());
  const formats = kit ? (Object.keys(kit.designs) as DesignFormat[]) : [];
  const design = kit?.designs[format];

  return (
    <div onPaste={onPaste} className={embedded ? "mx-auto max-w-[420px] space-y-4 p-3" : "space-y-5"}>
      {embedded ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <MascotFigure mood={scanning ? "searching" : scanFailed || error ? "worried" : busy ? "thinking" : kit ? "happy" : "idle"} size={64} />
            <p className="card flex-1 p-3 text-[0.92rem] leading-snug text-ink">{busy ?? (said || "Sunt Spire. Apasă „Scanează pagina” și mă uit pe site-ul tău.")}</p>
          </div>
          <Button variant={scanned ? "secondary" : "primary"} className="w-full" onClick={scan} disabled={scanning || Boolean(busy)} aria-busy={scanning}>
            {scanned ? "Scanează din nou" : "Scanează pagina"}
          </Button>
        </div>
      ) : (
        <PageHeader title="Campanie nouă" description="Spire ia stilul din imaginea aleasă și îl pune pe marca ta. Rezultatul e verificat înainte să-l vezi." />
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
      {brief && (
        <Card title="Brief-ul tău" label="Din pagină">
          <p className="mb-4 text-sm text-muted">{brief.source.title}</p>
          <div className="space-y-5">
            {briefQuestions(brief.answers.cta !== undefined ? ["link-vag"] : [], brief.source.title).map((q) => <QuestionBlock key={q.id} q={q} answers={answers} onAnswer={setAnswers} />)}
          </div>
        </Card>
      )}
      {!reference && (!embedded || brief) && <ReferencePicker onPick={pick} />}
      {reference && anatomy && <WhatISaw reference={reference} anatomy={anatomy} />}

      {anatomy && (
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
      )}

      {busy && !embedded && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <Spinner /> {busy}
        </p>
      )}

      {kit && (
        <Card title="Kitul tău" label="Rezultatul" actions={<FormatTabs formats={formats} value={format} onChange={setFormat} />}>
          <div className={embedded ? "space-y-4" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]"}>
            {design && (
              <div className="pointer-events-none min-w-0">
                <DesignCanvas design={design} />
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
      )}
    </div>
  );
}
