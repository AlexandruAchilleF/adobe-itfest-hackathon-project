// Ciclul unei cereri, ca logică pură (fără React, fără stocare):
//
//   deschis ──accept──▶ acceptat ──deliver──▶ livrat ──confirm──▶ confirmat
//      ▲                  │                     │
//      └──────cancel──────┘                     └──dispute──▶ contestat ──reopen──▶ deschis
//
// Cine dă (giver) acceptă, renunță și marchează livrat. Cine a cerut (receiver) confirmă
// sau spune „nu am primit”. O cerere e încheiată doar când au confirmat amândoi:
// „livrat” e confirmarea celui care dă, „confirmat” e a celui care primește.
// Fiecare pas rămâne în `history`, cu cine l-a făcut și cine ajuta atunci,
// ca punctele și suspendarea (src/lib/gamification.ts) să se calculeze din istoric.

import { z } from "zod";
import type { RoleId } from "../scenario/types";

export const STATES = ["deschis", "acceptat", "livrat", "confirmat", "contestat"] as const;
export type State = (typeof STATES)[number];

export const EVENTS = ["create", "accept", "cancel", "deliver", "confirm", "dispute", "reopen"] as const;
export type LifecycleEvent = Exclude<(typeof EVENTS)[number], "create">;

export const HistoryEntry = z.object({
  at: z.string(),
  event: z.enum(EVENTS),
  /** handle-ul celui care a făcut pasul */
  by: z.string(),
  /** cine ajuta în momentul pasului (pentru puncte și „nu am primit”) */
  giver: z.string().optional(),
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
  receiver: z.string(),
  giver: z.string().optional(),
  status: z.enum(STATES),
  expiresAt: z.string().optional(),
  history: z.array(HistoryEntry),
});
export type Request = z.infer<typeof RequestBase>;

export interface Actor {
  handle: string;
  role: RoleId;
  /** cont suspendat după prea multe „nu am primit” (vezi gamification.isSuspended) */
  suspended?: boolean;
}

interface Rule {
  from: State[];
  to: State;
  role: RoleId;
  /** true = doar cel care a acceptat cererea (pentru giver) sau cel care a cerut (pentru receiver) */
  ownerOnly: boolean;
}

export const RULES: Record<LifecycleEvent, Rule> = {
  accept: { from: ["deschis"], to: "acceptat", role: "giver", ownerOnly: false },
  cancel: { from: ["acceptat"], to: "deschis", role: "giver", ownerOnly: true },
  deliver: { from: ["acceptat"], to: "livrat", role: "giver", ownerOnly: true },
  confirm: { from: ["livrat"], to: "confirmat", role: "receiver", ownerOnly: true },
  dispute: { from: ["livrat"], to: "contestat", role: "receiver", ownerOnly: true },
  reopen: { from: ["contestat"], to: "deschis", role: "receiver", ownerOnly: true },
};

export function isExpired(r: Pick<Request, "expiresAt" | "status">, now: Date = new Date()): boolean {
  return r.status === "deschis" && Boolean(r.expiresAt) && new Date(r.expiresAt!).getTime() <= now.getTime();
}

export type Check = { ok: true } | { ok: false; reason: string };

/** Poate omul ăsta face pasul ăsta acum? Motivul e scris pentru UI. */
export function can(r: Request, event: LifecycleEvent, actor: Actor, now: Date = new Date()): Check {
  const rule = RULES[event];
  if (actor.role !== rule.role) return { ok: false, reason: rule.role === "giver" ? "Doar cine ajută poate face pasul ăsta." : "Doar cine a cerut poate face pasul ăsta." };
  if (!rule.from.includes(r.status)) return { ok: false, reason: `Cererea e „${r.status}”, pasul nu se mai poate face.` };
  if (event === "accept" && actor.suspended) return { ok: false, reason: "Contul e suspendat după prea multe livrări neconfirmate." };
  if (event === "accept" && r.receiver === actor.handle) return { ok: false, reason: "Nu poți accepta propria cerere." };
  if (event === "accept" && isExpired(r, now)) return { ok: false, reason: "Cererea a expirat." };
  if (rule.ownerOnly) {
    const owner = rule.role === "giver" ? r.giver : r.receiver;
    if (owner !== actor.handle) return { ok: false, reason: rule.role === "giver" ? "Altcineva se ocupă de cererea asta." : "Nu e cererea ta." };
  }
  return { ok: true };
}

/** Aplică pasul și întoarce cererea nouă (nu o modifică pe cea veche). Aruncă eroare dacă nu se poate. */
export function apply(r: Request, event: LifecycleEvent, actor: Actor, now: Date = new Date(), note?: string): Request {
  const check = can(r, event, actor, now);
  if (!check.ok) throw new Error(check.reason);
  const giver = event === "accept" ? actor.handle : r.giver;
  const entry: HistoryEntry = { at: now.toISOString(), event, by: actor.handle, ...(giver ? { giver } : {}), ...(note ? { note } : {}) };
  const next: Request = { ...r, status: RULES[event].to, history: [...r.history, entry] };
  if (event === "accept") next.giver = actor.handle;
  if (event === "cancel" || event === "reopen") delete next.giver;
  return next;
}

/** Pașii pe care îi poate face omul ăsta acum, în ordinea în care apar ca butoane. */
export function availableEvents(r: Request, actor: Actor, now: Date = new Date()): LifecycleEvent[] {
  return (Object.keys(RULES) as LifecycleEvent[]).filter((e) => can(r, e, actor, now).ok);
}

/** O cerere nouă, cu primul rând în istoric. */
export function createRequest(data: Omit<Request, "status" | "history" | "giver">, now: Date = new Date()): Request {
  return { ...data, status: "deschis", history: [{ at: now.toISOString(), event: "create", by: data.receiver }] };
}

/** Pentru seed: duce o cerere nouă până la etapa dată, cu istoric plauzibil (pași la 20 de minute). */
export function advanceTo(r: Request, stage: State, giver: string | undefined, start: Date): Request {
  const path: Record<State, LifecycleEvent[]> = {
    deschis: [],
    acceptat: ["accept"],
    livrat: ["accept", "deliver"],
    confirmat: ["accept", "deliver", "confirm"],
    contestat: ["accept", "deliver", "dispute"],
  };
  let cur = r;
  path[stage].forEach((e, i) => {
    const role = RULES[e].role;
    if (role === "giver" && !giver) throw new Error(`Seed: cererea „${r.title}” are nevoie de un giver pentru etapa ${stage}.`);
    cur = apply(cur, e, { handle: role === "giver" ? giver! : r.receiver, role }, new Date(start.getTime() + (i + 1) * 20 * 60_000));
  });
  return cur;
}

/** Textul unui rând din istoric, pentru cronologia din UI. */
export function describeEntry(e: HistoryEntry, name: (handle: string) => string): string {
  const who = name(e.by);
  switch (e.event) {
    case "create":
      return `${who} a cerut`;
    case "accept":
      return `${who} a acceptat`;
    case "cancel":
      return `${who} a renunțat`;
    case "deliver":
      return `${who} a marcat livrat`;
    case "confirm":
      return `${who} a confirmat primirea`;
    case "dispute":
      return `${who}: „nu am primit”`;
    case "reopen":
      return `${who} a cerut din nou`;
  }
}
