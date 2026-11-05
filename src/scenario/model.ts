// Modelele derivate din scenariul activ: scheme Zod, colecții cu seed, scorul de potrivire.
// Nu conține nimic de domeniu: totul vine din `scenario` (./config.ts).

import { z } from "zod";
import { advanceTo, createRequest, type Request, RequestBase } from "../lib/lifecycle";
import { outboxFor } from "../lib/notify";
import { Report, seedReports } from "../lib/reports";
import { type Collection, createCollection } from "../lib/store";
import { distanceKm, type LatLng } from "../modules/map/geo";
import { scenario } from "./config";
import type { Category, PersonSeed, RoleId, Scenario } from "./types";

export const Person = z.object({
  handle: z.string(),
  name: z.string(),
  role: z.enum(["giver", "receiver"]),
  phone: z.string(),
  area: z.string(),
});
export type Person = z.infer<typeof Person>;

/** Schema cererii, cu categoriile scenariului (AI-ul nu poate inventa altele). */
export function requestSchema(s: Scenario) {
  const ids = s.categories.map((c) => c.id) as [string, ...string[]];
  return RequestBase.extend({ category: z.enum(ids) });
}

/** Seed-ul de cereri, cu istoric generat de ciclul real (nu scris de mână). */
export function buildRequestSeed(s: Scenario, now: Date = new Date()): Request[] {
  return s.seed.requests.map((r, i) => {
    const start = new Date(now.getTime() - (s.seed.requests.length - i) * 3 * 3600_000);
    const base = createRequest(
      {
        title: r.title,
        category: r.category,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        urgency: r.urgency,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        receiver: r.receiver,
        ...(r.expiresInHours ? { expiresAt: new Date(now.getTime() + r.expiresInHours * 3600_000).toISOString() } : {}),
      },
      start,
    );
    return advanceTo(base, r.stage ?? "deschis", r.giver, start);
  });
}

/** Verificări pentru un scenariu nou: prind greșelile de copy-paste înainte de demo. */
export function validateScenario(s: Scenario): string[] {
  const problems: string[] = [];
  const handles = new Map(s.seed.people.map((p) => [p.handle, p]));
  const cats = new Set(s.categories.map((c) => c.id));
  if (handles.size !== s.seed.people.length) problems.push("Două persoane au același handle.");
  for (const role of ["giver", "receiver"] as RoleId[]) {
    if (!s.seed.people.some((p) => p.role === role)) problems.push(`Nicio persoană cu rolul ${s.roles[role].label} în seed.`);
  }
  s.seed.requests.forEach((r) => {
    if (!cats.has(r.category)) problems.push(`„${r.title}”: categoria ${r.category} nu există.`);
    if (handles.get(r.receiver)?.role !== "receiver") problems.push(`„${r.title}”: ${r.receiver} nu are rolul ${s.roles.receiver.label}.`);
    if (r.giver && handles.get(r.giver)?.role !== "giver") problems.push(`„${r.title}”: ${r.giver} nu are rolul ${s.roles.giver.label}.`);
    if (r.stage && r.stage !== "deschis" && !r.giver) problems.push(`„${r.title}”: etapa ${r.stage} cere un giver.`);
    if (r.urgency < 1 || r.urgency > 5) problems.push(`„${r.title}”: urgența trebuie să fie 1–5.`);
  });
  const report = new Set(s.reports.types.map((t) => t.id));
  s.seed.reports.forEach((r) => !report.has(r.type) && problems.push(`Raportul „${r.note}”: tipul ${r.type} nu există.`));
  if (s.ranks[0]?.min !== 0) problems.push("Primul rang trebuie să înceapă de la 0 puncte.");
  s.ranks.forEach((r, i) => i && r.min <= s.ranks[i - 1].min && problems.push(`Rangul ${r.name} trebuie să ceară mai multe puncte decât ${s.ranks[i - 1].name}.`));
  if (s.reports.enabled && s.reports.types.length === 0) problems.push("Raportarea e pornită, dar nu are tipuri.");
  return problems;
}

const FALLBACK: Category = { id: "altele", label: "altele", color: "#94a3b8", icon: "📦" };
export const reportTypeOf = (id: string) => scenario.reports.types.find((t) => t.id === id) ?? { id, label: id, icon: "📍", color: "#94a3b8" };
export const categoryOf = (id: string): Category => scenario.categories.find((c) => c.id === id) ?? scenario.categories.at(-1) ?? FALLBACK;

export const RequestSchema = requestSchema(scenario);
export const requests: Collection<Request> = createCollection(`${scenario.id}:cereri`, RequestSchema as z.ZodType<Request>, buildRequestSeed(scenario));
export const reports: Collection<Report> = createCollection(`${scenario.id}:rapoarte`, Report, seedReports(scenario.seed.reports));
export const outbox = outboxFor(scenario.id);
export const people: Collection<Person> = createCollection(`${scenario.id}:oameni`, Person, scenario.seed.people as PersonSeed[]);

/** Scor determinist de potrivire (0–100): urgență + apropiere. AI-ul doar îl explică. */
export function baselineScore(r: Pick<Request, "urgency" | "status" | "lat" | "lng">, origin: LatLng | null): number {
  if (r.status !== "deschis") return 0;
  const urgency = (Math.min(5, Math.max(1, r.urgency)) / 5) * 60;
  const proximity = origin ? Math.max(0, 40 - distanceKm(origin, r) * 4) : 20;
  return Math.round(urgency + proximity);
}
