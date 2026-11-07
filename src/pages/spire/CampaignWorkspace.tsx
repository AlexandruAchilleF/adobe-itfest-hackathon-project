import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNote, Spinner } from "../../components/ui";
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
      const result = validateAssetResult(await imageCampaignTransport.generate(kind, context, { screenshot: brief.critique?.screenshot, brand }), kind);
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
  return <div className="space-y-6 text-sm" data-testid="campaign-workspace">
    <Card title="Ce aș modifica">
      <p className="mb-4 break-words text-muted">{brief.source.title || origin}</p>
      {brief.critique?.mode === "mock" && <p className="mb-3 text-muted">Analiză simulată</p>}
      {brief.critique?.mode === "fallback" && <p className="mb-3 text-muted">Observații din verificări automate</p>}
      {brief.critique?.items.length ? <ol className="divide-y divide-line">{brief.critique.items.map((item) => <li key={item.id} className="py-3 first:pt-0 last:pb-0">
        <h3 className="font-semibold text-ink">{item.title}</h3><p className="mt-1 text-muted">{item.observation}</p><p className="mt-2 leading-relaxed text-ink-2">{item.proposal}</p>
      </li>)}</ol> : <p className="text-muted">Nu au fost transferate observații. Descrie mai jos materialul dorit.</p>}
    </Card>
    {!!search?.length && <Card title="Vizibilitate în căutările cu AI"><ol className="divide-y divide-line">{search.map((item, index) => <li key={index} className="py-3 first:pt-0 last:pb-0"><h3 className="font-semibold text-ink">{item.title}</h3><p className="mt-1 text-muted">Căutare: „{item.query}”</p><p className="mt-2 text-ink-2">{item.proposal}</p><p className="mt-2 text-muted">{item.status === "needs-check" ? "De verificat" : "Observat în pagină"}{item.evidence ? ` · ${item.evidence}` : ""}</p></li>)}</ol></Card>}
    <Card title="Brief-ul campaniei">
      <div className="grid gap-3 sm:grid-cols-2">{fields.map(({ id, label }) => <label key={id} className="block text-ink-2">{label}<input className="input mt-1 w-full" value={draft.answers[id] || ""} disabled={!loaded || busy || asking} maxLength={500} onChange={(event) => { const next = { ...current.current.answers, [id]: event.target.value }; change({ ...current.current, answers: next }); onAnswersChange?.(next); }} /></label>)}</div>
      <label className="mt-4 block font-medium text-ink" htmlFor="campaign-description">Ce vrei să creăm?</label>
      <textarea id="campaign-description" className="input mt-2 min-h-28 w-full resize-y font-normal" placeholder="Descrie materialul, mesajul și unde vrei să îl folosești." value={draft.description} maxLength={2000} disabled={!loaded || busy || asking} onChange={(event) => change({ ...current.current, description: event.target.value })} />
      <div className="mt-3 flex flex-wrap items-center gap-3"><Button disabled={!ready || asking || busy || !!pendingClarification} onClick={() => void clarify()}>{asking && <Spinner />}{asking ? "Pregătesc întrebările…" : "Mai clarificăm"}</Button><Button variant="ghost" disabled={!loaded || busy || asking} onClick={() => void save(current.current).catch(() => {})}>Păstrează brief-ul</Button></div>
      {!!draft.clarifications.length && <div className="mt-5 space-y-3">
        {draft.clarificationSimulated && <p className="text-muted">Întrebări simulate din contextul brief-ului</p>}
        {draft.clarifications.slice(0, clarificationIndex).map((item, index) => <p key={`${index}:${item.question}`} className="text-ink-2"><strong>{item.question}</strong> {item.answer}</p>)}
        {pendingClarification ? <div>
          <p className="mb-2 text-muted">Întrebarea {clarificationIndex + 1} din {draft.clarifications.length}</p>
          <label className="block text-ink-2">{pendingClarification.question}<textarea key={clarificationIndex} data-testid="clarification-answer" className="input mt-1 w-full" rows={2} maxLength={500} disabled={busy || asking} value={pendingClarification.answer} onChange={(event) => change({ ...current.current, clarifications: current.current.clarifications.map((item, index) => index === clarificationIndex ? { ...item, answer: event.target.value } : item) })} /></label>
          <Button disabled={!pendingClarification.answer.trim() || busy || asking} onClick={() => setClarificationIndex((index) => index + 1)}>Răspunde</Button>
        </div> : <Button variant="ghost" disabled={busy || asking} onClick={() => setClarificationIndex(0)}>Modifică răspunsurile</Button>}
      </div>}
      <p className="mt-3 text-xs text-muted" role="status">{saveState}</p>
      <div className="mt-4"><ErrorNote error={storageError} /><ErrorNote error={error} /></div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5"><Button variant="primary" disabled={!generationReady || busy || asking} onClick={() => void run("video")}>Pregătește video</Button><Button disabled={!generationReady || busy || asking} onClick={() => void run("image")}>Generează imagine</Button><Button disabled={!generationReady || busy || asking} onClick={() => void run("logo")}>Propune logo</Button></div>
      <p className="mt-3 text-xs leading-relaxed text-muted">Video-ul folosește un clip de demo pregătit pentru site. Imaginile și logo-ul sunt propuneri pe baza brief-ului tău.</p>
    </Card>
    <Card title="Materialele campaniei">
      {!draft.jobs.length ? <p className="text-muted">Materialele cerute și rezultatele lor vor apărea aici.</p> : <ol className="divide-y divide-line">{draft.jobs.map((job) => <li key={job.id} className="py-4 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-ink">{KIND[job.kind]}</h3><span className="inline-flex items-center gap-2 text-muted"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${job.status === "ready" ? "bg-ok" : job.status === "error" ? "bg-bad" : "bg-muted"}`} />{STATUS[job.status]}</span></div>
        <p className="mt-2 break-words text-ink-2">{job.context.description}</p>
        {(job.status === "generating" || job.status === "queued") && <p className="mt-3 flex items-center gap-2 text-muted"><Spinner />Pregătim materialul din brief-ul confirmat…</p>}
        {job.error && <p className="mt-3 text-bad" role="alert">{job.error}</p>}
        {job.result && job.status === "ready" && <div className="mt-3">
          <p className="mb-2 font-medium text-ink-2">{job.result.prerecorded ? "Video de demo · clip pregătit anterior" : job.result.simulated ? "Rezultat simulat · fără generare de imagine" : "Imagine generată · propunere de verificat"}</p>
          {job.kind === "video" ? <video controls preload="metadata" className="max-h-80 w-full rounded-xl bg-paper" src={job.result.url} onError={() => setError("Clipul de demo nu se poate reda. Reîncearcă sau verifică conexiunea.")} /> : <img className="max-h-80 w-full rounded-xl object-contain" src={job.result.url} alt={`${KIND[job.kind]} pentru ${job.context.brand.name}${job.result.simulated ? " — simulare" : ""}`} />}
          <a className="mt-3 inline-block font-medium text-ink underline underline-offset-4" href={job.result.url} download={`${job.kind}-${job.id}`} target="_blank" rel="noreferrer">Descarcă {job.kind === "video" ? "video-ul de demo" : "propunerea"}</a>
        </div>}
        <div className="mt-3 flex flex-wrap gap-2">{(job.status === "error" || job.status === "unavailable") && <Button disabled={busy || asking} onClick={() => void run(job.kind, job)}>Reîncearcă</Button>}<Button variant="ghost" disabled={busy || asking} onClick={() => { const next = { ...current.current, jobs: current.current.jobs.filter((item) => item.id !== job.id) }; change(next); void save(next).catch(() => {}); }}>Elimină {KIND[job.kind].toLowerCase()}</Button></div>
      </li>)}</ol>}
    </Card>
  </div>;
}
