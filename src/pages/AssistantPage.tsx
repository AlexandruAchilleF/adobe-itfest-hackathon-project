// Rețeta ASISTENT AI („vorbește cu aplicația"): cererile în limbaj natural devin acțiuni
// reale pe date. Citirile se execută direct; ORICE modificare așteaptă aprobarea omului.
// Aici: aceleași cereri ca pe hartă (src/scenario/config.ts), cu pașii din ciclul lor.

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ConfirmActions } from "../components/ConfirmActions";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { defineAction } from "../lib/agent";
import { useMe } from "../lib/identity";
import { apply, createRequest, type Request } from "../lib/flow";
import { type Rec, useCollection } from "../lib/store";
import { useVoiceAgent } from "../lib/useVoiceAgent";
import { geocode } from "../modules/map/geo";
import { mascot } from "../modules/mascot/mascot";
import { useMascotPage } from "../modules/mascot/page";
import { scenario } from "../scenario/config";
import { categoryOf, requests } from "../scenario/model";
import { StatusPill } from "../scenario/ui/parts";

const ANY = "toate";
const CAT_IDS = scenario.categories.map((c) => c.id) as [string, ...string[]];
const EVENTS = scenario.flow.transitions.map((t) => t.id) as [string, ...string[]];
const STATES = scenario.flow.states.map((st) => st.id);
const labelOf = (id: unknown) => scenario.flow.transitions.find((t) => t.id === id)?.label ?? String(id);
// exemplu de comandă scris cu cuvintele scenariului, ex: „mă ocup eu de apă plată”
const ACCEPT_EXAMPLE = `${scenario.flow.transitions[0].label.toLowerCase()} ${scenario.seed.requests[0]?.title.toLowerCase().split(",")[0] ?? scenario.request.singular}`;

