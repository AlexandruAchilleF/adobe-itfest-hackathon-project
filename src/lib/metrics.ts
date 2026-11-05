// Cronometrul procesului: din istoricul fiecărei cereri, cât a stat în fiecare stare,
// pe cine a așteptat, unde se blochează și cât durează de la cerere la încheiere.
// Durerea „în cifre” vine din date, nu din AI. Logică pură, cu teste în tests/metrics.test.ts.

import { type FlowDef, type Request, stateOf, toneOf, waitingOn } from "./flow";

export interface Segment {
  state: string;
  /** rolurile de la care se aștepta pasul următor */
  waitingOn: string[];
  /** omul legat de cerere în rolul așteptat, dacă există */
  who?: string;
  start: string;
  end: string;
  minutes: number;
  /** true = cererea e încă în starea asta */
  current: boolean;
}

const minutesBetween = (a: string, b: Date | string) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 60_000);
const isFinal = (flow: FlowDef, state: string) => ["done", "failed"].includes(stateOf(flow, state).tone) && !flow.transitions.some((t) => t.from.includes(state));

/** Bucățile de timp ale unei cereri: o bucată pe fiecare stare prin care a trecut. */
export function segments(flow: FlowDef, r: Request, now: Date = new Date()): Segment[] {
  const out: Segment[] = [];
  r.history.forEach((h, i) => {
    const next = r.history[i + 1];
    if (!next && isFinal(flow, h.to)) return;
    const roles = waitingOn(flow, { ...r, status: h.to });
    const actors = next ? h.actors : r.actors;
    const who = roles.map((role) => (role === flow.requester ? r.requester : actors[role])).find(Boolean);
    const end = next ? next.at : now.toISOString();
    out.push({ state: h.to, waitingOn: roles, ...(who ? { who } : {}), start: h.at, end, minutes: minutesBetween(h.at, end), current: !next });
  });
  return out;
}

/** De la cerere până la primul pas cu reușită (tone done); null dacă nu s-a încheiat. */
export function cycleMinutes(flow: FlowDef, r: Request): number | null {
  const done = r.history.find((h) => stateOf(flow, h.to).tone === "done");
  return done ? minutesBetween(r.history[0].at, done.at) : null;
}

export interface StateTime {
  state: string;
  label: string;
  waitingOn: string[];
  /** de câte ori a trecut o cerere prin starea asta */
  visits: number;
  avgMinutes: number;
  totalMinutes: number;
}

export interface ProcessStats {
  byState: StateTime[];
  /** starea în care se pierde cel mai mult timp în total */
  bottleneck: StateTime | null;
  avgCycleMinutes: number | null;
  closed: number;
  /** câte cereri au fost întoarse măcar o dată (tone returned) */
  returned: number;
  /** cererile deschise, cele care așteaptă cel mai mult primele */
  waiting: Array<{ id: string; title: string; state: string; minutes: number; waitingOn: string[]; who?: string }>;
}

export function processStats(flow: FlowDef, requests: Array<{ id: string; data: Request }>, now: Date = new Date()): ProcessStats {
  const acc = new Map<string, { visits: number; total: number }>();
  const waiting: ProcessStats["waiting"] = [];
  for (const { id, data } of requests) {
    for (const seg of segments(flow, data, now)) {
      const a = acc.get(seg.state) ?? { visits: 0, total: 0 };
      acc.set(seg.state, { visits: a.visits + 1, total: a.total + seg.minutes });
      if (seg.current) waiting.push({ id, title: data.title, state: seg.state, minutes: seg.minutes, waitingOn: seg.waitingOn, ...(seg.who ? { who: seg.who } : {}) });
    }
  }
  const byState = flow.states
    .filter((s) => acc.has(s.id))
    .map((s) => {
      const a = acc.get(s.id)!;
      return { state: s.id, label: s.label, waitingOn: waitingOn(flow, { status: s.id } as Request), visits: a.visits, avgMinutes: a.total / a.visits, totalMinutes: a.total };
    });
  const cycles = requests.map((r) => cycleMinutes(flow, r.data)).filter((m): m is number => m !== null);
  return {
    byState,
    bottleneck: byState.reduce<StateTime | null>((best, s) => (!best || s.totalMinutes > best.totalMinutes ? s : best), null),
    avgCycleMinutes: cycles.length ? cycles.reduce((a, b) => a + b, 0) / cycles.length : null,
    closed: cycles.length,
    returned: requests.filter((r) => r.data.history.some((h) => stateOf(flow, h.to).tone === "returned")).length,
    waiting: waiting.filter((w) => toneOf(flow, { status: w.state }) !== "done").sort((a, b) => b.minutes - a.minutes),
  };
}

/** „45 min”, „3 h 10 min”, „2 zile 4 h”. */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "zi" : "zile"}${h % 24 ? ` ${h % 24} h` : ""}`;
}

/** Costul lunar al muncii manuale, din cifre spuse de oameni (nu presupuse): cereri/lună × minute/cerere × lei/oră. */
export function monthlyCost(requestsPerMonth: number, minutesPerRequest: number, hourlyRate: number): { hours: number; cost: number } {
  const hours = (Math.max(0, requestsPerMonth) * Math.max(0, minutesPerRequest)) / 60;
  return { hours: Math.round(hours * 10) / 10, cost: Math.round(hours * Math.max(0, hourlyRate)) };
}
