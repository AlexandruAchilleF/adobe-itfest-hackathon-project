// Rețeta CIVIC (Smart City / Resource Wise): nevoi reale pe hartă → oricine adaugă o nevoie
// în limbaj natural (AI o structurează, omul verifică) → potrivire între ce oferă cineva și ce
// e nevoie, cu scor determinist + explicație AI. Forma câștigătorului ITFest (ResourceMe).

import { useMemo, useState } from "react";
import { z } from "zod";
import { Button, Card, ErrorNote, PageHeader, Pill, Spinner } from "../components/ui";
import { AiError, ask } from "../lib/ai";
import { useCollection } from "../lib/store";
import { distanceKm, geocode, type LatLng } from "../modules/map/geo";
import { MapView } from "../modules/map/MapView";
import { mascot } from "../modules/mascot/mascot";
import { defineAction } from "../lib/agent";
import { useMascotPage } from "../modules/mascot/page";
import { useSpeechRecognition } from "../modules/voice/speech";
import { baselineScore, CATEGORIES, CATEGORY_COLORS, type Need, needs, STATUSES } from "../recipes/needs";

const Structured = z.object({
  title: z.string().describe("titlu scurt, max 6 cuvinte"),
  category: z.enum(CATEGORIES),
  description: z.string(),
  quantity: z.string(),
  urgency: z.number().describe("1-5"),
  address: z.string().describe("adresa sau zona, cât mai precis, cu orașul"),
  contact: z.string().describe("telefon/email dacă apare, altfel șir gol"),
});

const Match = z.object({
  matches: z.array(z.object({ id: z.string(), score: z.number().describe("0-100"), why: z.string().describe("o propoziție concretă") })),
});

