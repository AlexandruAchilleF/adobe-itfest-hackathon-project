// Fluxul unei cereri, configurabil și pur (fără React, fără stocare). Scenariul descrie
// stările și pașii (tranzițiile), cu rolul care are voie să facă fiecare pas:
//
//   flow: {
//     requester: "angajat",                  // cine creează cererea
//     initial: "trimis",
//     states: [{ id: "trimis", label: "trimis", tone: "open" }, ...],
//     transitions: [
//       { id: "aproba", label: "Aprobă", done: "a aprobat", from: ["trimis"], to: "aprobat", role: "manager" },
//       { id: "respinge", label: "Trimite înapoi", done: "a trimis înapoi", from: ["trimis"], to: "de-corectat", role: "manager", note: "required" },
//       ...
//     ],
//   }
//
// Cine poate face un pas: rolul cerut și, în plus,
//  - pentru rolul care a creat cererea: doar omul care a creat-o;
//  - pentru celelalte roluri: primul om din rol care face un pas „se leagă” de cerere
//    (actors[rol]) și după aceea doar el mai poate face pașii rolului ăluia.
// Fiecare pas rămâne în `history`, cu cine era legat de cerere atunci, ca punctele,
// contestările și cronometrul (src/lib/gamification.ts, src/lib/metrics.ts) să se calculeze din istoric.

import { z } from "zod";

export type Tone = "open" | "progress" | "waiting" | "returned" | "done" | "failed";

export interface StateDef {
  id: string;
  label: string;
  /** cum se comportă starea: deschisă, în lucru, așteaptă pe cineva, întoarsă, reușită, eșuată */
  tone: Tone;
}

export interface NotifyContext {
  title: string;
  /** cine a făcut pasul */
  by: string;
  requester: string;
  /** numele oamenilor legați de cerere, pe rol */
  actors: Record<string, string>;
  quantity: string;
  note?: string;
  points?: number;
  link: string;
}

export interface TransitionDef {
  id: string;
  /** textul butonului */
  label: string;
  /** cum apare în cronologie, după numele omului: „a aprobat” */
  done: string;
  from: string[];
  to: string;
  role: string;
  /** true = omul se dezleagă de cerere („Renunț”) */
  release?: boolean;
  /** true = se dezleagă toți în afară de cel care a cerut („Cere din nou”) */
  reset?: boolean;
  /** motivul: obligatoriu la „trimite înapoi” sau „nu am primit” */
  note?: "required" | "optional";
  /** done = reușita care se socotește (puncte, impact); failed = „n-a mers” care se socotește împotriva celui legat */
  outcome?: "done" | "failed";
  danger?: boolean;
  /** cine primește SMS/email după pas (un rol) și ce scrie */
  notify?: { role: string; message: (c: NotifyContext) => string };
}

export interface FlowDef {
  requester: string;
  initial: string;
  states: StateDef[];
  transitions: TransitionDef[];
}

