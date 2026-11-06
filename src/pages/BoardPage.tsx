// Pagina principală a scenariului: cererile pe hartă și ciclul lor, din perspectiva rolului curent.
//  - cine cere (flow.requester) scrie cererea cum ar spune-o → AI-ul o structurează → omul verifică → salvează
//  - cine ajută spune ce poate oferi → scor determinist (urgență + distanță) + explicație AI
//  - fiecare pas din flux e un buton al omului care are voie să-l facă (src/lib/flow.ts)
// Tot textul de domeniu vine din src/scenario/config.ts.

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { QrPanel } from "../components/QrPanel";
import { ArrowButton, Button, Card, ErrorNote, MicIcon, PageHeader, Pill } from "../components/ui";
import { defineAction } from "../lib/agent";
import { AiError, ask } from "../lib/ai";
import { checkDocument, Doc } from "../lib/checks";
import { giverStats } from "../lib/gamification";
import { formatDuration, segments } from "../lib/metrics";
import { useMe } from "../lib/identity";
import { type Actor, available, createRequest, isExpired, type Request, stateOf, toneOf, waitingOn } from "../lib/flow";
import { ageLabel, ageMinutes, freshness, visibleReports } from "../lib/reports";
import { type Rec, useCollection } from "../lib/store";
import { distanceKm, geocode, type LatLng } from "../modules/map/geo";
import { MapView } from "../modules/map/MapView";
import { mascot } from "../modules/mascot/mascot";
import { useMascotPage } from "../modules/mascot/page";
import { useSpeechRecognition } from "../modules/voice/speech";
import { scenario } from "../scenario/config";
import { mockStructure } from "../scenario/mock";
import { pitchMode } from "../scenario/nav";
import { baselineScore, categoryOf, outbox, reports, reportTypeOf, requests, roleOf } from "../scenario/model";
import { useSteps } from "../scenario/useSteps";
import { ChecksList, DocTable, DocumentIntake } from "../scenario/ui/DocumentIntake";
import { StatusDot, StatusPill, Timeline, timeOf } from "../scenario/ui/parts";

const S = scenario;
const CAT_IDS = S.categories.map((c) => c.id) as [string, ...string[]];

const Structured = z.object({
  title: z.string().describe("titlu scurt, max 6 cuvinte"),
  category: z.enum(CAT_IDS),
  description: z.string(),
  quantity: z.number().describe("cât, ca număr; 1 dacă nu se spune"),
  unit: z.string().describe("unitatea: sticle, porții, drumuri…"),
  urgency: z.number().describe("propunere 1-5; omul o verifică"),
  address: z.string().describe("adresa sau zona, cât mai precis, cu orașul"),
});
type Draft = z.infer<typeof Structured> & { lat: number; lng: number };

const Match = z.object({
  matches: z.array(z.object({ id: z.string(), score: z.number().describe("0-100"), why: z.string().describe("o propoziție concretă") })),
});

