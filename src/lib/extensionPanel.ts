// Panoul Spire din extensie (/nou?din=extensie): textele, estimările și mesajele spre extensie.
// Logică pură, fără DOM și fără React; componenta e în src/modules/extension/ExtensionPanel.tsx.
// Ce spune Spire după scanare se calculează din date (alegerile și numărătorile), nu de AI.
import type { CampaignKind, CampaignPick } from "./campaign";
import type { PageElement, PageSummary } from "./extensionBridge";

/** Cât stă Spire cu lupa, cel puțin, chiar dacă pagina răspunde mai repede (ms). */
export const SCAN_MIN_MS = 1800;
/** După atât timp fără spire:page, Spire spune că nu primește nimic (ms). */
export const SCAN_TIMEOUT_MS = 5000;

/** Cât mai așteptăm înainte să arătăm rezultatul, ca lupa să stea cel puțin SCAN_MIN_MS. */
export function revealDelay(startedAt: number, now: number): number {
  return Math.max(0, SCAN_MIN_MS - (now - startedAt));
}

const MIN_W = 320;
const MIN_H = 480;
// Plafonul: un wrapper cât toată pagina (ex. 9000 px înălțime) nu trebuie să umfle ecranul.
const MAX_W = 2560;
const MAX_H = 1600;

/**
 * Viewport-ul paginii gazdă, estimat din casete (contractul nu îl trimite încă).
 * w = cea mai mare margine dreaptă; h = cea mai mare margine de jos a elementelor din primul ecran.
 * De înlocuit cu `page.viewport` când B2 îl adaugă în PageSummary.
 */
export function estimateViewport(elements: PageElement[]): { w: number; h: number } {
  let right = 0;
  let bottom = 0;
  for (const e of elements) {
    right = Math.max(right, e.box.x + e.box.w);
    if (e.inFirstScreen) bottom = Math.max(bottom, e.box.y + e.box.h);
  }
  const fit = (v: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, v)));
  return { w: fit(right, MIN_W, MAX_W), h: fit(bottom, MIN_H, MAX_H) };
}

/** Rolul ales, cu articol („hero-ul”, „oferta”), cum îl spune Spire în propoziție. */
export const KIND_LABEL: Record<CampaignKind, string> = {
  hero: "hero-ul",
  offer: "oferta",
  mascot: "mascota",
  cta: "butonul",
  badge: "insigna",
};

/** Pluralul rolului, pentru „2 oferte”. */
const KIND_PLURAL: Record<CampaignKind, string> = {
  hero: "hero-uri",
  offer: "oferte",
  mascot: "mascote",
  cta: "butoane",
  badge: "insigne",
};

/**
 * Numărul cu substantivul la forma corectă: „1 buton”, „2 butoane”, „20 de butoane”.
 * „de” apare când ultimele două cifre fac 0 sau cel puțin 20 (100, 120, 143), dar nu la 0 sau 101–119.
 */
export function countOf(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const rest = n % 100;
  const de = n !== 0 && (rest === 0 || rest >= 20);
  return `${n} ${de ? "de " : ""}${many}`;
}

/** „a”, „a și b”, „a, b și c”. */
function listRo(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} și ${items.at(-1)}`;
}

/** Ce spune Spire după alegeri. Același rol de mai multe ori se spune o dată, cu numărul. */
export function foundSentence(picks: CampaignPick[]): string {
  if (picks.length === 0) return "N-am găsit nimic potrivit pe pagina asta. Încearcă „Decupează”.";
  const counts = new Map<CampaignKind, number>();
  for (const p of picks) counts.set(p.kind, (counts.get(p.kind) ?? 0) + 1);
  const parts = [...counts].map(([kind, n]) => (n === 1 ? KIND_LABEL[kind] : `${n} ${KIND_PLURAL[kind]}`));
  const what = picks.length === 1 ? "un lucru bun" : `${countOf(picks.length, "lucru", "lucruri")} bune`;
  return `Am găsit ${what} pentru o campanie: ${listRo(parts)}.`;
}

/** Ce a citit extensia: „Am citit 143 de elemente, 6 titluri, 4 butoane.” */
export function readSentence(page: PageSummary, count: number): string {
  return `Am citit ${countOf(count, "element", "elemente")}, ${countOf(page.headings.length, "titlu", "titluri")}, ${countOf(page.ctas.length, "buton", "butoane")}.`;
}

/** Aplicația → extensie: „scanează pagina acum” (content.js nu mai scanează singur). */
export function scanRequest(): { type: "spire:scan" } {
  return { type: "spire:scan" };
}

/** Aplicația → extensie: alegerile, ca să aprindă chenarele. */
export function picksReply(picks: CampaignPick[]): { type: "spire:picks"; picks: CampaignPick[] } {
  return { type: "spire:picks", picks };
}