export const HistoryEntry = z.object({
  at: z.string(),
  /** id-ul tranziției sau „create” */
  event: z.string(),
  by: z.string(),
  role: z.string(),
  to: z.string(),
  /** cine era legat de cerere după pas, pe rol */
  actors: z.record(z.string(), z.string()),
  note: z.string().optional(),
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const RequestBase = z.object({
  title: z.string(),
  category: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  urgency: z.number().describe("1 (poate aștepta) … 5 (azi)"),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  requester: z.string(),
  actors: z.record(z.string(), z.string()),
  status: z.string(),
  expiresAt: z.string().optional(),
  /** date de domeniu în plus (ex: liniile unui bon, CUI-ul furnizorului) */
  extra: z.record(z.string(), z.unknown()).optional(),
  history: z.array(HistoryEntry),
});
export type Request = z.infer<typeof RequestBase>;

export interface Actor {
  handle: string;
  role: string;
  /** cont suspendat după prea multe „n-a mers” (vezi gamification.isSuspended): nu se mai poate lega de cereri noi */
  suspended?: boolean;
}

export const stateOf = (flow: FlowDef, id: string): StateDef => flow.states.find((s) => s.id === id) ?? { id, label: id, tone: "open" };
export const transitionOf = (flow: FlowDef, id: string): TransitionDef | undefined => flow.transitions.find((t) => t.id === id);
export const toneOf = (flow: FlowDef, r: Pick<Request, "status">): Tone => stateOf(flow, r.status).tone;

export function isExpired(flow: FlowDef, r: Pick<Request, "expiresAt" | "status">, now: Date = new Date()): boolean {
  return toneOf(flow, r) === "open" && Boolean(r.expiresAt) && new Date(r.expiresAt!).getTime() <= now.getTime();
}

export type Check = { ok: true } | { ok: false; reason: string };

/** Poate omul ăsta face pasul ăsta acum? Motivul e scris pentru UI. */
export function can(flow: FlowDef, r: Request, id: string, actor: Actor, now: Date = new Date()): Check {
  const t = transitionOf(flow, id);
  if (!t) return { ok: false, reason: `Pasul „${id}” nu există.` };
  if (actor.role !== t.role) return { ok: false, reason: `Doar rolul „${t.role}” poate face pasul ăsta.` };
  if (!t.from.includes(r.status)) return { ok: false, reason: `Cererea e „${stateOf(flow, r.status).label}”, pasul nu se mai poate face.` };
  if (t.role === flow.requester) {
    if (r.requester !== actor.handle) return { ok: false, reason: "Nu e cererea ta." };
  } else {
    const bound = r.actors[t.role];
    if (bound && bound !== actor.handle) return { ok: false, reason: "Altcineva se ocupă de cererea asta." };
    if (!bound && actor.suspended) return { ok: false, reason: "Contul e suspendat după prea multe livrări neconfirmate." };
    if (!bound && r.requester === actor.handle) return { ok: false, reason: "Nu poți prelua propria cerere." };
    if (!bound && isExpired(flow, r, now)) return { ok: false, reason: "Cererea a expirat." };
  }
  return { ok: true };
}

/** Aplică pasul și întoarce cererea nouă (nu o modifică pe cea veche). Aruncă eroare dacă nu se poate. */
export function apply(flow: FlowDef, r: Request, id: string, actor: Actor, now: Date = new Date(), note?: string): Request {
  const check = can(flow, r, id, actor, now);
  if (!check.ok) throw new Error(check.reason);
  const t = transitionOf(flow, id)!;
  if (t.note === "required" && !note?.trim()) throw new Error("Scrie pe scurt motivul.");
  let actors = { ...r.actors };
  if (t.reset) actors = {};
  else if (t.release) delete actors[t.role];
  else if (t.role !== flow.requester) actors[t.role] = actor.handle;
  const entry: HistoryEntry = { at: now.toISOString(), event: id, by: actor.handle, role: actor.role, to: t.to, actors: t.outcome ? { ...r.actors, ...actors } : actors, ...(note?.trim() ? { note: note.trim() } : {}) };
  return { ...r, status: t.to, actors, history: [...r.history, entry] };
}

/** Pașii pe care îi poate face omul ăsta acum, în ordinea din config. */
export function available(flow: FlowDef, r: Request, actor: Actor, now: Date = new Date()): TransitionDef[] {
  return flow.transitions.filter((t) => can(flow, r, t.id, actor, now).ok);
}

/** Rolurile care pot face următorul pas (pentru „așteaptă pe…”). */
export function waitingOn(flow: FlowDef, r: Request): string[] {
  return [...new Set(flow.transitions.filter((t) => t.from.includes(r.status)).map((t) => t.role))];
}

export type NewRequest = Omit<Request, "status" | "history" | "actors" | "requester">;

export function createRequest(flow: FlowDef, data: NewRequest, requester: string, now: Date = new Date()): Request {
  return { ...data, requester, actors: {}, status: flow.initial, history: [{ at: now.toISOString(), event: "create", by: requester, role: flow.requester, to: flow.initial, actors: {} }] };
}

export type SeedStep = [transition: string, handle: string, note?: string, minutesAfter?: number];

/** Pentru seed: aplică pașii dați (implicit la 20 de minute unul după altul). `roleOf` spune rolul fiecărui om. */
export function advance(flow: FlowDef, r: Request, steps: SeedStep[], roleOf: (handle: string) => string, start: Date): Request {
  let at = start.getTime();
  return steps.reduce((cur, [id, handle, note, minutes]) => {
    at += (minutes ?? 20) * 60_000;
    return apply(flow, cur, id, { handle, role: roleOf(handle) }, new Date(at), note);
  }, r);
}

/** Textul unui rând din istoric, pentru cronologia din UI. */
export function describeEntry(flow: FlowDef, e: HistoryEntry, name: (handle: string) => string): string {
  if (e.event === "create") return `${name(e.by)} a cerut`;
  return `${name(e.by)} ${transitionOf(flow, e.event)?.done ?? e.event}`;
}

/** Verificări pentru un flux nou: prind greșelile de config înainte de demo. */
export function validateFlow(flow: FlowDef, roles: string[]): string[] {
  const problems: string[] = [];
  const states = new Set(flow.states.map((s) => s.id));
  if (!roles.includes(flow.requester)) problems.push(`Rolul care cere (${flow.requester}) nu există.`);
  if (!states.has(flow.initial)) problems.push(`Starea inițială ${flow.initial} nu există.`);
  const ids = new Set<string>();
  for (const t of flow.transitions) {
    if (ids.has(t.id)) problems.push(`Pasul ${t.id} apare de două ori.`);
    ids.add(t.id);
    if (!roles.includes(t.role)) problems.push(`Pasul ${t.id}: rolul ${t.role} nu există.`);
    if (!states.has(t.to)) problems.push(`Pasul ${t.id}: starea ${t.to} nu există.`);
    t.from.filter((f) => !states.has(f)).forEach((f) => problems.push(`Pasul ${t.id}: starea ${f} nu există.`));
    if (t.notify && !roles.includes(t.notify.role)) problems.push(`Pasul ${t.id}: notifică rolul ${t.notify.role}, care nu există.`);
  }
  // fiecare stare care nu e finală trebuie să aibă măcar o ieșire
  for (const s of flow.states) {
    if (s.tone !== "done" && s.tone !== "failed" && !flow.transitions.some((t) => t.from.includes(s.id))) problems.push(`Starea ${s.id} nu are niciun pas de ieșire (cererea rămâne blocată).`);
  }
  if (!flow.transitions.some((t) => stateOf(flow, t.to).tone === "done")) problems.push("Niciun pas nu duce într-o stare de reușită (tone: done).");
  return problems;
}