export function AssistantPage() {
  const { items, add, update, remove } = useCollection(requests);
  const { me } = useMe();
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const meRef = useRef(me);
  meRef.current = me;
  const [shown, setShown] = useState<Array<Rec<Request>> | null>(null);
  const [text, setText] = useState("");

  const byTitle = (input: string) => {
    const w = input.toLowerCase();
    return itemsRef.current.find((r) => r.data.title.toLowerCase().split(" ").some((t) => t.length > 3 && w.includes(t))) ?? itemsRef.current[0];
  };

  const actions = useMemo(
    () => [
      defineAction({
        name: "find_requests",
        kind: "read",
        description: `Caută și afișează ${scenario.request.plural} după categorie, status, urgență minimă sau text`,
        args: z.object({
          category: z.enum([ANY, ...CAT_IDS]),
          status: z.enum([ANY, ...STATES]),
          min_urgency: z.number().describe("1-5; 1 = toate"),
          text: z.string().describe("cuvinte de căutat în titlu/descriere/adresă; gol = oricare"),
        }),
        run: ({ category, status, min_urgency, text }) => {
          const t = text.toLowerCase();
          setShown(
            itemsRef.current.filter(
              (r) =>
                (category === ANY || r.data.category === category) &&
                (status === ANY || r.data.status === status) &&
                r.data.urgency >= min_urgency &&
                (!t || `${r.data.title} ${r.data.description} ${r.data.address}`.toLowerCase().includes(t)),
            ),
          );
        },
        examples: ["arată-mi cererile urgente", "ce e deschis", `caută în ${scenario.seed.people[0]?.area ?? "centru"}`],
        mockArgs: { category: ANY, status: "deschis", min_urgency: 4, text: "" },
      }),
      defineAction({
        name: "add_request",
        description: `Adaugă o ${scenario.request.singular} nouă, în numele meu`,
        args: z.object({
          title: z.string(),
          category: z.enum(CAT_IDS),
          description: z.string(),
          quantity: z.number(),
          unit: z.string(),
          urgency: z.number(),
          address: z.string(),
        }),
        run: async (a) => {
          const who = meRef.current;
          if (who?.role !== scenario.flow.requester) throw new Error(`doar ${scenario.roles[scenario.flow.requester].label.toLowerCase()} poate cere`);
          const geo = await geocode(a.address);
          await add(createRequest(scenario.flow, { ...a, urgency: Math.min(5, Math.max(1, Math.round(a.urgency))), lat: geo?.lat ?? scenario.app.center.lat, lng: geo?.lng ?? scenario.app.center.lng }, who.handle));
        },
        examples: ["adaugă o cerere", "am nevoie de", "îmi trebuie"],
        mockArgs: (input) => ({ title: input.split(/\s+/).slice(0, 5).join(" "), category: CAT_IDS.at(-1)!, description: input, quantity: 1, unit: "bucată", urgency: 3, address: "București" }),
      }),
      defineAction({
        name: "request_step",
        description: `Face un pas din fluxul cererii, ca utilizatorul curent: ${scenario.flow.transitions.map((t) => `${t.id} (${t.label})`).join(", ")}`,
        args: z.object({ id: z.string().describe("id-ul din lista de context"), event: z.enum(EVENTS) }),
        run: async ({ id, event }) => {
          const r = itemsRef.current.find((x) => x.id === id);
          const who = meRef.current;
          if (!r) throw new Error("nu există o cerere cu acest id");
          if (!who) throw new Error("nu știu cine ești");
          await update(id, apply(scenario.flow, r.data, event, { handle: who.handle, role: who.role }));
        },
        examples: [ACCEPT_EXAMPLE, "am livrat", "am primit", "nu am primit"],
        mockArgs: (input) => {
          const t = input.toLowerCase();
          const event = [...scenario.flow.transitions].sort((a, b) => b.label.length - a.label.length).find((x) => t.includes(x.label.toLowerCase()))?.id ?? scenario.flow.transitions[0].id;
          return { id: byTitle(input)?.id ?? "", event };
        },
      }),
      defineAction({
        name: "delete_request",
        description: "Șterge o cerere",
        args: z.object({ id: z.string() }),
        run: async ({ id }) => remove(id),
        examples: ["șterge cererea"],
        mockArgs: (input) => ({ id: byTitle(input)?.id ?? "" }),
      }),
    ],
    [add, update, remove],
  );

  const agent = useVoiceAgent({
    actions,
    persona: `Ești asistentul aplicației „${scenario.app.name}”. Utilizatorul curent: ${me?.name ?? "?"} (${me ? scenario.roles[me.role].label : "?"}). Răspunzi scurt, în română.`,
    context: () => itemsRef.current.map((r) => `id=${r.id} | ${r.data.title} | ${r.data.category} | ${r.data.status} | urgență ${r.data.urgency} | ${r.data.address}`).join("\n"),
  });

  // ariciul ascultă cât e pornit microfonul și cere aprobarea când asistentul vrea să modifice ceva
  useEffect(() => {
    if (agent.listening) mascot.set("listening");
    else if (mascot.get().mood === "listening") mascot.set("idle");
  }, [agent.listening]);
  useEffect(() => {
    if (agent.pending) mascot.say("Înainte să modific ceva, aprobă tu lista de mai jos.", "idle");
  }, [agent.pending]);
  useEffect(() => {
    const last = agent.log.at(-1);
    if (!last) return;
    const done = last.actions.filter((a) => a.ok).length;
    const failed = last.actions.filter((a) => !a.ok && a.error !== "respinsă de utilizator").length;
    if (failed) mascot.say(`${failed} ${failed === 1 ? "acțiune n-a mers" : "acțiuni n-au mers"}. Uită-te în jurnal.`, "worried");
    else if (done) mascot.say(last.say.replace(/^\(demo\)\s*/, ""), "happy");
  }, [agent.log]);

  useMascotPage({
    title: "Asistent cu confirmare",
    tour: [
      { target: "assist-input", text: "Cere ce vrei, cu vocea sau în scris: „ce e urgent?”, „am livrat apa”." },
      { target: "assist-list", text: "Citirile le fac direct. Orice modificare ți-o arăt întâi și o fac doar dacă aprobi." },
      { target: "assist-log", text: "Aici vezi tot ce am făcut și ce a fost respins: nimic nu se întâmplă pe ascuns." },
    ],
  });

  const titleOf = (id: unknown) => items.find((r) => r.id === id)?.data.title ?? String(id);
  const list = shown ?? items;

  return (
    <div>
      <PageHeader
        title="Asistent cu confirmare"
        description="Cereri în limbaj natural → acțiuni pe date reale. Citirile se fac direct; orice modificare e arătată omului înainte. Rețeta pentru teme cu „asistent AI” sau „agenți”."
      />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="Spune sau scrie" tour="assist-input">
            <div className="flex gap-2">
              <Button variant={agent.listening ? "danger" : "primary"} onClick={agent.listening ? agent.stopListening : agent.listen} disabled={!agent.supported}>
                {agent.listening ? "■ Ascult…" : "🎤 Vorbește"}
              </Button>
              {agent.thinking && <Spinner />}
            </div>
            {agent.interim && <p className="mt-2 text-sm italic text-slate-400">{agent.interim}…</p>}
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void agent.send(text);
                setText("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ex: arată-mi cererile urgente"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!text.trim() || agent.thinking}>
                Trimite
              </Button>
            </form>
            <ErrorNote error={agent.error} />
          </Card>
          <ConfirmActions
            pending={agent.pending}
            describe={(name, args) => {
              const a = args as Record<string, unknown>;
              if (name === "request_step") return `„${titleOf(a.id)}” → ${labelOf(a.event)}`;
              if (name === "delete_request") return `șterge „${titleOf(a.id)}”`;
              if (name === "add_request") return `${a.title} · ${a.category} · urgență ${a.urgency} · ${a.address}`;
              return JSON.stringify(args);
            }}
          />
          <Card title="Jurnal" tour="assist-log">
            <ul className="max-h-72 space-y-3 overflow-auto text-sm">
              {[...agent.log].reverse().map((t, i) => (
                <li key={i} className="rounded-xl bg-slate-800/60 p-3">
                  <p className="text-slate-400">„{t.input}”</p>
                  <p className="mt-1">{t.say}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {t.actions.map((a) => `${a.ok ? "✓" : "✗"} ${a.name}${a.error ? ` (${a.error})` : ""}`).join("  ") || "nicio acțiune"}
                  </p>
                </li>
              ))}
              {!agent.log.length && <li className="text-slate-500">Încearcă: „arată-mi cererile urgente” sau „{ACCEPT_EXAMPLE}”.</li>}
            </ul>
          </Card>
          <p className="text-xs text-slate-500">
            În cod: <Code>defineAction({"{ kind: \"read\" | \"write\", ... }"})</Code> + <Code>useVoiceAgent</Code> + <Code>{"<ConfirmActions />"}</Code>.
          </p>
        </div>
        <Card tour="assist-list" title={shown ? `Rezultate (${list.length})` : `${scenario.request.plural[0].toUpperCase()}${scenario.request.plural.slice(1)} (${list.length})`} actions={shown && <Button variant="ghost" onClick={() => setShown(null)}>Arată tot</Button>}>
          <ul className="space-y-2" data-testid="assistant-list">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2 text-sm">
                <span className="shrink-0">{categoryOf(r.data.category).icon}</span>
                <span className="min-w-0 flex-1">
                  <b>{r.data.title}</b> <span className="text-slate-400">· {r.data.address}</span>
                </span>
                <span className="text-xs text-slate-400">urgență {r.data.urgency}</span>
                <StatusPill status={r.data.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
