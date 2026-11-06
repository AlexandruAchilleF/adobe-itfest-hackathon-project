// Rapoarte rapide la locația curentă, cu oră: „ce vezi lângă tine, acum”.
// Logică pură (vechime, estompare, expirare); stocarea e o colecție obișnuită din store,
// iar LiveProvider (src/lib/live.tsx) anunță celelalte telefoane când apare un raport nou.

import { z } from "zod";
import type { ReportSeed, Scenario } from "../scenario/types";

export const Report = z.object({
  type: z.string(),
  note: z.string(),
  lat: z.number(),
  lng: z.number(),
  at: z.string(),
  /** handle-ul celui care a raportat, sau „anonim” */
  by: z.string(),
  /** true = n-am avut GPS, am pus centrul orașului */
  approx: z.boolean(),
  /** cererea creată din raport (reports.toRequest) */
  requestId: z.string().optional(),
});
export type Report = z.infer<typeof Report>;

type ReportCfg = Pick<Scenario["reports"], "freshMinutes" | "expireMinutes">;

export const ageMinutes = (r: Pick<Report, "at">, now: Date = new Date()) => Math.max(0, (now.getTime() - new Date(r.at).getTime()) / 60_000);

export function ageLabel(minutes: number): string {
  if (minutes < 1) return "acum";
  if (minutes < 60) return `acum ${Math.floor(minutes)} min`;
  if (minutes < 24 * 60) return `acum ${Math.floor(minutes / 60)} h`;
  const days = Math.floor(minutes / (24 * 60));
  return days === 1 ? "ieri" : `acum ${days} zile`;
}

/** 1 = proaspăt; scade liniar până la 0.25 la expirare; 0 = expirat (nu se mai arată). */
export function freshness(r: Pick<Report, "at">, cfg: ReportCfg, now: Date = new Date()): number {
  const age = ageMinutes(r, now);
  if (age >= cfg.expireMinutes) return 0;
  if (age <= cfg.freshMinutes) return 1;
  return 1 - 0.75 * ((age - cfg.freshMinutes) / (cfg.expireMinutes - cfg.freshMinutes));
}

/** Rapoartele care încă se văd, cele mai noi primele. */
export function visibleReports<T extends { data: Report }>(list: T[], cfg: ReportCfg, now: Date = new Date()): T[] {
  return list.filter((r) => freshness(r.data, cfg, now) > 0).sort((a, b) => b.data.at.localeCompare(a.data.at));
}

/** Câte rapoarte de fiecare tip în ultimele `minutes` minute (pentru un rezumat pe hartă). */
export function countByType(list: Report[], minutes: number, now: Date = new Date()): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of list) if (ageMinutes(r, now) <= minutes) out[r.type] = (out[r.type] ?? 0) + 1;
  return out;
}

export function seedReports(seed: ReportSeed[], now: Date = new Date()): Report[] {
  return seed.map((r) => ({ type: r.type, note: r.note, lat: r.lat, lng: r.lng, at: new Date(now.getTime() - r.minutesAgo * 60_000).toISOString(), by: "anonim", approx: false }));
}