export function BoardPage() {
  const { items, add, error: dbError, reset } = useCollection(requests);
  const steps = useSteps();
  const sent = useCollection(outbox);
  const { me, nameOf } = useMe();
  const live = useCollection(reports);
  const [showReports, setShowReports] = useState(S.reports.enabled);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000); // rapoartele se estompează cu vechimea
    return () => clearInterval(t);
  }, []);
  // rapoartele care au devenit cereri (reports.toRequest) apar pe hartă ca cereri, nu de două ori
  const recentReports = S.reports.enabled ? visibleReports(live.items, S.reports).filter((r) => !r.data.requestId) : [];
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("toate");
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);
  const [busy, setBusy] = useState<"structure" | "match" | "step" | null>(null);

  // cererea nouă, scrisă cum ar spune-o omul
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const speech = useSpeechRecognition({ onFinal: (t) => setRaw((r) => `${r} ${t}`.trim()) });

  // potrivirea pentru cine dă
  const [offer, setOffer] = useState(S.request.offerPlaceholder);
  const [origin, setOrigin] = useState<(LatLng & { label: string }) | null>(null);
  const [matches, setMatches] = useState<Array<{ id: string; score: number; why: string }>>([]);

  const [notice, setNotice] = useState<string | null>(null);
  const all = items.map((r) => r.data);
  const actor: Actor | null = me ? { handle: me.handle, role: me.role, suspended: S.features.gamification && me.role === S.points.role && giverStats(me.handle, all, S).suspended } : null;
  const mine = (r: Request) => r.requester === me?.handle || Object.values(r.actors).includes(me?.handle ?? "");
  const [note, setNote] = useState("");
  const visible = items.filter((r) => (filter === "toate" ? true : filter === "ale mele" ? mine(r.data) : r.data.category === filter));
  const reportPoints = (showReports ? recentReports : []).map((r) => ({
    id: `raport:${r.id}`,
    lat: r.data.lat,
    lng: r.data.lng,
    label: `${reportTypeOf(r.data.type).label}${r.data.note ? `: ${r.data.note}` : ""} · ${ageLabel(ageMinutes(r.data))}`,
    color: reportTypeOf(r.data.type).color,
    opacity: freshness(r.data, S.reports),
    kind: "report" as const,
  }));
  const requestPoints = useMemo(
    () =>
      visible.map((r) => ({
        id: r.id,
        lat: r.data.lat,
        lng: r.data.lng,
        label: `${r.data.title} · ${r.data.status}`,
        color: toneOf(S.flow, r.data) === "done" ? "#475569" : categoryOf(r.data.category).color,
        weight: r.data.urgency,
      })),
    [visible],
  );
  const points = [...requestPoints, ...reportPoints];
  const sel = items.find((r) => r.id === selected) ?? null;

  // mascota spune când cererea deschisă stă de mult la cineva (stare reală, calculată din istoric)
  useEffect(() => {
    if (!sel) return;
    const cur = segments(S.flow, sel.data).find((x) => x.current);
    if (cur && cur.minutes >= 24 * 60) {
      const roles = cur.waitingOn.map((r) => roleOf(r).label.toLowerCase()).join(" sau ");
      // „stă la Irina” doar dacă e cineva anume; altfel nu a preluat-o încă nimeni din rolul ăla
      const msg = cur.who ? `„${sel.data.title}” stă la ${nameOf(cur.who)} de ${formatDuration(cur.minutes)}.` : `„${sel.data.title}” așteaptă de ${formatDuration(cur.minutes)} și n-a preluat-o încă nimeni (${roles}).`;
      mascot.say(`${msg} Vezi „Unde se blochează”.`, "worried");
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  // documentele atașate cererilor (bonuri, facturi), pentru verificarea de duplicate
  const docOf = (r: Rec<Request>) => {
    const parsed = Doc.safeParse(r.data.extra?.doc);
    return parsed.success ? parsed.data : null;
  };
  const docs = items.flatMap((r) => (docOf(r) ? [{ id: r.id, doc: docOf(r)! }] : []));
  const selDoc = sel ? docOf(sel) : null;

  async function submitDocument(doc: Doc, category: string) {
    if (!me) return;
    const rec = await add(
      createRequest(
        S.flow,
        { title: `${doc.vendor}: ${doc.lines[0]?.label ?? doc.kind}`, category, description: doc.lines.map((l) => l.label).join(", "), quantity: doc.total, unit: doc.currency, urgency: 3, address: "", lat: S.app.center.lat, lng: S.app.center.lng, extra: { doc } },
        me.handle,
      ),
    );
    setSelected(rec.id);
    setNotice(`Trimis: ${doc.total.toFixed(2)} ${doc.currency}. Toate verificările obligatorii au trecut.`);
  }
  const fail = (err: unknown) => setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });

  async function step(rec: Rec<Request>, event: string) {
    if (!actor) return;
    setBusy("step");
    setError(null);
    try {
      const { notice: n } = await steps.step(rec, event, actor, note);
      setNote("");
      setSelected(rec.id);
      setNotice(n);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function structure(text: string = raw) {
    setBusy("structure");
    setError(null);
    try {
      const { data } = await ask({
        system: `Transformi un mesaj scris în grabă într-o cerere structurată. ${S.request.aiContext} Nu inventa date care nu apar în mesaj. Urgența e doar o propunere.`,
        prompt: text,
        schema: Structured,
        mock: mockStructure(text, S),
      });
      const geo = await geocode(data.address);
      setDraft({ ...data, urgency: Math.min(5, Math.max(1, Math.round(data.urgency))), quantity: Math.max(1, Math.round(data.quantity)), lat: geo?.lat ?? S.app.center.lat, lng: geo?.lng ?? S.app.center.lng });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft || !me) return;
    const rec = await add(createRequest(S.flow, draft, me.handle));
    setDraft(null);
    setRaw("");
    setSelected(rec.id);
    mascot.say(`Am pus „${draft.title}” pe hartă. Te anunț când se ocupă cineva.`, "happy");
  }

  async function match(text: string = offer) {
    setOffer(text);
    setBusy("match");
    setError(null);
    try {
      const where = text.match(/(?:zona|cartierul|în|la|din)\s+([A-ZĂÂÎȘȚ][\p{L}\s-]+)/u)?.[1];
      const geo = await geocode(`${where ?? text}, București`);
      setOrigin(geo);
      const ranked = items
        .filter((r) => toneOf(S.flow, r.data) === "open" && !isExpired(S.flow, r.data))
        .map((r) => ({ r, base: baselineScore(S, r.data, geo), km: geo ? distanceKm(geo, r.data) : null }))
        .sort((a, b) => b.base - a.base);
      const list = ranked.map(({ r, base, km }) => `id=${r.id} | ${r.data.title} | ${categoryOf(r.data.category).label} | ${r.data.quantity} ${r.data.unit} | urgență ${r.data.urgency} | ${km ?? "?"} km | scor de bază ${base}`).join("\n");
      const { data } = await ask({
        system: `Potrivești ce poate oferi cineva cu ${S.request.plural} reale. Pornești de la scorul de bază (urgență + distanță, calculat de cod) și îl ajustezi cu cel mult 10 puncte doar dacă oferta se potrivește clar mai bine sau mai rău. Alegi top 3.`,
        prompt: `Oferta: ${text}\n\n${S.request.plural} deschise:\n${list}`,
        schema: Match,
        mock: { matches: ranked.slice(0, 3).map(({ r, base, km }) => ({ id: r.id, score: base, why: `(demo) Urgență ${r.data.urgency}/5${km !== null ? `, la ${km} km` : ""}.` })) },
      });
      // AI-ul nu poate muta scorul cu mai mult de 10 puncte față de cod și nu poate inventa cereri
      const base = new Map(ranked.map(({ r, base: b }) => [r.id, b]));
      const found = data.matches
        .filter((m) => base.has(m.id))
        .map((m) => ({ ...m, score: Math.max(0, Math.min(100, Math.round(Math.min(Math.max(m.score, base.get(m.id)! - 10), base.get(m.id)! + 10)))) }))
        .slice(0, 3);
      setMatches(found);
      mascot.say(found.length ? `Am găsit ${found.length} potriviri. Prima e la ${found[0].score}/100.` : `N-am găsit nicio ${S.request.singular} deschisă.`, found.length ? "happy" : "worried");
      if (found[0]) setSelected(found[0].id);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  // pentru modul demo: cererea la care se referă fraza („aprobă decontul lui Andrei”), preferând-o pe cea
  // la care pasul chiar se poate face acum de omul curent
  const byTitle = (input: string, event?: string) => {
    const w = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const words = (x: string) => norm(x).split(/[\s,]+/).filter((t) => t.length > 3);
    const pool = event && actor ? items.filter((r) => available(S.flow, r.data, actor).some((t) => t.id === event)) : items;
    const hit = (r: Rec<Request>) => [...words(r.data.title), ...words(nameOf(r.data.requester))].some((t) => w.includes(t));
    return pool.find(hit) ?? items.find(hit) ?? pool[0] ?? sel ?? items[0];
  };
  const EVENT_IDS = S.flow.transitions.map((t) => t.id) as [string, ...string[]];

  useMascotPage({
    title: S.request.plural,
    context: () => [`Eu sunt ${me?.name ?? "?"} (${me ? S.roles[me.role].label : "?"}).`, ...items.map((r) => `id=${r.id} | ${r.data.title} | ${r.data.status} | urgență ${r.data.urgency}`)].join("\n"),
    actions: [
      defineAction({
        name: "filter_requests",
        kind: "read",
        description: `Arată pe hartă doar ${S.request.plural} dintr-o categorie sau doar ale mele`,
        args: z.object({ filter: z.enum(["toate", "ale mele", ...CAT_IDS]) }),
        run: ({ filter: f }) => setFilter(f),
        examples: ["arată doar ale mele", `arată doar ${S.categories[0].label}`],
        mockArgs: (input: string) => ({ filter: input.includes("mele") ? "ale mele" : (S.categories.find((c) => input.toLowerCase().includes(c.label))?.id ?? "toate") }),
      }),
      defineAction({
        name: "request_step",
        kind: "write",
        description: `Face un pas în flux (${S.request.singular}): ${S.flow.transitions.map((t) => `${t.id} (${t.label})`).join(", ")}`,
        describe: ({ id, event }) => {
          const r = items.find((x) => x.id === id);
          return `${S.flow.transitions.find((t) => t.id === event)?.label ?? event}: „${r?.data.title ?? id}”${r ? ` (${r.data.quantity} ${r.data.unit}, ${nameOf(r.data.requester)})` : ""}`;
        },
        args: z.object({ id: z.string().describe("id-ul din context"), event: z.enum(EVENT_IDS) }),
        run: async ({ id, event }) => {
          const rec = items.find((r) => r.id === id);
          if (!rec) throw new Error(`nu există ${S.request.singular} cu id-ul ăsta`);
          await step(rec, event);
        },
        examples: S.flow.transitions.slice(0, 4).map((t) => `${t.label.toLowerCase()} ${S.seed.requests[0]?.title.toLowerCase() ?? ""}`.trim()),
        mockArgs: (input: string) => {
          const t = input.toLowerCase();
          // pasul al cărui text apare cel mai bine în cerere („nu am primit” bate „am primit”)
          const event = [...S.flow.transitions].sort((a, b) => b.label.length - a.label.length).find((x) => t.includes(x.label.toLowerCase()))?.id ?? S.flow.transitions[0].id;
          return { id: byTitle(input, event)?.id ?? "", event };
        },
      }),
      ...(S.features.matching
        ? [
            defineAction({
              name: "find_matches",
              kind: "read",
              description: `Găsește ${S.request.plural} potrivite pentru ce poate oferi cineva`,
              args: z.object({ offer: z.string().describe("ce poate oferi și unde") }),
              run: ({ offer: o }) => match(o),
              examples: [S.request.offerPlaceholder.toLowerCase()],
              mockArgs: (input: string) => ({ offer: input }),
            }),
          ]
        : []),
    ],
    tour: S.mascot.tour
      ? [
          { target: "board-map", text: `Fiecare punct e o ${S.request.singular} reală. Culoarea e categoria, mărimea e urgența.` },
          { target: "board-detail", text: "Fiecare pas îl face doar omul care are voie. Cererea se încheie abia când confirmă cel care a cerut." },
          { target: "board-side", text: "Cererile se scriu cum le-ar spune omul. AI-ul le structurează, omul le verifică înainte de salvare." },
        ]
      : undefined,
  });

  const filters = ["toate", "ale mele", ...CAT_IDS];
  return (
    <div>
      <PageHeader eyebrow={me ? `Ești ${roleOf(me.role).label.toLowerCase()}` : undefined} title={`${S.request.plural[0].toUpperCase()}${S.request.plural.slice(1)} *${S.features.map ? "pe hartă" : "în lucru"}*`} description={S.app.tagline}>
        <div className="flex gap-2">
          <Pill ok={null}>
            {items.length} {S.request.plural}
          </Pill>
          {!pitchMode(S) && (
            <Button variant="ghost" onClick={() => void Promise.all([reset(), live.reset(), sent.reset()])}>
              Resetează datele demo
            </Button>
          )}
        </div>
      </PageHeader>
      <ErrorNote error={dbError} />
      {notice && (
        <p role="status" className="mb-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent" data-testid="notice">
          {notice}
        </p>
      )}
      {actor?.suspended && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          Contul tău e suspendat după prea multe „nu am primit”. Nu mai poți accepta {S.request.plural} noi.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-1">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-[0.8rem] ring-1 transition ${filter === f ? "bg-ink text-white ring-ink" : "bg-card text-ink-2 ring-line hover:ring-coral/40"}`}>
                {f === "toate" || f === "ale mele" ? f : (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: categoryOf(f).color }} aria-hidden />
                    {categoryOf(f).label}
                  </span>
                )}
              </button>
            ))}
            {S.reports.enabled && !S.reports.toRequest && (
              <button onClick={() => setShowReports((v) => !v)} className={`ml-auto rounded-full px-3 py-1.5 text-[0.8rem] ring-1 ${showReports ? "bg-lilac text-lilac-ink ring-[#d6d0f6]" : "bg-card text-ink-2 ring-line"}`} aria-pressed={showReports}>
                rapoarte live ({recentReports.length})
              </button>
            )}
          </div>
          {S.features.map && (
            <div data-tour="board-map">
              <MapView points={points} selectedId={selected} onSelect={(id) => !id.startsWith("raport:") && setSelected(id)} origin={origin} />
            </div>
          )}
          {sel && (
            <Card
              tour="board-detail"
              title={
                <span>
                  {sel.data.title}
                </span>
              }
              actions={<StatusPill status={sel.data.status} />}
            >
              <p className="text-sm text-slate-300">{sel.data.description}</p>
              <p className="mt-2 text-sm">
                <b>
                  {sel.data.quantity} {sel.data.unit}
                </b>{" "}
                {sel.data.address ? ` · ${sel.data.address}` : ""} · urgență {sel.data.urgency}/5
              </p>
              <p className="mt-1 text-sm text-slate-400">
                <span className="text-muted">{roleOf(S.flow.requester).label}:</span> {nameOf(sel.data.requester)}
                {Object.entries(sel.data.actors).map(([role, h]) => (
                  <span key={role}>
                    {" "}
                    · <span className="text-muted">{roleOf(role).label}:</span> {nameOf(h)}
                  </span>
                ))}
                {isExpired(S.flow, sel.data) && <span className="text-rose-300"> · expirată</span>}
              </p>
              {selDoc && S.documents && (
                <div className="mt-3 space-y-2 rounded-xl bg-slate-950/60 p-3">
                  <DocTable doc={selDoc} />
                  <ChecksList checks={checkDocument(selDoc, { rules: S.documents.rules, category: sel.data.category, existing: docs.filter((d) => d.id !== sel.id).map((d) => d.doc), now: new Date(sel.data.history[0].at) })} />
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2" data-testid="steps">
                {actor && available(S.flow, sel.data, actor).some((t) => t.note) && (
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motiv (pentru pașii care îl cer)" aria-label="Motiv" className="w-full rounded-lg bg-slate-900 px-2 py-1 text-sm" />
                )}
                {actor &&
                  available(S.flow, sel.data, actor).map((t) => (
                    <Button key={t.id} variant={t.danger ? "danger" : "primary"} disabled={busy !== null || (t.note === "required" && !note.trim())} onClick={() => void step(sel, t.id)}>
                      {t.label}
                    </Button>
                  ))}
                {actor && available(S.flow, sel.data, actor).length === 0 && <p className="text-xs text-slate-500">{waitingFor(sel.data)}</p>}
              </div>
              <div className="mt-4">
                <Timeline r={sel.data} nameOf={nameOf} />
              </div>
              <Link href={`/fisa/${sel.id}`} className="mt-3 inline-block text-sm text-accent hover:underline">
                Fișa pentru tipărit (PDF) →
              </Link>
            </Card>
          )}
          <Card title={`${S.request.plural[0].toUpperCase()}${S.request.plural.slice(1)} (${visible.length})`}>
            <ul className="space-y-1" data-testid="request-list">
              {visible.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setSelected(r.id)} className={`flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left text-sm ring-1 transition ${r.id === selected ? "ring-coral/60 shadow-[0_0_0_4px_var(--color-coral-tint)]" : "ring-line hover:ring-coral/30"}`}>
                    <StatusDot status={r.data.status} />
                    <span className="min-w-0 flex-1 truncate">
                      <b className="font-semibold text-ink">{r.data.title}</b> <span className="text-muted">· {nameOf(r.data.requester)}</span>
                    </span>
                    <StatusPill status={r.data.status} />
                    <span className="hidden w-20 shrink-0 text-right text-xs text-muted sm:block">{ageLabel(ageMinutes({ at: r.data.history.at(-1)!.at }))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="space-y-4" data-tour="board-side">
          {me?.role === S.flow.requester && S.documents?.enabled && (
            <Card title={S.documents.title}>
              <DocumentIntake existing={docs.map((d) => d.doc)} onSubmit={submitDocument} />
            </Card>
          )}
          {me?.role === S.flow.requester && !S.documents?.enabled && (
            <Card label="Cum ai spune-o" title={S.request.addTitle}>
              <div className="prompt-box p-4">
                <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={S.request.addPlaceholder} className="h-24 w-full resize-none text-[1.02rem] leading-snug" aria-label={S.request.addTitle} />
                <div className="mt-1 flex items-center justify-between">
                  <button className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-white/70 disabled:opacity-40" onClick={speech.listening ? speech.stop : speech.start} disabled={!speech.supported} title="Spune cu vocea" aria-label="Spune cu vocea">
                    <MicIcon on={speech.listening} />
                  </button>
                  <ArrowButton label="Pregătește cererea" busy={busy === "structure"} onClick={() => void structure()} disabled={busy !== null || !raw.trim()} />
                </div>
              </div>
              {draft && (
                <div className="mt-3 space-y-2 rounded-xl border border-accent/40 p-3 text-sm">
                  <p className="text-xs text-accent">Verifică înainte să salvezi:</p>
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full rounded-lg bg-slate-900 px-2 py-1" aria-label="Titlu" />
                  <div className="flex gap-2">
                    <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="rounded-lg bg-slate-900 px-2 py-1" aria-label="Categorie">
                      {S.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input type="number" min={1} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} className="w-16 rounded-lg bg-slate-900 px-2 py-1" aria-label="Cantitate" />
                    <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="w-24 rounded-lg bg-slate-900 px-2 py-1" aria-label="Unitate" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    Urgență (propusă de AI, decizi tu)
                    <input type="number" min={1} max={5} value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: Number(e.target.value) })} className="w-14 rounded-lg bg-slate-900 px-2 py-1 text-slate-100" aria-label="Urgență" />
                  </label>
                  <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="w-full rounded-lg bg-slate-900 px-2 py-1" aria-label="Adresă" />
                  <Button variant="primary" onClick={() => void save()}>
                    Salvează pe hartă
                  </Button>
                </div>
              )}
            </Card>
          )}
          {me && me.role !== S.flow.requester && S.features.matching && (
            <Card title={S.request.offerTitle}>
              <div className="prompt-box flex items-end gap-2 p-4">
                <textarea value={offer} onChange={(e) => setOffer(e.target.value)} className="h-20 w-full resize-none text-[1.02rem] leading-snug" aria-label={S.request.offerTitle} />
                <ArrowButton label="Găsește potriviri" busy={busy === "match"} onClick={() => void match()} disabled={busy !== null || !offer.trim()} />
              </div>
              <ol className="mt-3 space-y-2">
                {matches.map((m, i) => {
                  const r = items.find((x) => x.id === m.id);
                  if (!r) return null;
                  return (
                    <li key={m.id}>
                      <button onClick={() => setSelected(m.id)} className="w-full rounded-xl bg-slate-800/60 p-3 text-left text-sm hover:bg-slate-800">
                        <span className="font-semibold">
                          {i + 1}. {r.data.title}
                        </span>{" "}
                        <span className="text-accent">{m.score}/100</span>
                        <span className="block text-slate-400">{m.why}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
          <ErrorNote error={error?.msg} hint={error?.hint} />
          <Card title={`${S.notify.channel === "sms" ? "SMS-uri" : "Emailuri"} trimise`}>
            <ul className="space-y-2 text-sm" data-testid="outbox">
              {[...sent.items].reverse().slice(0, 4).map((n) => (
                <li key={n.id} className="rounded-xl bg-slate-800/50 px-3 py-2">
                  <p className="text-xs text-slate-400">
                    {timeOf(n.data.at)} · către {n.data.toName} ({n.data.address}) ·{" "}
                    <span className={n.data.status === "eșuat" ? "text-rose-300" : n.data.status === "simulat" ? "text-amber-200" : "text-emerald-300"}>{n.data.status}</span>
                  </p>
                  <p className="mt-0.5 break-words">{n.data.message}</p>
                  {n.data.error && <p className="mt-0.5 text-xs text-rose-300">{n.data.error}</p>}
                </li>
              ))}
              {!sent.items.length && <li className="text-slate-500">Nimic încă. Fiecare pas din ciclu anunță cealaltă parte.</li>}
            </ul>
            <p className="mt-2 text-xs text-slate-500">„Simulat” = fără cheie Twilio pe server sau în modul demo: mesajul e cel real, doar nu pleacă.</p>
          </Card>
          {S.reports.enabled && (
            <Card title={S.reports.title}>
              <QrPanel url={`${location.origin}/raport`} size={150} label="Scanează și raportează de pe telefon" />
              <ul className="mt-4 space-y-1 text-sm" data-testid="live-reports">
                {recentReports.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5" style={{ opacity: Math.max(0.5, freshness(r.data, S.reports)) }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: reportTypeOf(r.data.type).color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{r.data.note || reportTypeOf(r.data.type).label}</span>
                    <span className="shrink-0 text-xs text-slate-400">{ageLabel(ageMinutes(r.data))}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Ce așteaptă cererea, când omul curent nu are niciun pas de făcut. */
function waitingFor(r: Request): string {
  const st = stateOf(S.flow, r.status);
  if (st.tone === "done") return "Încheiată: au confirmat toți.";
  const who = waitingOn(S.flow, r).map((role) => (role === S.flow.requester ? "cel care a cerut" : roleOf(role).label.toLowerCase()));
  return who.length ? `Așteaptă: ${who.join(" sau ")}.` : `Starea: ${st.label}.`;
}
