// Alegerea elementelor paginii care merită folosite într-o campanie. Logică pură, fără DOM.
// Regulile stau doar aici; extensia doar aprinde chenarele elementelor întoarse.
import type { PageElement } from "./extensionBridge";

export type CampaignKind = "hero" | "offer" | "mascot" | "cta" | "badge";
export type CampaignPick = { elementId: string; kind: CampaignKind; score: number; reason: string };

const MAX_PICKS = 4;

// Scor = bază pe rol + bonus (0..9) din arie și primul ecran.
// Bonusul e mai mic decât distanța dintre baze (20), deci ordinea rolurilor e stabilă:
// hero > offer > mascot > cta > badge.
const BASE: Record<CampaignKind, number> = { hero: 100, offer: 80, mascot: 60, cta: 40, badge: 20 };

const REASON: Record<CampaignKind, string> = {
  hero: "Hero-ul paginii: ocupă primul ecran și are titlu.",
  offer: "Oferta paginii: textul vorbește despre preț sau reducere.",
  mascot: "Imagine mare, care nu e logo: poate deveni mascota campaniei.",
  cta: "Butonul de acțiune: text scurt, pe fundal plin.",
  badge: "Insignă mică cu procent: bună ca ștampilă pe postare.",
};

/** Fără diacritice și cu litere mici, ca „Ofertă” și „oferta” să fie același lucru. */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const OFFER_RE = /%|\blei\b|\bron\b|reducere|oferta|(^|[^\w])-\d+/;
const hasOfferText = (t: string) => OFFER_RE.test(norm(t));
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** Transparent: cuvântul `transparent`, sau rgba/hsla cu alpha 0 (și lipsa culorii). */
function isTransparent(bg: string): boolean {
  const c = bg.trim().toLowerCase();
  if (!c || c === "transparent") return true;
  const m = c.match(/^(?:rgba|hsla)\(([^)]*)\)$/);
  if (!m) return false;
  const parts = m[1].split(/[,/\s]+/).filter(Boolean);
  return parts.length >= 4 && Number(parts[3]) === 0;
}

function classify(e: PageElement, vp: { w: number; h: number }): CampaignKind | null {
  const vpArea = Math.max(1, vp.w * vp.h);
  const area = Math.max(0, e.box.w) * Math.max(0, e.box.h);
  const text = e.text.trim();
  const tag = e.tag.toLowerCase();
  const kinds: CampaignKind[] = [];

  // Titlu = tag de titlu sau text nevid (cel puțin 3 caractere); fără el nu există hero.
  const hasTitle = /^h[1-3]$/.test(tag) || text.length >= 3;
  if (e.inFirstScreen && area >= 0.25 * vpArea && hasTitle) kinds.push("hero");

  if (text && hasOfferText(text)) {
    // Insigna = element mic (sub 2% din ecran) și scurt (≤ 4 cuvinte); restul sunt oferte.
    kinds.push(area < 0.02 * vpArea && words(text) <= 4 ? "badge" : "offer");
  }

  if ((tag === "a" || tag === "button") && text && words(text) <= 4 && !isTransparent(e.styles.background)) kinds.push("cta");

  const isImage = tag === "img" || tag === "svg" || !!e.imageSrc;
  if (isImage && area >= 0.05 * vpArea && !isLogo(e, vp)) kinds.push("mascot");

  // Un element primește un singur rol: cel cu baza cea mai mare.
  return kinds.sort((a, b) => BASE[b] - BASE[a])[0] ?? null;
}

/** Logo = în colțul de sus (y < 15% din înălțime, x < 25% din lățime) sau cu latura mai mică de 120 px. */
function isLogo(e: PageElement, vp: { w: number; h: number }): boolean {
  const inCorner = e.box.y < 0.15 * vp.h && e.box.x < 0.25 * vp.w;
  return inCorner || Math.min(e.box.w, e.box.h) < 120;
}

export function campaignCandidates(els: PageElement[], viewport: { w: number; h: number }): CampaignPick[] {
  const vpArea = Math.max(1, viewport.w * viewport.h);
  const all: (CampaignPick & { idx: number })[] = [];
  const seen = new Set<string>();

  els.forEach((e, idx) => {
    if (seen.has(e.id)) return; // cel mult un pick per elementId
    const kind = classify(e, viewport);
    if (!kind) return;
    seen.add(e.id);
    const share = Math.min(1, (e.box.w * e.box.h) / vpArea);
    const score = Math.round((BASE[kind] + share * 6 + (e.inFirstScreen ? 3 : 0)) * 100) / 100;
    all.push({ elementId: e.id, kind, score, reason: REASON[kind], idx });
  });

  // La egalitate, ordinea după indexul elementului (stabil).
  const byScore = (a: { score: number; idx: number }, b: { score: number; idx: number }) => b.score - a.score || a.idx - b.idx;
  all.sort(byScore);

  // Varietate: cel mai bun pe fiecare rol, apoi completăm până la 4 cu restul.
  const chosen: typeof all = [];
  const kindsTaken = new Set<CampaignKind>();
  for (const p of all) {
    if (chosen.length >= MAX_PICKS) break;
    if (!kindsTaken.has(p.kind)) { kindsTaken.add(p.kind); chosen.push(p); }
  }
  for (const p of all) {
    if (chosen.length >= MAX_PICKS) break;
    if (!chosen.includes(p)) chosen.push(p);
  }
  return chosen.sort(byScore).map(({ idx: _i, ...p }) => p);
}