export function MapPage() {
  const { items, add, update, error: dbError, reset } = useCollection(needs);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("toate");
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);

  // adăugare în limbaj natural
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<Need | null>(null);
  const [busy, setBusy] = useState<"structure" | "match" | null>(null);
  const speech = useSpeechRecognition({ onFinal: (t) => setRaw((r) => `${r} ${t}`.trim()) });

  // potrivire
  const [offer, setOffer] = useState("Am o mașină și sâmbăta liberă, stau în zona Titan.");
  const [origin, setOrigin] = useState<(LatLng & { label: string }) | null>(null);
  const [matches, setMatches] = useState<Array<{ id: string; score: number; why: string }>>([]);

  const visible = items.filter((r) => filter === "toate" || r.data.category === filter);
  const points = useMemo(
    () => visible.map((r) => ({ id: r.id, lat: r.data.lat, lng: r.data.lng, label: r.data.title, color: r.data.status === "rezolvat" ? "#475569" : CATEGORY_COLORS[r.data.category], weight: r.data.urgency })),
    [visible],
  );

  const fail = (err: unknown) => setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });

  async function structure() {
    setBusy("structure");
    setError(null);
    try {
      const { data } = await ask({
        system: "Transformi un mesaj scris în grabă despre o nevoie din comunitate într-o fișă structurată. Nu inventa date care nu apar în mesaj.",
        prompt: raw,
        schema: Structured,
        mock: { title: raw.split(/\s+/).slice(0, 5).join(" "), category: "altele" as const, description: raw, quantity: "", urgency: 3, address: "București", contact: "" },
      });
      const geo = await geocode(data.address);
      setDraft({ ...data, urgency: Math.min(5, Math.max(1, Math.round(data.urgency))), lat: geo?.lat ?? 44.4268, lng: geo?.lng ?? 26.1025, status: "deschis" });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  async function match(text: string = offer) {
    setOffer(text);
    setBusy("match");
    setError(null);
    try {
      const where = text.match(/(?:zona|cartierul|în|la)\s+([A-ZĂÂÎȘȚ][\p{L}\s-]+)/u)?.[1];
      const geo = await geocode(`${where ?? text}, București`);
      setOrigin(geo);
      const open = items.filter((r) => r.data.status !== "rezolvat");
      const ranked = open
        .map((r) => ({ r, base: baselineScore(r.data, geo), km: geo ? distanceKm(geo, r.data) : null }))
        .sort((a, b) => b.base - a.base);
      const list = ranked.map(({ r, base, km }) => `id=${r.id} | ${r.data.title} | ${r.data.category} | ${r.data.quantity} | urgență ${r.data.urgency} | ${km ?? "?"} km | scor de bază ${base}`).join("\n");
      const { data } = await ask({
        system: "Potrivești o ofertă de ajutor cu nevoi reale. Pornești de la scorul de bază (urgență + distanță) și îl ajustezi doar dacă oferta se potrivește clar mai bine sau mai rău. Alegi top 3.",
        prompt: `Oferta: ${text}\n\nNevoi deschise:\n${list}`,
        schema: Match,
        mock: { matches: ranked.slice(0, 3).map(({ r, base, km }) => ({ id: r.id, score: base, why: `(demo) Urgență ${r.data.urgency}/5${km !== null ? `, la ${km} km` : ""}.` })) },
      });
      const known = new Set(items.map((r) => r.id));
      const found = data.matches.filter((m) => known.has(m.id)).slice(0, 3);
      setMatches(found);
      mascot.say(found.length ? `Am găsit ${found.length} potriviri. Prima e la ${found[0].score}/100.` : "N-am găsit nicio potrivire deschisă.", found.length ? "celebrate" : "worried");
      if (data.matches[0]) setSelected(data.matches[0].id);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  }

  const sel = items.find((r) => r.id === selected);

  useMascotPage({
    title: "Hartă + potrivire",
    context: () => `${items.length} înregistrări pe hartă, filtru: ${filter}.`,
    actions: [
      defineAction({
        name: "find_help",
        kind: "read",
        description: "Găsește nevoile potrivite pentru ce poate oferi cineva",
        args: z.object({ offer: z.string().describe("ce poate oferi și unde") }),
        run: ({ offer: o }) => match(o),
        examples: ["pot ajuta cu mașina în Titan"],
        mockArgs: (input: string) => ({ offer: input }),
      }),
      defineAction({
        name: "filter_category",
        kind: "read",
        description: "Arată pe hartă doar o categorie",
        args: z.object({ category: z.enum(["toate", ...CATEGORIES]) }),
        run: ({ category }) => setFilter(category),
        examples: ["arată doar educație"],
        mockArgs: (input: string) => ({ category: CATEGORIES.find((c) => input.toLowerCase().includes(c)) ?? ("toate" as const) }),
      }),
    ],
    tour: [
      { target: "map-map", text: "Fiecare punct e o nevoie reală. Culoarea e categoria, mărimea e urgența." },
      { target: "map-offer", text: "Spune ce poți oferi și unde ești: calculez distanța și urgența, apoi îți explic potrivirile." },
      { target: "map-add", text: "Oricine poate adăuga o nevoie, scrisă cum ar spune-o. O structurez, iar tu o verifici înainte de salvare." },
    ],
  });
  return (
    <div>
      <PageHeader title="Hartă + potrivire" description="Nevoi reale pe hartă, adăugate în limbaj natural și potrivite cu cine poate ajuta. Rețeta pentru teme civice („Smart City”, „Resource Wise”).">
        <div className="flex gap-2">
          <Pill ok={null}>{items.length} înregistrări</Pill>
          <Button variant="ghost" onClick={() => void reset()}>
            Resetează datele demo
          </Button>
        </div>
      </PageHeader>
      <ErrorNote error={dbError} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-1">
            {["toate", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-3 py-1 text-xs ${filter === c ? "bg-slate-200 text-slate-900" : "bg-slate-800 text-slate-300"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div data-tour="map-map"><MapView points={points} selectedId={selected} onSelect={setSelected} origin={origin} /></div>
          {sel && (
            <Card title={sel.data.title}>
              <p className="text-sm text-slate-300">{sel.data.description}</p>
              <p className="mt-2 text-sm">
                <b>{sel.data.quantity}</b> · {sel.data.address} · urgență {sel.data.urgency}/5 · {sel.data.contact}
              </p>
              <div className="mt-3 flex gap-2">
                {STATUSES.map((s) => (
                  <Button key={s} variant={sel.data.status === s ? "primary" : "secondary"} onClick={() => void update(sel.id, { ...sel.data, status: s })}>
                    {s}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Cine poate ajuta?" tour="map-offer">
            <textarea value={offer} onChange={(e) => setOffer(e.target.value)} className="h-20 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
            <Button variant="primary" className="mt-2" onClick={() => void match()} disabled={busy !== null || !offer.trim()}>
              {busy === "match" && <Spinner />} Găsește potriviri
            </Button>
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
          <Card title="Adaugă o nevoie (cum ai spune-o)" tour="map-add">
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="ex: La cantina de pe Calea Moșilor ne trebuie 5 voluntari sâmbătă la prânz, sunați la 0722..."
              className="h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <Button onClick={speech.listening ? speech.stop : speech.start} disabled={!speech.supported}>
                {speech.listening ? "■" : "🎤"}
              </Button>
              <Button variant="primary" onClick={structure} disabled={busy !== null || !raw.trim()}>
                {busy === "structure" && <Spinner />} Structurează
              </Button>
            </div>
            {draft && (
              <div className="mt-3 space-y-2 rounded-xl border border-accent/40 p-3 text-sm">
                <p className="text-xs text-accent">Verifică înainte să salvezi:</p>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full rounded-lg bg-slate-900 px-2 py-1" aria-label="Titlu" />
                <div className="flex gap-2">
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Need["category"] })} className="rounded-lg bg-slate-900 px-2 py-1" aria-label="Categorie">
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input type="number" min={1} max={5} value={draft.urgency} onChange={(e) => setDraft({ ...draft, urgency: Number(e.target.value) })} className="w-16 rounded-lg bg-slate-900 px-2 py-1" aria-label="Urgență" />
                </div>
                <input value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} className="w-full rounded-lg bg-slate-900 px-2 py-1" aria-label="Cantitate" placeholder="cantitate" />
                <input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} className="w-full rounded-lg bg-slate-900 px-2 py-1" aria-label="Adresă" />
                <Button
                  variant="primary"
                  onClick={async () => {
                    const rec = await add(draft);
                    setDraft(null);
                    setRaw("");
                    setSelected(rec.id);
                  }}
                >
                  Salvează pe hartă
                </Button>
              </div>
            )}
          </Card>
          <ErrorNote error={error?.msg} hint={error?.hint} />
        </div>
      </div>
    </div>
  );
}
