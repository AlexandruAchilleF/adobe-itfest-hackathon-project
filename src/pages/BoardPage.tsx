// Pagina principală a scenariului: cererile pe hartă și ciclul lor, din perspectiva rolului curent.
//  - cine cere (flow.requester) scrie cererea cum ar spune-o → AI-ul o structurează → omul verifică → salvează
//  - cine ajută spune ce poate oferi → scor determinist (urgență + distanță) + explicație AI
//  - fiecare pas din flux e un buton al omului care are voie să-l facă (src/lib/flow.ts)
// Tot textul de domeniu vine din src/scenario/config.ts.

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { QrPanel } from "../components/QrPanel";
import { ArrowButton, Button, Card, ErrorNote, MicIcon, PageHeader } from "../components/ui";
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
  const showReports = S.reports.enabled;
  // pe telefon, panoul cererii alese e sub listă: îl aducem în ecran
  const sideRef = useRef<HTMLDivElement>(null);
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
  const visible = items.filter((r) => (filter === "toate" ? true : filter === "ale mele" ? mine(r.data) : filter === "rândul meu" ? (actor ? available(S.flow, r.data, actor).length > 0 : false) : r.data.category === filter));
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
        color: toneOf(S.flow, r.data) === "done" ? "#b9b3c9" : categoryOf(r.data.category).color,
        weight: r.data.urgency,
      })),
    [visible],
  );
  const points = [...requestPoints, ...reportPoints];
  const sel = items.find((r) => r.id === selected) ?? null;

  useEffect(() => {
    if (selected && window.innerWidth < 1024) sideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

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
        description: `Arată doar ${S.request.plural} dintr-o categorie, doar ale mele sau doar cele care așteaptă după mine (rândul meu)`,
        args: z.object({ filter: z.enum(["toate", "rândul meu", "ale mele", ...CAT_IDS]) }),
        run: ({ filter: f }) => setFilter(f),
        examples: ["arată doar ale mele", `arată doar ${S.categories[0].label}`],
        mockArgs: (input: string) => ({ filter: input.includes("rând") ? "rândul meu" : input.includes("mele") ? "ale mele" : (S.categories.find((c) => input.toLowerCase().includes(c.label))?.id ?? "toate") }),
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

  // ce e rândul meu acum: cererile la care am un buton de apăsat
  const myTurn = (r: Request) => (actor ? available(S.flow, r, actor).length > 0 : false);
  const turnCount = items.filter((r) => myTurn(r.data)).length;
  const selDocChecks = selDoc && S.documents && sel ? checkDocument(selDoc, { rules: S.documents.rules, category: sel.data.category, existing: docs.filter((d) => d.id !== sel.id).map((d) => d.doc), now: new Date(sel.data.history[0].at) }) : [];
  const docIssues = selDocChecks.filter((c) => c.level !== "ok").length;
  const sortedVisible = [...visible].sort((x, y) => Number(myTurn(y.data)) - Number(myTurn(x.data)));
  const tabs: Array<[string, string]> = [
    ["toate", "Toate"],
    ["rândul meu", `Rândul meu${turnCount ? ` · ${turnCount}` : ""}`],
    ["ale mele", "Ale mele"],
  ];
  const plural = `${S.request.plural[0].toUpperCase()}${S.request.plural.slice(1)}`;

  return (
    <div>
      <PageHeader eyebrow={me ? `Ești ${roleOf(me.role).label.toLowerCase()}` : undefined} title={turnCount ? `${plural}: *${turnCount} te așteaptă*` : `${plural} *în lucru*`}>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>
            {items.length} {S.request.plural}
          </span>
          {!pitchMode(S) && (
            <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => void Promise.all([reset(), live.reset(), sent.reset()])}>
              Resetează datele demo
            </Button>
          )}
        </div>
      </PageHeader>
      <ErrorNote error={dbError} />
      {notice && (
        <p role="status" className="mb-5 rounded-2xl bg-sage px-4 py-3 text-sm text-sage-ink ring-1 ring-[#cfe3c9]" data-testid="notice">
          {notice}
        </p>
      )}
      {actor?.suspended && (
        <p role="alert" className="mb-5 rounded-2xl bg-coral-tint px-4 py-3 text-sm text-coral-deep ring-1 ring-[#f2cdc5]">
          Cont suspendat după prea multe „n-a mers”. Nu mai poți prelua {S.request.plural} noi.
        </p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className={`rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${filter === id ? "bg-ink text-white ring-ink" : "bg-card text-ink-2 ring-line hover:ring-coral/40"}`}>
                {label}
              </button>
            ))}
            {CAT_IDS.includes(filter) && (
              <button onClick={() => setFilter("toate")} className="inline-flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1.5 text-sm text-ink-2 ring-1 ring-line" aria-label="Scoate filtrul">
                <span className="h-2 w-2 rounded-full" style={{ background: categoryOf(filter).color }} aria-hidden />
                {categoryOf(filter).label} ×
              </button>
            )}
          </div>
          {S.features.map && (
            <div data-tour="board-map">
              <MapView points={points} selectedId={selected} onSelect={(id) => !id.startsWith("raport:") && setSelected(id)} origin={origin} className="h-[320px]" />
            </div>
          )}
          <ul className="space-y-2" data-testid="request-list">
            {sortedVisible.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelected(r.id)} className={`flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left text-sm ring-1 transition ${r.id === selected ? "ring-coral/60 shadow-[0_0_0_4px_var(--color-coral-tint)]" : "ring-line hover:ring-coral/30"}`}>
                  <StatusDot status={r.data.status} />
                  <span className="min-w-0 flex-1 truncate">
                    <b className="font-semibold text-ink">{r.data.title}</b> <span className="hidden text-muted sm:inline">· {nameOf(r.data.requester)}</span>
                  </span>
                  {myTurn(r.data) && <span className="shrink-0 font-serif text-[0.85rem] text-coral-deep">rândul tău</span>}
                  <StatusPill status={r.data.status} />
                  <span className="hidden w-24 shrink-0 whitespace-nowrap text-right text-xs text-muted md:block">{ageLabel(ageMinutes({ at: r.data.history.at(-1)!.at }))}</span>
                </button>
              </li>
            ))}
            {!sortedVisible.length && <li className="rounded-2xl bg-card px-4 py-6 text-center text-sm text-muted ring-1 ring-line">Nimic aici.</li>}
          </ul>
        </div>

        <div className="space-y-4 lg:sticky lg:top-28" data-tour="board-side" ref={sideRef}>
          {sel ? (
            <section className="card p-6" data-tour="board-detail">
              <div className="flex items-center justify-between gap-3">
                <StatusPill status={sel.data.status} />
                <button onClick={() => setSelected(null)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-paper-2" aria-label="Închide">
                  ×
                </button>
              </div>
              <h2 className="mt-3 text-[1.5rem] font-semibold leading-tight text-ink">{sel.data.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {nameOf(sel.data.requester)}
                {Object.values(sel.data.actors).map((h) => ` → ${nameOf(h)}`)}
                {sel.data.address && ` · ${sel.data.address}`}
                {isExpired(S.flow, sel.data) && <span className="text-coral-deep"> · expirată</span>}
              </p>
              <p className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.03em] text-ink tabular-nums">
                {sel.data.quantity} <span className="text-base font-normal text-muted">{sel.data.unit}</span>
              </p>

              <div className="mt-5 flex flex-wrap gap-2" data-testid="steps">
                {actor && available(S.flow, sel.data, actor).some((t) => t.note) && (
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motiv, dacă e cazul" aria-label="Motiv" className="w-full px-3 py-2 text-sm" />
                )}
                {actor &&
                  available(S.flow, sel.data, actor).map((t) => (
                    <Button key={t.id} variant={t.danger ? "danger" : "primary"} className="flex-1" disabled={busy !== null || (t.note === "required" && !note.trim())} onClick={() => void step(sel, t.id)}>
                      {t.label}
                    </Button>
                  ))}
                {actor && available(S.flow, sel.data, actor).length === 0 && <p className="text-sm text-muted">{waitingFor(sel.data)}</p>}
              </div>

              <div className="mt-6 divide-y divide-line border-t border-line text-sm">
                {selDoc && S.documents && (
                  <details className="group py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
                      Documentul
                      <span className={docIssues ? "text-amber-200" : "text-sage-ink"}>{docIssues ? `${docIssues} de verificat` : "toate verificările trec"}</span>
                    </summary>
                    {/* doar ce nu iese e la vedere; bonul întreg se deschide la clic */}
                    {docIssues > 0 && (
                      <ul className="mt-2 space-y-1 group-open:hidden">
                        {selDocChecks
                          .filter((c) => c.level !== "ok")
                          .map((c) => (
                            <li key={c.id} className={c.level === "error" ? "text-coral-deep" : "text-amber-200"}>
                              {c.detail}
                            </li>
                          ))}
                      </ul>
                    )}
                    <div className="mt-3 space-y-3">
                      <DocTable doc={selDoc} />
                      <ChecksList checks={selDocChecks} />
                    </div>
                  </details>
                )}
                <details className="py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink">
                    Istoric <span className="text-muted">{sel.data.history.length} pași</span>
                  </summary>
                  <div className="mt-3">
                    <Timeline r={sel.data} nameOf={nameOf} />
                  </div>
                </details>
                <Link href={`/fisa/${sel.id}`} className="block py-3 text-coral-deep hover:underline">
                  Fișa pentru tipărit →
                </Link>
              </div>
            </section>
          ) : (
            <>
              {me?.role === S.flow.requester && S.documents?.enabled && (
                <Card label="Cerere nouă" title={S.documents.title}>
                  <DocumentIntake existing={docs.map((d) => d.doc)} onSubmit={submitDocument} />
                </Card>
              )}
              {me?.role === S.flow.requester && !S.documents?.enabled && (
                <Card label="Cerere nouă" title={S.request.addTitle}>
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
                    <div className="mt-4 space-y-2 text-sm">
                      <p className="label-caps">Verifică înainte să salvezi</p>
                      <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full px-3 py-2" aria-label="Titlu" />
                      <div className="flex gap-2">
                        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="min-w-0 flex-1 px-2 py-2" aria-label="Categorie">
                          {S.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <input type="number" min={1} value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} className="w-16 px-2 py-2" aria-label="Cantitate" />
                        <input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="w-24 px-2 py-2" aria-label="Unitate" />
                      </div>
                      <div className="flex gap-2">
                        <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="min-w-0 flex-1 px-3 py-2" aria-label="Adresă" />
                        <input type="number" min={1} max={5} value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: Number(e.target.value) })} className="w-16 px-2 py-2" aria-label="Urgență" title="Urgența 1–5, propusă de AI; decizi tu" />
                      </div>
                      <Button variant="primary" className="w-full" onClick={() => void save()}>
                        Salvează pe hartă
                      </Button>
                    </div>
                  )}
                </Card>
              )}
              {me && me.role !== S.flow.requester && S.features.matching && (
                <Card label="Potrivire" title={S.request.offerTitle}>
                  <div className="prompt-box flex items-end gap-2 p-4">
                    <textarea value={offer} onChange={(e) => setOffer(e.target.value)} className="h-20 w-full resize-none text-[1.02rem] leading-snug" aria-label={S.request.offerTitle} />
                    <ArrowButton label="Găsește potriviri" busy={busy === "match"} onClick={() => void match()} disabled={busy !== null || !offer.trim()} />
                  </div>
                  <ol className="mt-3 space-y-2">
                    {matches.map((m) => {
                      const r = items.find((x) => x.id === m.id);
                      if (!r) return null;
                      return (
                        <li key={m.id}>
                          <button onClick={() => setSelected(m.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-left text-sm ring-1 ring-line hover:ring-coral/40">
                            <span className="min-w-0">
                              <b className="font-semibold">{r.data.title}</b>
                              <span className="block truncate text-muted">{m.why}</span>
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-coral-deep">{m.score}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              )}
              {me && me.role !== S.flow.requester && !S.features.matching && (
                <p className="rounded-2xl bg-card px-5 py-6 text-center text-sm text-muted ring-1 ring-line">Alege din listă. Cele marcate „rândul tău” te așteaptă.</p>
              )}
            </>
          )}
          <ErrorNote error={error?.msg} hint={error?.hint} />

          <details className="card px-5 py-1 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-medium text-ink">
              {S.notify.channel === "sms" ? "SMS-uri trimise" : "Emailuri trimise"} <span className="text-muted">{sent.items.length}</span>
            </summary>
            <ul className="space-y-2 pb-4" data-testid="outbox">
              {[...sent.items].reverse().slice(0, 4).map((n) => (
                <li key={n.id} className="rounded-xl bg-paper px-3 py-2 ring-1 ring-line">
                  <p className="text-xs text-muted">
                    {timeOf(n.data.at)} · {n.data.toName} · <span className={n.data.status === "eșuat" ? "text-coral-deep" : n.data.status === "simulat" ? "text-amber-200" : "text-sage-ink"}>{n.data.status}</span>
                  </p>
                  <p className="mt-0.5 break-words text-ink">{n.data.message}</p>
                  {n.data.error && <p className="mt-0.5 text-xs text-coral-deep">{n.data.error}</p>}
                </li>
              ))}
              {!sent.items.length && <li className="text-muted">Niciunul încă.</li>}
            </ul>
          </details>

          {S.reports.enabled && !S.reports.toRequest && (
            <details className="card px-5 py-1 text-sm" open>
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-medium text-ink">
                {S.reports.title} <span className="text-muted">{recentReports.length}</span>
              </summary>
              <ul className="space-y-1 pb-3" data-testid="live-reports">
                {recentReports.slice(0, 4).map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-1" style={{ opacity: Math.max(0.5, freshness(r.data, S.reports)) }}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: reportTypeOf(r.data.type).color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{r.data.note || reportTypeOf(r.data.type).label}</span>
                    <span className="shrink-0 text-xs text-muted">{ageLabel(ageMinutes(r.data))}</span>
                  </li>
                ))}
              </ul>
              <details className="pb-4">
                <summary className="cursor-pointer list-none text-coral-deep">Cod QR pentru telefon</summary>
                <div className="mt-3">
                  <QrPanel url={`${location.origin}/raport`} size={140} />
                </div>
              </details>
            </details>
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
