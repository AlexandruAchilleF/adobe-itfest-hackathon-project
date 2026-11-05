// Gamificarea, calculată de cod din istoricul cererilor (logică pură, cu teste în tests/).
// AI-ul nu dă puncte: cel mult propune urgența unei cereri, pe care omul o verifică.
//
//   puncte(cerere) = round((base + perUnit × min(cantitate, maxUnits)) × urgency[urgență])
//   puncte(om)     = Σ cererile confirmate de cel care a primit − disputePenalty × „nu am primit”
//
// Punctele vin doar după confirmarea celui care a primit. „Am livrat” singur nu aduce nimic.

import type { Rank, Scenario } from "../scenario/types";
import type { Request } from "./lifecycle";

type PointsConfig = Scenario["points"];

export function pointsFor(r: Pick<Request, "quantity" | "urgency">, cfg: PointsConfig): number {
  const units = Math.max(0, Math.min(r.quantity, cfg.maxUnits));
  const u = Math.min(5, Math.max(1, Math.round(r.urgency)));
  return Math.round((cfg.base + cfg.perUnit * units) * cfg.urgency[u - 1]);
}

export interface GiverStats {
  handle: string;
  points: number;
  /** livrări confirmate de cel care a primit */
  confirmed: number;
  /** unități din livrările confirmate */
  units: number;
  /** livrate, așteaptă confirmarea */
  pending: number;
  /** acceptate, încă nelivrate */
  active: number;
  disputes: number;
  suspended: boolean;
}

/** Ultimul pas din istoric care aparține omului ăstuia ca giver. */
const events = (requests: Request[], handle: string) =>
  requests.flatMap((r) => r.history.filter((h) => h.giver === handle).map((h) => ({ r, h })));

export function giverStats(handle: string, requests: Request[], s: Pick<Scenario, "points" | "trust">): GiverStats {
  const mine = events(requests, handle);
  const confirmed = mine.filter(({ h }) => h.event === "confirm");
  const disputes = mine.filter(({ h }) => h.event === "dispute").length;
  const earned = confirmed.reduce((sum, { r }) => sum + pointsFor(r, s.points), 0);
  return {
    handle,
    points: Math.max(0, earned - disputes * s.points.disputePenalty),
    confirmed: confirmed.length,
    units: confirmed.reduce((sum, { r }) => sum + r.quantity, 0),
    pending: requests.filter((r) => r.giver === handle && r.status === "livrat").length,
    active: requests.filter((r) => r.giver === handle && r.status === "acceptat").length,
    disputes,
    suspended: isSuspended(disputes, s.trust),
  };
}

export function isSuspended(disputes: number, trust: Scenario["trust"]): boolean {
  return disputes >= trust.suspendAfterDisputes;
}

export interface RankInfo {
  rank: Rank;
  next: Rank | null;
  /** 0..1, cât din drumul spre rangul următor */
  progress: number;
  toNext: number;
}

export function rankFor(points: number, ranks: Rank[]): RankInfo {
  const sorted = [...ranks].sort((a, b) => a.min - b.min);
  let i = 0;
  while (i + 1 < sorted.length && points >= sorted[i + 1].min) i++;
  const rank = sorted[i];
  const next = sorted[i + 1] ?? null;
  if (!next) return { rank, next, progress: 1, toNext: 0 };
  return { rank, next, progress: (points - rank.min) / (next.min - rank.min), toNext: next.min - points };
}

export interface LeaderRow extends GiverStats {
  name: string;
  place: number;
  rank: Rank;
}

/** Clasamentul celor care dau. La egalitate de puncte: mai multe livrări, apoi numele. */
export function leaderboard(givers: Array<{ handle: string; name: string }>, requests: Request[], s: Pick<Scenario, "points" | "trust" | "ranks">): LeaderRow[] {
  return givers
    .map((g) => ({ ...giverStats(g.handle, requests, s), name: g.name }))
    .sort((a, b) => b.points - a.points || b.confirmed - a.confirmed || a.name.localeCompare(b.name, "ro"))
    .map((row, i) => ({ ...row, place: i + 1, rank: rankFor(row.points, s.ranks).rank }));
}

export interface Impact {
  /** unități ajunse și confirmate */
  units: number;
  confirmed: number;
  open: number;
  inProgress: number;
  disputed: number;
  /** câți oameni diferiți au ajutat (cu cel puțin o confirmare) */
  helpers: number;
}

/** Cifrele de impact de pe prima pagină și din pitch. */
export function impact(requests: Request[]): Impact {
  const done = requests.filter((r) => r.status === "confirmat");
  return {
    units: done.reduce((s, r) => s + r.quantity, 0),
    confirmed: done.length,
    open: requests.filter((r) => r.status === "deschis").length,
    inProgress: requests.filter((r) => r.status === "acceptat" || r.status === "livrat").length,
    disputed: requests.filter((r) => r.status === "contestat").length,
    helpers: new Set(done.map((r) => r.giver).filter(Boolean)).size,
  };
}

/** Ce s-a schimbat după o confirmare: puncte câștigate și, dacă e cazul, rangul nou. */
export function confirmationReward(before: Request[], after: Request[], handle: string, s: Pick<Scenario, "points" | "trust" | "ranks">) {
  const a = giverStats(handle, before, s).points;
  const b = giverStats(handle, after, s).points;
  const ra = rankFor(a, s.ranks).rank;
  const rb = rankFor(b, s.ranks).rank;
  return { gained: b - a, total: b, rankUp: rb.name !== ra.name ? rb : null };
}
