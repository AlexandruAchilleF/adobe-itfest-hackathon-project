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
  /**
   * "read" = doar citește/afișează (se execută direct);
   * "write" = modifică date (implicit) → cere confirmarea omului dacă e dat `confirm`.
   */
  kind?: "read" | "write";
  /** Fraze exemplu; în modul demo se alege acțiunea cu cele mai multe cuvinte comune. */
  examples?: string[];
  /** Argumentele folosite în modul demo (sau o funcție care le construiește din cerere). */
  mockArgs?: z.infer<A> | ((input: string) => z.infer<A>);
  /** Ce va face, în cuvinte, pentru pasul de confirmare (ex: „Aprobă „Prânz cu clientul” (236 lei)”). */
  describe?: (args: z.infer<A>) => string;
}

export interface PlannedCall {
  name: string;
  description: string;
  args: unknown;
  /** textul pentru om, dacă acțiunea are `describe` */
  summary?: string;
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
  /**
   * Omul confirmă acțiunile care modifică date, înainte de execuție.
   * Primește lista de acțiuni „write" valide și întoarce, pentru fiecare, true (execută) sau false.
   */
  confirm?: (calls: PlannedCall[]) => Promise<boolean[]>;
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
  const args = typeof best.mockArgs === "function" ? (best.mockArgs as (i: string) => unknown)(input) : best.mockArgs;
  return { say: `(demo) Am executat: ${best.description.toLowerCase()}.`, actions: [{ name: best.name, args }] };
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

  // 1) validare: acțiune cunoscută + argumente conforme schemei
  type Checked = { name: string; args: unknown; action?: AgentAction; error?: string };
  const checked: Checked[] = (plan.actions as Array<{ name: string; args: unknown }>).map((call) => {
    const action = actions.find((a) => a.name === call.name);
    if (!action) return { ...call, error: "acțiune necunoscută" };
    const parsed = action.args.safeParse(call.args);
    if (!parsed.success) return { ...call, error: z.prettifyError(parsed.error) };
    return { name: call.name, args: parsed.data, action };
  });

  // 2) confirmare umană pentru acțiunile care modifică date
  const writes = checked.filter((c) => c.action && (c.action.kind ?? "write") === "write");
  const approved = new Set<Checked>();
  if (opts.confirm && writes.length) {
    const answers = await opts.confirm(writes.map((c) => ({ name: c.name, description: c.action!.description, args: c.args, ...(c.action!.describe ? { summary: c.action!.describe(c.args as never) } : {}) })));
    writes.forEach((c, i) => answers[i] && approved.add(c));
  } else {
    writes.forEach((c) => approved.add(c));
  }

  // 3) execuție în ordine
  const results: AgentTurn["actions"] = [];
  for (const c of checked) {
    if (!c.action) {
      results.push({ name: c.name, args: c.args, ok: false, error: c.error });
      continue;
    }
    if ((c.action.kind ?? "write") === "write" && !approved.has(c)) {
      results.push({ name: c.name, args: c.args, ok: false, error: "respinsă de utilizator" });
      continue;
    }
    try {
      await c.action.run(c.args as never);
      results.push({ name: c.name, args: c.args, ok: true });
    } catch (err) {
      results.push({ name: c.name, args: c.args, ok: false, error: (err as Error).message });
    }
  }
  return { input, say: plan.say, actions: results };
}
