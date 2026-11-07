import { useEffect, useRef, useState } from "react";
import { MascotFigure } from "../../modules/mascot/MascotFigure";
import { Button, ErrorNote, Spinner } from "../../components/ui";
import { PanelSection } from "./parts";
import type { Brand } from "../../lib/brand";
import type { CritiqueBrief } from "../../lib/extensionBridge";
import type { Answers } from "../../lib/gaps";
import {
  askCampaignClarifications, campaignOrigin, contextSnapshot, enqueueAsset, imageCampaignTransport,
  restoreWorkspaceDraft, validateAssetResult, workspaceCollection,
  type AssetKind, type CampaignJob, type WorkspaceDraft,
} from "../../lib/campaignQueue";

type Props = { brief: CritiqueBrief; answers: Answers; brand: Brand; onAnswersChange?: (answers: Answers) => void };
const KIND: Record<AssetKind, string> = { image: "Imagine", logo: "Logo", video: "Video" };
const STATUS: Record<CampaignJob["status"], string> = { queued: "În coadă", generating: "Se pregătește", ready: "Gata", error: "Eroare", unavailable: "Indisponibil" };
const fields = [{ id: "product", label: "Produs sau serviciu" }, { id: "audience", label: "Public" }, { id: "goal", label: "Obiectiv" }, { id: "cta", label: "Acțiunea dorită" }] as const;
/** Cât durează randarea videoclipului pe ecran (testele o scurtează cu window.__spireVideoMs). */
const videoRenderMs = () => (typeof window !== "undefined" && (window as { __spireVideoMs?: number }).__spireVideoMs) || 20_000;
const RENDER_STAGES: Array<[number, string]> = [
  [0.14, "Citesc brief-ul și observațiile"],
  [0.34, "Scriu scenariul, scenă cu scenă"],
  [0.55, "Pun culorile și fonturile mărcii"],
  [0.8, "Randez cadrele"],
  [1, "Finalizez videoclipul"],
];
const FRAMES = 12;

