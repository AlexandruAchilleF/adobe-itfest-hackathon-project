// Ce mai trebuie să știm de la om. Lista o decide codul; AI-ul propune doar variantele.
// Culorile și mascota nu se întreabă: vin din marcă.
import type { Anatomy } from "./anatomy";
import type { Brand } from "./brand";

export type FormatId = "post" | "story" | "hero";

export interface Answers {
  product?: string;
  offer?: string;
  price?: string;
  deadline?: string;
  cta?: string;
  formats?: FormatId[];
}

export interface Question {
  id: "product" | "offer" | "cta" | "formats";
  text: string;
  options: string[];
  free: boolean;
}

const OFFER_OPTIONS = ["-10% azi", "-20% azi", "2 la preț de 1"];

export function questionsFor(a: Anatomy, _b: Brand, ans: Answers): Question[] {
  const has = (role: Anatomy["zones"][number]["role"]) => a.zones.some((z) => z.role === role);
  const questions: Question[] = [];
  if (!ans.product) questions.push({ id: "product", text: "Ce promovezi?", options: a.suggestions.product, free: true });
  if (has("offer") && !ans.offer) questions.push({ id: "offer", text: "Care e oferta?", options: OFFER_OPTIONS, free: true });
  if (has("cta") && !ans.cta) questions.push({ id: "cta", text: "Ce scrie pe buton?", options: a.suggestions.cta, free: true });
  if (!ans.formats?.length) {
    questions.push({ id: "formats", text: "Ce formate vrei în kit?", options: a.kind === "section" ? ["post", "story", "hero"] : ["post", "story"], free: false });
  }
  return questions;
}
