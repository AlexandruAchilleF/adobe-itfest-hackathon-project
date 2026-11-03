// Domeniul exemplu pentru rețetele „Hartă" și „Asistent": nevoi din cartier (adăposturi,
// cantine, școli) și oameni care pot ajuta. E forma câștigătorului ITFest (ResourceMe).
// La hackathon schimbați schema și datele de seed cu domeniul temei voastre.

import { z } from "zod";
import { createCollection } from "../lib/store";
import { distanceKm, type LatLng } from "../modules/map/geo";

export const CATEGORIES = ["hrană", "haine", "adăpost", "educație", "sănătate", "voluntariat", "altele"] as const;
export const STATUSES = ["deschis", "în lucru", "rezolvat"] as const;

export const CATEGORY_COLORS: Record<(typeof CATEGORIES)[number], string> = {
  hrană: "#f59e0b",
  haine: "#a855f7",
  adăpost: "#ef4444",
  educație: "#38bdf8",
  sănătate: "#22c55e",
  voluntariat: "#ec4899",
  altele: "#94a3b8",
};

export const Need = z.object({
  title: z.string(),
  category: z.enum(CATEGORIES),
  description: z.string(),
  quantity: z.string().describe("ce și cât, ex: 20 de pături, 5 voluntari sâmbătă"),
  urgency: z.number().describe("1 (poate aștepta) … 5 (azi)"),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  status: z.enum(STATUSES),
  contact: z.string(),
});
export type Need = z.infer<typeof Need>;

/** Date de seed realiste (fictive), ca demo-ul să arate plin din prima secundă. */
export const seedNeeds: Need[] = [
  { title: "Pături și saci de dormit", category: "adăpost", description: "Adăpostul de noapte e plin în weekend; lipsesc pături.", quantity: "30 de pături", urgency: 5, address: "Zona Gara de Nord, București", lat: 44.4466, lng: 26.0731, status: "deschis", contact: "0722 000 001" },
  { title: "Voluntari la împărțirea mesei", category: "voluntariat", description: "Cantina socială servește 200 de porții la prânz.", quantity: "5 voluntari, sâmbătă 11–14", urgency: 4, address: "Calea Moșilor, București", lat: 44.442, lng: 26.113, status: "deschis", contact: "0722 000 002" },
  { title: "Alimente neperisabile", category: "hrană", description: "Pachete pentru 40 de familii înainte de sărbători.", quantity: "40 de pachete", urgency: 4, address: "Pantelimon, București", lat: 44.444, lng: 26.165, status: "în lucru", contact: "0722 000 003" },
  { title: "Meditații la matematică", category: "educație", description: "Elevi de clasa a VIII-a se pregătesc pentru Evaluarea Națională.", quantity: "2 ore/săptămână", urgency: 3, address: "Titan, București", lat: 44.416, lng: 26.173, status: "deschis", contact: "0722 000 004" },
  { title: "Haine de iarnă pentru copii", category: "haine", description: "Geci și ghete, mărimi 110–146.", quantity: "25 de seturi", urgency: 4, address: "Ferentari, București", lat: 44.4048, lng: 26.0742, status: "deschis", contact: "0722 000 005" },
  { title: "Însoțire la controale medicale", category: "sănătate", description: "Vârstnici singuri care au nevoie de cineva cu mașina.", quantity: "3 drumuri pe săptămână", urgency: 3, address: "Berceni, București", lat: 44.382, lng: 26.12, status: "deschis", contact: "0722 000 006" },
  { title: "Cărți pentru biblioteca de cartier", category: "educație", description: "Raft nou pentru literatură pentru adolescenți.", quantity: "100 de cărți", urgency: 2, address: "Drumul Taberei, București", lat: 44.4235, lng: 26.03, status: "deschis", contact: "0722 000 007" },
  { title: "Reparații la centrul de zi", category: "voluntariat", description: "Vopsit două săli și montat rafturi.", quantity: "4 voluntari, o zi", urgency: 2, address: "Colentina, București", lat: 44.46, lng: 26.135, status: "rezolvat", contact: "0722 000 008" },
];

export const needs = createCollection("nevoi", Need, seedNeeds);

/** Scor determinist de potrivire (0–100): urgență + apropiere. Baza peste care AI-ul explică. */
export function baselineScore(need: Need, origin: LatLng | null): number {
  const urgency = (need.urgency / 5) * 60;
  const proximity = origin ? Math.max(0, 40 - distanceKm(origin, need) * 4) : 20;
  return Math.round(need.status === "rezolvat" ? 0 : urgency + proximity);
}