/** Randarea videoclipului: uliul lucrează, etapele se schimbă, cadrele se aprind pe rând. */
function VideoRender({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(t);
  }, []);
  const t = Math.min(1, Math.max(0, (now - startedAt) / videoRenderMs()));
  // încetinește spre final și se oprește la 97 %: ultimul pas e apariția clipului
  const progress = Math.min(0.97, 1 - Math.pow(1 - t, 1.6));
  const stage = RENDER_STAGES.find(([upTo]) => progress < upTo)?.[1] ?? RENDER_STAGES[RENDER_STAGES.length - 1][1];
  const lit = Math.floor(progress * FRAMES);
  return (
    <div className="video-render mt-3 overflow-hidden rounded-xl bg-ink text-white" role="status" aria-live="polite" aria-label={`${stage}, ${Math.round(progress * 100)} %`}>
      <div className="relative grid aspect-video place-items-center">
        <div className="video-render-sweep" aria-hidden />
        <div className="relative flex flex-col items-center">
          <MascotFigure mood="thinking" size={76} />
          <p key={stage} className="speech-text mt-1 text-[0.9rem] font-medium text-white">{stage}…</p>
          <p className="mt-0.5 text-xs text-white/60 tabular-nums">{Math.round(progress * 100)} %</p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <div className="h-1 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-coral-bright transition-[width] duration-200 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-2 grid grid-cols-12 gap-1" aria-hidden>
          {Array.from({ length: FRAMES }, (_, i) => (
            <span key={i} className={`h-4 rounded-[3px] transition-colors duration-300 ${i < lit ? "bg-white/70" : i === lit ? "video-frame-now bg-white/30" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Videoclipul gata: apare de sus în jos, cu buton de ecran complet. */
function VideoResult({ url, onError }: { url: string; onError: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="relative mt-3">
      <video ref={ref} controls autoPlay muted playsInline preload="metadata" className="video-reveal max-h-80 w-full rounded-xl bg-ink" src={url} onError={onError} />
      <Button variant="ghost" className="absolute top-2 right-2 !bg-ink/80 !px-2.5 !py-1.5 text-xs !text-white hover:!bg-ink" onClick={() => void ref.current?.requestFullscreen?.().catch(() => onError())}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></svg>
        Ecran complet
      </Button>
    </div>
  );
}

const message = (error: unknown) => error instanceof Error ? error.message : "Operația nu a reușit. Reîncearcă.";

export function CampaignWorkspace(props: Props) {
  return <Workspace key={campaignOrigin(props.brief)} {...props} />;
}
function Workspace({ brief, answers, brand, onAnswersChange }: Props) {
  const origin = campaignOrigin(brief);
  const [draft, setDraft] = useState<WorkspaceDraft>({ origin, answers, importKey: JSON.stringify(brief.answers), description: "", clarifications: [], clarificationSimulated: false, jobs: [] });
  const current = useRef(draft);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState("Se încarcă draftul…");
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [clarificationIndex, setClarificationIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [renderStarts, setRenderStarts] = useState<Record<string, number>>({});
  const lock = useRef(false);
  const collection = useRef<ReturnType<typeof workspaceCollection> | null>(null);
  const rowId = useRef<string | null>(null);
  const saves = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const change = (next: WorkspaceDraft) => { current.current = next; setDraft(next); setSaveState("Modificări de păstrat"); };

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      try {
        collection.current = workspaceCollection(origin, window.localStorage);
        const rows = await collection.current.list();
        if (!mounted.current) return;
        const row = rows[0];
        if (row) {
          rowId.current = row.id;
          const next = restoreWorkspaceDraft(row.data, brief, answers);
          current.current = next; setDraft(next);
          const unanswered = next.clarifications.findIndex((item) => !item.answer.trim());
          setClarificationIndex(unanswered < 0 ? next.clarifications.length : unanswered);
          onAnswersChange?.({ ...answers, ...next.answers });
        }
        setSaveState(row ? "Draft restaurat" : "Draft nou");
      } catch (err) { if (mounted.current) setStorageError(`Draftul nu poate fi citit: ${message(err)}`); }
      finally { if (mounted.current) setLoaded(true); }
    })();
    return () => { mounted.current = false; };
    // Originea definește spațiul de lucru; actualizările brief-ului nu șterg alegerile omului.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const save = (next: WorkspaceDraft): Promise<void> => {
    const work = saves.current.catch(() => {}).then(async () => {
      collection.current = workspaceCollection(origin, window.localStorage);
      if (!rowId.current) rowId.current = (await collection.current.list())[0]?.id || null;
      if (rowId.current) await collection.current.update(rowId.current, next);
      else rowId.current = (await collection.current.add(next)).id;
      if (mounted.current && current.current === next) { setSaveState("Păstrat în acest browser"); setStorageError(null); }
    });
    saves.current = work;
    return work.catch((err) => { if (mounted.current) { setStorageError(`Campania nu a fost păstrată: ${message(err)}`); setSaveState("Nepăstrat"); } throw err; });
  };
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => { void save(draft).catch(() => {}); }, 450);
    return () => window.clearTimeout(timer);
    // Salvarea folosește snapshotul exact al draftului, în ordine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, loaded]);

  const parentAnswers = JSON.stringify(answers);
  useEffect(() => {
    if (!loaded || JSON.stringify(current.current.answers) === parentAnswers) return;
    change({ ...current.current, answers });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentAnswers]);

  async function run(kind: AssetKind, retry?: CampaignJob) {
    if (lock.current || !loaded) return;
    lock.current = true; setBusy(true); setError(null);
    let job: CampaignJob | undefined;
    try {
      const context = retry?.context || contextSnapshot(brief, current.current.answers, brand, current.current.description, current.current.clarifications);
      const jobs = retry
        ? current.current.jobs.map((item) => item.id === retry.id ? { ...item, status: "queued" as const, error: undefined, result: undefined } : item)
        : enqueueAsset(current.current.jobs, kind, context);
      job = retry ? jobs.find((item) => item.id === retry.id)! : jobs[jobs.length - 1];
      let next = { ...current.current, jobs };
      change(next); await save(next);
      const updateJob = (patch: Partial<CampaignJob>) => {
        next = { ...current.current, jobs: current.current.jobs.map((item) => item.id === job!.id ? { ...item, ...patch } : item) };
        change(next); return save(next);
      };
      if (!imageCampaignTransport.supports(kind, context)) {
        await updateJob({ status: "unavailable", error: "Nu există încă un video de demo pentru acest site." });
        return;
      }
      await updateJob({ status: "generating" });
      const startedAt = Date.now();
      if (kind === "video") setRenderStarts((all) => ({ ...all, [job!.id]: startedAt }));
      const result = validateAssetResult(await imageCampaignTransport.generate(kind, context, { screenshot: brief.critique?.screenshot, brand }), kind);
      // videoclipul apare după randare, nu dintr-odată
      if (kind === "video") await new Promise((done) => window.setTimeout(done, Math.max(0, videoRenderMs() - (Date.now() - startedAt))));
      if (mounted.current) await updateJob({ status: "ready", result, error: undefined });
    } catch (err) {
      if (mounted.current) {
        setError(message(err));
        if (job) {
          const next = { ...current.current, jobs: current.current.jobs.map((item) => item.id === job!.id ? { ...item, status: "error" as const, error: message(err).slice(0, 500) } : item) };
          change(next); await save(next).catch(() => {});
        }
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function clarify() {
    if (asking || lock.current) return;
    setAsking(true); setError(null);
    try {
      const context = contextSnapshot(brief, current.current.answers, brand, current.current.description, current.current.clarifications);
      const result = await askCampaignClarifications(context);
      if (!mounted.current) return;
      const previous = current.current.clarifications;
      const answered = previous.filter((item) => item.answer.trim());
      const items = [...answered, ...result.items.filter((item) => !answered.some((p) => p.question === item.question)).map((item) => ({ ...item, answer: previous.find((p) => p.question === item.question)?.answer || "" }))].slice(0, 3);
      const next = { ...current.current, clarifications: items, clarificationSimulated: result.simulated };
      const unanswered = items.findIndex((item) => !item.answer.trim());
      setClarificationIndex(unanswered < 0 ? items.length : unanswered);
      change(next); await save(next);
    } catch (err) { if (mounted.current) setError(message(err)); }
    finally { if (mounted.current) setAsking(false); }
  }
  const ready = loaded && !!draft.description.trim();
  const pendingClarification = draft.clarifications[clarificationIndex];
  const generationReady = ready && !pendingClarification;
  const search = brief.critique?.searchOptimization;
  const items = brief.critique?.items ?? [];
  const shownItems = showAll ? items : items.slice(0, 3);
  const disabled = !loaded || busy || asking;
  return <div className="space-y-9 text-sm" data-testid="campaign-workspace">
    <PanelSection id="observatii" title="Ce aș modifica" hint={brief.critique?.mode === "mock" ? "Analiză simulată" : brief.critique?.mode === "fallback" ? "Observații din verificări automate" : undefined}>
      <div className="card px-4 py-1">
        {items.length ? <ol className="divide-y divide-line">{shownItems.map((item) => <li key={item.id} className="py-3.5">
          <h3 className="font-semibold leading-snug text-ink">{item.title}</h3>
          <p className="mt-1 leading-relaxed text-ink-2">{item.proposal}</p>
        </li>)}</ol> : <p className="py-3.5 text-muted">Nu au fost transferate observații. Descrie mai jos materialul dorit.</p>}
        {items.length > 3 && <button type="button" className="mb-2 -mx-1 rounded-md px-1 py-1 text-[0.85rem] font-medium text-ink-2 underline underline-offset-4 hover:text-ink" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Arată mai puține" : `Arată încă ${items.length - 3}`}
        </button>}
      </div>
      {!!search?.length && <div className="card px-4 py-1">
        <h3 className="pt-3.5 font-semibold text-ink">Vizibilitate în căutările cu AI</h3>
        <ol className="divide-y divide-line">{search.map((item, index) => <li key={index} className="py-3.5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium leading-snug text-ink">{item.title}</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.8rem] text-muted"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${item.status === "needs-check" ? "bg-warn-dot" : "bg-ok"}`} />{item.status === "needs-check" ? "De verificat" : "Observat în pagină"}</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-ink-2">{item.proposal}</p>
        </li>)}</ol>
      </div>}
    </PanelSection>

    <PanelSection id="brief" title="Brief-ul campaniei">
      <div className="card space-y-3 p-4">
        {fields.map(({ id, label }) => <label key={id} className="block text-[0.8rem] font-medium text-muted">{label}<input className="input mt-1 w-full rounded-lg px-3 py-2 text-sm font-normal text-ink" value={draft.answers[id] || ""} disabled={disabled} maxLength={500} onChange={(event) => { const next = { ...current.current.answers, [id]: event.target.value }; change({ ...current.current, answers: next }); onAnswersChange?.(next); }} /></label>)}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted" role="status"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${saveState === "Păstrat în acest browser" || saveState === "Draft restaurat" ? "bg-ok" : saveState === "Nepăstrat" ? "bg-bad" : "bg-line"}`} />{saveState}</p>
          <Button variant="ghost" className="!px-2.5 !py-1 !text-[0.8rem]" disabled={disabled} onClick={() => void save(current.current).catch(() => {})}>Păstrează brief-ul</Button>
        </div>
        <ErrorNote error={storageError} />
      </div>
    </PanelSection>

    <PanelSection id="materiale" title="Materialele campaniei">
      <div className="card p-4">
        <label className="block font-medium text-ink" htmlFor="campaign-description">Ce vrei să creăm?</label>
        <textarea id="campaign-description" className="input mt-2 min-h-24 w-full resize-y rounded-lg px-3 py-2 font-normal" placeholder="Descrie materialul, mesajul și unde vrei să îl folosești." value={draft.description} maxLength={2000} disabled={disabled} onChange={(event) => change({ ...current.current, description: event.target.value })} />
        {!draft.clarifications.length && <div className="mt-2 flex justify-end"><Button variant="ghost" className="!px-2.5 !py-1 !text-[0.8rem]" disabled={!ready || asking || busy || !!pendingClarification} onClick={() => void clarify()}>{asking && <Spinner />}{asking ? "Pregătesc întrebările…" : "Mai clarificăm"}</Button></div>}
        {!!draft.clarifications.length && <div className="mt-4 space-y-3 rounded-xl bg-paper p-3">
          {draft.clarificationSimulated && <p className="text-xs text-muted">Întrebări simulate din contextul brief-ului</p>}
          {draft.clarifications.slice(0, clarificationIndex).map((item, index) => <p key={`${index}:${item.question}`} className="text-[0.85rem] text-ink-2"><span className="text-muted">{item.question}</span> {item.answer}</p>)}
          {pendingClarification ? <div className="space-y-2">
            <p className="text-xs text-muted tabular-nums">Întrebarea {clarificationIndex + 1} din {draft.clarifications.length}</p>
            <label className="block font-medium text-ink">{pendingClarification.question}<textarea key={clarificationIndex} data-testid="clarification-answer" className="input mt-1.5 w-full rounded-lg px-3 py-2 font-normal" rows={2} maxLength={500} disabled={busy || asking} value={pendingClarification.answer} onChange={(event) => change({ ...current.current, clarifications: current.current.clarifications.map((item, index) => index === clarificationIndex ? { ...item, answer: event.target.value } : item) })} /></label>
            <div className="flex justify-end"><Button variant="primary" className="!px-3 !py-1.5 text-xs" disabled={!pendingClarification.answer.trim() || busy || asking} onClick={() => setClarificationIndex((index) => index + 1)}>Răspunde</Button></div>
          </div> : <div className="flex justify-end"><Button variant="ghost" className="!px-2.5 !py-1 !text-[0.8rem]" disabled={busy || asking} onClick={() => setClarificationIndex(0)}>Modifică răspunsurile</Button></div>}
        </div>}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
          <Button variant={generationReady ? "primary" : "secondary"} className="col-span-2" disabled={!generationReady || busy || asking} onClick={() => void run("video")}>Pregătește video</Button>
          <Button disabled={!generationReady || busy || asking} onClick={() => void run("image")}>Generează imagine</Button>
          <Button disabled={!generationReady || busy || asking} onClick={() => void run("logo")}>Propune logo</Button>
        </div>
        {(!ready || pendingClarification) && <p className="mt-3 text-xs leading-relaxed text-muted">{!ready ? "Scrie întâi ce vrei să creăm." : "Răspunde la întrebare, apoi pregătesc materialele."}</p>}
        <div className="mt-3 empty:hidden"><ErrorNote error={error} /></div>
      </div>
      {!!draft.jobs.length && <ol className="space-y-3">{draft.jobs.map((job) => <li key={job.id} className="card panel-job p-4">
        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-ink">{KIND[job.kind]}</h3><span className="inline-flex items-center gap-2 text-[0.8rem] text-muted"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${job.status === "ready" ? "bg-ok" : job.status === "error" ? "bg-bad" : job.status === "unavailable" ? "bg-warn-dot" : "animate-pulse bg-ink-2"}`} />{job.kind === "video" && job.status === "generating" ? "Se generează" : STATUS[job.status]}</span></div>
        <p className="mt-1 line-clamp-2 break-words text-[0.85rem] text-muted">{job.context.description}</p>
        {job.kind === "video" && job.status === "generating" && renderStarts[job.id] ? <VideoRender startedAt={renderStarts[job.id]} />
          : (job.status === "generating" || job.status === "queued") && <p className="mt-3 flex items-center gap-2 text-muted"><Spinner />Pregătim materialul din brief-ul confirmat…</p>}
        {job.error && <p className="mt-3 text-bad" role="alert">{job.error}</p>}
        {job.result && job.status === "ready" && <div className="mt-3">
          {job.kind !== "video" && <p className="mb-2 text-xs font-medium text-muted">{job.result.simulated ? "Rezultat simulat · fără generare de imagine" : "Imagine generată · propunere de verificat"}</p>}
          {job.kind === "video" ? <VideoResult url={job.result.url} onError={() => setError("Videoclipul nu se poate reda. Reîncearcă sau verifică conexiunea.")} /> : <img className="max-h-80 w-full rounded-xl bg-paper object-contain" src={job.result.url} alt={`${KIND[job.kind]} pentru ${job.context.brand.name}${job.result.simulated ? " — simulare" : ""}`} />}
        </div>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {job.result && job.status === "ready" && <a className="btn btn-secondary !px-3 !py-1.5 text-xs" href={job.result.url} download={`${job.kind}-${job.id}`} target="_blank" rel="noreferrer">Descarcă {job.kind === "video" ? "videoclipul" : "propunerea"}</a>}
          {(job.status === "error" || job.status === "unavailable") && <Button className="!px-3 !py-1.5 text-xs" disabled={busy || asking} onClick={() => void run(job.kind, job)}>Reîncearcă</Button>}
          <Button variant="ghost" className="ml-auto !px-2.5 !py-1.5 text-xs" disabled={busy || asking} onClick={() => { const next = { ...current.current, jobs: current.current.jobs.filter((item) => item.id !== job.id) }; change(next); void save(next).catch(() => {}); }}>Elimină {KIND[job.kind].toLowerCase()}</Button>
        </div>
      </li>)}</ol>}
    </PanelSection>
  </div>;
}
