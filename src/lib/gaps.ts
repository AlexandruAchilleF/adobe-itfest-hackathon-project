// Ce mai trebuie să știm de la om. Lista o decide codul; AI-ul propune doar variantele.
// Culorile și mascota nu se întreabă: vin din marcă.
import type { Anatomy } from "./anatomy";
import type { Brand } from "./brand";

export type FormatId = "post" | "story" | "hero";

export interface Answers {
  product?: string;
  audience?: string;
  goal?: string;
  offer?: string;
  price?: string;
  deadline?: string;
  cta?: string;
  formats?: FormatId[];
}

export interface Question {
  id: "product" | "audience" | "goal" | "offer" | "cta" | "formats";
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

/** Brief local: contextul paginii sugerează, omul alege. Fără oferte inventate. */
export function briefQuestions(ruleIds: string[], pageTitle: string): Question[] {
  const questions: Question[] = [
    { id: "product", text: "Ce produs sau serviciu promovezi?", options: pageTitle.trim() ? [pageTitle.trim().slice(0, 100)] : [], free: true },
    { id: "audience", text: "Cui te adresezi?", options: ["Clienți noi", "Clienți existenți"], free: true },
    { id: "goal", text: "Ce vrei să obții?", options: /parc|hotel|cazare|turism|pensiune|park/i.test(pageTitle) ? ["Rezervări", "Cereri de informații", "Vizibilitate"] : ["Comenzi", "Cereri de ofertă", "Vizibilitate"], free: true },
  ];
  if (ruleIds.some((id) => ["link-vag", "fara-nume", "buton-fals"].includes(id))) {
    questions.push({ id: "cta", text: "Ce acțiune vrei pe buton?", options: ["Comandă", "Cere o ofertă", "Vezi produsul"], free: true });
  }
  return questions;
}
