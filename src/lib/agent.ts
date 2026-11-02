// Comenzi în limbaj natural → acțiuni reale în aplicație.
// Definiți ce poate face aplicația; AI-ul alege acțiunile și argumentele, voi le executați.
//
//   const addText = defineAction({
//     name: "add_text",
//     description: "Adaugă un text pe pânză",
//     args: z.object({ text: z.string(), color: z.string() }),
//     run: ({ text, color }) => canvas.addText(text, color),
//     examples: ["scrie bun venit"],                 // pentru modul demo (fără AI)
//     mockArgs: { text: "Bun venit", color: "#fff" },
//   });
//   const res = await runAgent({ input: "scrie bun venit cu alb", actions: [addText] });
//   res.say  // răspunsul de citit cu voce tare

import { z } from "zod";
import { ask } from "./ai";
import { isDemoMode } from "./demoMode";

// orice obiect Zod e acceptat ca argumente
type AnyArgs = z.ZodObject<z.ZodRawShape>;

export interface AgentAction<A extends AnyArgs = AnyArgs> {
  name: string;
  description: string;
  args: A;
  run: (args: z.infer<A>) => unknown | Promise<unknown>;
  /** Fraze exemplu; în modul demo se alege acțiunea cu cele mai multe cuvinte comune. */
  examples?: string[];
  /** Argumentele folosite în modul demo. */
  mockArgs?: z.infer<A>;
}

export function defineAction<A extends AnyArgs>(action: AgentAction<A>): AgentAction {
  return action as unknown as AgentAction;
}

export interface AgentTurn {
  input: string;
  say: string;
  actions: Array<{ name: string; args: unknown; ok: boolean; error?: string }>;
}

interface RunOptions {
  input: string;
  actions: AgentAction[];
  /** Descrierea aplicației (cine e asistentul, ce face). */
  persona?: string;
  /** Starea curentă, ca text (ex: ce e pe pânză). Se recalculează la fiecare comandă. */
  context?: string;
  /** Ture anterioare, pentru „mai mare", „pe ăla de adineauri"... */
  history?: AgentTurn[];
  files?: Array<string | Blob>;
}

export function agentSchema(actions: AgentAction[]) {
  const calls = actions.map((a) => z.object({ name: z.literal(a.name), args: a.args }));
  const call = calls.length === 1 ? calls[0] : z.union(calls as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
  return z.object({
    say: z.string().describe("răspuns scurt pentru utilizator, în limba lui, max 1-2 propoziții"),
    actions: z.array(call).describe("acțiunile de executat, în ordine; listă goală dacă nu e nevoie de nimic"),
  });
}

const LenientPlan = z.object({
  say: z.string(),
  actions: z.array(z.object({ name: z.string(), args: z.unknown() })),
});

/** Alegerea „de rezervă" pentru modul demo: potrivire după cuvinte cu exemplele. */
export function mockPlan(input: string, actions: AgentAction[]): { say: string; actions: Array<{ name: string; args: unknown }> } {
  const words = new Set(normalize(input).split(" ").filter((w) => w.length > 2));
  let best: AgentAction | null = null;
  let bestScore = 0;
  for (const a of actions) {
    const vocab = normalize([a.name.replace(/_/g, " "), a.description, ...(a.examples ?? [])].join(" ")).split(" ");
    const score = vocab.filter((w) => words.has(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  if (!best || best.mockArgs === undefined) return { say: "(demo) Nu am înțeles comanda.", actions: [] };
  return { say: `(demo) Am executat: ${best.description.toLowerCase()}.`, actions: [{ name: best.name, args: best.mockArgs }] };
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function runAgent(opts: RunOptions): Promise<AgentTurn> {
  const { input, actions } = opts;
  const schema = agentSchema(actions);
  const catalog = actions.map((a) => `- ${a.name}: ${a.description}`).join("\n");
  const history = (opts.history ?? [])
    .slice(-6)
    .map((t) => `Utilizator: ${t.input}\nAsistent: ${t.say} [acțiuni: ${t.actions.map((a) => a.name).join(", ") || "niciuna"}]`)
    .join("\n");

  const system = [
    opts.persona ?? "Ești asistentul vocal al unei aplicații. Transformi cererile utilizatorului în acțiuni.",
    "Folosește DOAR acțiunile din listă. Dacă cererea nu se poate face cu ele, nu inventa: explică pe scurt în `say` și întoarce `actions: []`.",
    "Poți combina mai multe acțiuni pentru o singură cerere. Răspunde în limba utilizatorului.",
    `Acțiuni disponibile:\n${catalog}`,
  ].join("\n\n");

  const prompt = [
    opts.context ? `Starea curentă a aplicației:\n${opts.context}` : "",
    history ? `Conversația de până acum:\n${history}` : "",
    `Cererea utilizatorului: ${input}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Modelul primește schema strictă; la validare acceptăm orice acțiune și o verificăm
  // individual mai jos, ca o singură acțiune greșită să nu anuleze toată comanda.
  const plan = isDemoMode()
    ? mockPlan(input, actions)
    : (await ask({ system, prompt, schema: LenientPlan, outputSchema: schema, files: opts.files, mock: mockPlan(input, actions) })).data;

  const results: AgentTurn["actions"] = [];
  for (const call of plan.actions as Array<{ name: string; args: unknown }>) {
    const action = actions.find((a) => a.name === call.name);
    if (!action) {
      results.push({ name: call.name, args: call.args, ok: false, error: "acțiune necunoscută" });
      continue;
    }
    const parsed = action.args.safeParse(call.args);
    if (!parsed.success) {
      results.push({ name: call.name, args: call.args, ok: false, error: z.prettifyError(parsed.error) });
      continue;
    }
    try {
      await action.run(parsed.data);
      results.push({ name: call.name, args: parsed.data, ok: true });
    } catch (err) {
      results.push({ name: call.name, args: parsed.data, ok: false, error: (err as Error).message });
    }
  }
  return { input, say: plan.say, actions: results };
}
