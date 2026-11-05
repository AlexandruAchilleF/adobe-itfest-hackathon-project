// Rețeta ASISTENT AI („vorbește cu aplicația"): cererile în limbaj natural devin acțiuni
// reale pe date. Citirile se execută direct; ORICE modificare așteaptă aprobarea omului.
// Aici: un coordonator de voluntari care lucrează pe aceleași date ca harta.

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { ConfirmActions } from "../components/ConfirmActions";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { defineAction } from "../lib/agent";
import { type Rec, useCollection } from "../lib/store";
import { useVoiceAgent } from "../lib/useVoiceAgent";
import { geocode } from "../modules/map/geo";
import { mascot } from "../modules/mascot/mascot";
import { CATEGORIES, CATEGORY_COLORS, type Need, needs, STATUSES } from "../recipes/needs";

const ANY = "toate";

export function AssistantPage() {
  const { items, add, update, remove } = useCollection(needs);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [shown, setShown] = useState<Array<Rec<Need>> | null>(null);
  const [text, setText] = useState("");

  const byTitle = (input: string) => {
    const w = input.toLowerCase();
    return itemsRef.current.find((r) => r.data.title.toLowerCase().split(" ").some((t) => t.length > 3 && w.includes(t))) ?? itemsRef.current[0];
  };

  const actions = useMemo(
    () => [
      defineAction({
        name: "find_needs",
        kind: "read",
        description: "Caută și afișează nevoi după categorie, status, urgență minimă sau text",
        args: z.object({
          category: z.enum([ANY, ...CATEGORIES]),
          status: z.enum([ANY, ...STATUSES]),
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
        examples: ["arată-mi nevoile urgente", "ce e deschis la educație", "caută în Berceni"],
        mockArgs: { category: ANY, status: "deschis", min_urgency: 4, text: "" },
      }),
      defineAction({
        name: "add_need",
        description: "Adaugă o nevoie nouă",
        args: z.object({
          title: z.string(),
          category: z.enum(CATEGORIES),
          description: z.string(),
          quantity: z.string(),
          urgency: z.number(),
          address: z.string(),
        }),
        run: async (a) => {
          const geo = await geocode(a.address);
          await add({ ...a, urgency: Math.min(5, Math.max(1, Math.round(a.urgency))), lat: geo?.lat ?? 44.4268, lng: geo?.lng ?? 26.1025, status: "deschis", contact: "" });
        },
        examples: ["adaugă o nevoie", "e nevoie de", "trebuie"],
        mockArgs: (input) => ({ title: input.split(/\s+/).slice(0, 5).join(" "), category: "altele" as const, description: input, quantity: "", urgency: 3, address: "București" }),
      }),
      defineAction({
        name: "set_status",
        description: "Schimbă statusul unei nevoi (deschis / în lucru / rezolvat)",
        args: z.object({ id: z.string().describe("id-ul din lista de context"), status: z.enum(STATUSES) }),
        run: async ({ id, status }) => {
          const r = itemsRef.current.find((x) => x.id === id);
          if (!r) throw new Error("nu există o nevoie cu acest id");
          await update(id, { ...r.data, status });
        },
        examples: ["marchează ca rezolvat", "s-a rezolvat", "e în lucru"],
        mockArgs: (input) => ({ id: byTitle(input)?.id ?? "", status: "rezolvat" as const }),
      }),
      defineAction({
        name: "delete_need",
        description: "Șterge o nevoie",
        args: z.object({ id: z.string() }),
        run: async ({ id }) => remove(id),
        examples: ["șterge nevoia"],
        mockArgs: (input) => ({ id: byTitle(input)?.id ?? "" }),
      }),
    ],
    [add, update, remove],
  );

  const agent = useVoiceAgent({
    actions,
    persona: "Ești asistentul unui coordonator de voluntari dintr-un ONG din București. Răspunzi scurt, în română.",
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
          <Card title="Spune sau scrie">
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
                placeholder="ex: marchează păturile ca rezolvate"
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
              if (name === "set_status") return `„${titleOf(a.id)}” → ${a.status}`;
              if (name === "delete_need") return `șterge „${titleOf(a.id)}”`;
              if (name === "add_need") return `${a.title} · ${a.category} · urgență ${a.urgency} · ${a.address}`;
              return JSON.stringify(args);
            }}
          />
          <Card title="Jurnal">
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
              {!agent.log.length && <li className="text-slate-500">Încearcă: „ce nevoi urgente avem?” sau „marchează păturile ca rezolvate”.</li>}
            </ul>
          </Card>
          <p className="text-xs text-slate-500">
            În cod: <Code>defineAction({"{ kind: \"read\" | \"write\", ... }"})</Code> + <Code>useVoiceAgent</Code> + <Code>{"<ConfirmActions />"}</Code>.
          </p>
        </div>
        <Card title={shown ? `Rezultate (${list.length})` : `Toate nevoile (${list.length})`} actions={shown && <Button variant="ghost" onClick={() => setShown(null)}>Arată tot</Button>}>
          <ul className="space-y-2" data-testid="needs-list">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 px-3 py-2 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[r.data.category] }} />
                <span className="min-w-0 flex-1">
                  <b>{r.data.title}</b> <span className="text-slate-400">· {r.data.address}</span>
                </span>
                <span className="text-xs text-slate-400">urgență {r.data.urgency}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${r.data.status === "rezolvat" ? "bg-emerald-500/20 text-emerald-300" : r.data.status === "în lucru" ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {r.data.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
