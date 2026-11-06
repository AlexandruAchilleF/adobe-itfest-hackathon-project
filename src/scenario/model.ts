// Modelele derivate din scenariul activ: scheme Zod, colecții cu seed, scorul de potrivire.
// Nu conține nimic de domeniu: totul vine din `scenario` (./config.ts).

import { z } from "zod";
import { advance, createRequest, type Request, RequestBase, toneOf, validateFlow } from "../lib/flow";
import { outboxFor } from "../lib/notify";
import { Report, seedReports } from "../lib/reports";
import { type Collection, createCollection } from "../lib/store";
import { distanceKm, type LatLng } from "../modules/map/geo";
import { scenario } from "./config";
import type { Category, Scenario } from "./types";

export const Person = z.object({
  handle: z.string(),
  name: z.string(),
  role: z.string(),
  phone: z.string(),
  area: z.string(),
});
export type Person = z.infer<typeof Person>;

/** Schema cererii, cu categoriile și stările scenariului (AI-ul nu poate inventa altele). */
export function requestSchema(s: Scenario) {
  const cats = s.categories.map((c) => c.id) as [string, ...string[]];
  const states = s.flow.states.map((st) => st.id) as [string, ...string[]];
  return RequestBase.extend({ category: z.enum(cats), status: z.enum(states) });
}

/** Seed-ul de cereri, cu istoric generat de fluxul real (nu scris de mână). */
export function buildRequestSeed(s: Scenario, now: Date = new Date()): Request[] {
  const roleOf = (h: string) => s.seed.people.find((p) => p.handle === h)?.role ?? "?";
  return s.seed.requests.map((r, i) => {
    // implicit, cererile din seed sunt eșalonate pe ultimele ore (câte una pe oră), ca „acum X” să pară o zi obișnuită
    const start = new Date(now.getTime() - (r.hoursAgo ?? s.seed.requests.length - i) * 3600_000);
    const base = createRequest(
      s.flow,
      {
        title: r.title,
        category: r.category,
        description: r.description,
        quantity: r.quantity,
        unit: r.unit,
        urgency: r.urgency,
        address: r.address ?? "",
        lat: r.lat ?? s.app.center.lat,
        lng: r.lng ?? s.app.center.lng,
        ...(r.extra ? { extra: r.extra } : {}),
        ...(r.expiresInHours ? { expiresAt: new Date(now.getTime() + r.expiresInHours * 3600_000).toISOString() } : {}),
      },
      r.requester,
      start,
    );
    return advance(s.flow, base, r.steps ?? [], roleOf, start);
  });
}

/** Cererea creată dintr-un raport de pe telefon (reports.toRequest): locul și ora vin din telefon, nu din AI. */
export function requestFromReport(s: Scenario, r: Pick<Report, "type" | "note" | "lat" | "lng" | "at" | "approx">, requester: string): Request {
  const type = s.reports.types.find((t) => t.id === r.type);
  const label = type?.label ?? r.type;
  return createRequest(
    s.flow,
    {
      title: r.note ? `${label}: ${r.note}`.slice(0, 80) : label,
      category: r.type,
      description: r.note || label,
      quantity: 1,
      unit: s.request.singular,
      urgency: Math.min(5, Math.max(1, type?.urgency ?? 3)),
      address: r.approx ? "fără GPS (centrul orașului)" : `GPS ${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`,
      lat: r.lat,
      lng: r.lng,
    },
    requester,
    new Date(r.at),
  );
}

/** Verificări pentru un scenariu nou: prind greșelile de copy-paste înainte de demo. */
export function validateScenario(s: Scenario): string[] {
  const roles = Object.keys(s.roles);
  const problems = validateFlow(s.flow, roles);
  const people = new Map(s.seed.people.map((p) => [p.handle, p]));
  const cats = new Set(s.categories.map((c) => c.id));
  if (people.size !== s.seed.people.length) problems.push("Două persoane au același handle.");
  s.seed.people.forEach((p) => !roles.includes(p.role) && problems.push(`${p.name}: rolul ${p.role} nu există.`));
  for (const role of roles) if (!s.seed.people.some((p) => p.role === role)) problems.push(`Nicio persoană cu rolul ${s.roles[role].label} în seed.`);
  s.seed.requests.forEach((r) => {
    if (!cats.has(r.category)) problems.push(`„${r.title}”: categoria ${r.category} nu există.`);
    if (people.get(r.requester)?.role !== s.flow.requester) problems.push(`„${r.title}”: ${r.requester} nu are rolul ${s.roles[s.flow.requester]?.label}.`);
    if (r.urgency < 1 || r.urgency > 5) problems.push(`„${r.title}”: urgența trebuie să fie 1–5.`);
  });
  // pașii din seed trebuie să fie posibili: îi rulăm prin fluxul real
  try {
    buildRequestSeed(s);
  } catch (err) {
    problems.push(`Seed: ${(err as Error).message}`);
  }
  if (s.features.gamification && !roles.includes(s.points.role)) problems.push(`Punctele merg la rolul ${s.points.role}, care nu există.`);
  const report = new Set(s.reports.types.map((t) => t.id));
  s.seed.reports.forEach((r) => !report.has(r.type) && problems.push(`Raportul „${r.note}”: tipul ${r.type} nu există.`));
  if (s.ranks[0]?.min !== 0) problems.push("Primul rang trebuie să înceapă de la 0 puncte.");
  s.ranks.forEach((r, i) => i && r.min <= s.ranks[i - 1].min && problems.push(`Rangul ${r.name} trebuie să ceară mai multe puncte decât ${s.ranks[i - 1].name}.`));
  if (s.reports.enabled && s.reports.types.length === 0) problems.push("Raportarea e pornită, dar nu are tipuri.");
  if (s.reports.toRequest) s.reports.types.forEach((t) => !cats.has(t.id) && problems.push(`Raportul „${t.label}” devine cerere, dar categoria ${t.id} nu există.`));
  return problems;
}

const FALLBACK: Category = { id: "altele", label: "altele", color: "#94a3b8", icon: "📦" };
export const categoryOf = (id: string): Category => scenario.categories.find((c) => c.id === id) ?? scenario.categories.at(-1) ?? FALLBACK;
export const reportTypeOf = (id: string) => scenario.reports.types.find((t) => t.id === id) ?? { id, label: id, icon: "📍", color: "#94a3b8" };
export const roleOf = (id: string) => scenario.roles[id] ?? { label: id, plural: id, icon: "👤", pitch: "" };

export const RequestSchema = requestSchema(scenario);
export const requests: Collection<Request> = createCollection(`${scenario.id}:cereri`, RequestSchema as z.ZodType<Request>, buildRequestSeed(scenario));
export const reports: Collection<Report> = createCollection(`${scenario.id}:rapoarte`, Report, seedReports(scenario.seed.reports));
export const outbox = outboxFor(scenario.id);
export const people: Collection<Person> = createCollection(`${scenario.id}:oameni`, Person, scenario.seed.people);

/** Scor determinist de potrivire (0–100): urgență + apropiere. AI-ul doar îl explică. */
export function baselineScore(s: Pick<Scenario, "flow">, r: Pick<Request, "urgency" | "status" | "lat" | "lng">, origin: LatLng | null): number {
  if (toneOf(s.flow, r) !== "open") return 0;
  const urgency = (Math.min(5, Math.max(1, r.urgency)) / 5) * 60;
  const proximity = origin ? Math.max(0, 40 - distanceKm(origin, r) * 4) : 20;
  return Math.round(urgency + proximity);
}
