// Din anatomia referinței și marca omului iese un design pe straturi: așezarea e preluată,
// culorile, fonturile, textele și ilustrația sunt ale mărcii. Logică pură.
import { contrastRatio, estimateTextHeight } from "./accessibility";
import type { Anatomy, Zone } from "./anatomy";
import { type Brand, brandColor } from "./brand";
import type { Design, DesignElement } from "./design";
import type { Answers } from "./gaps";

/** Textul fiecărei zone; cheia e `zone.id`. */
export type Copy = Record<string, string>;

export const FORMATS = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
} as const;

/** Textele care nu au voie să difere de ce a spus omul: oferta, prețul și butonul sunt exacte; titlul e produsul. */
export function copyFromAnswers(a: Anatomy, ans: Answers): Copy {
  const copy: Copy = {};
  for (const z of a.zones) {
    if (z.role === "headline" && ans.product) copy[z.id] = ans.product.slice(0, z.maxChars || undefined);
    if (z.role === "offer" && (ans.offer || ans.price)) copy[z.id] = [ans.offer, ans.price].filter(Boolean).join(", ");
    if (z.role === "cta" && ans.cta) copy[z.id] = ans.cta;
  }
  return copy;
}

const MIN_FONT = 18;
const MANDATORY_FONT = 26;
const WHITE = "#FFFFFF";

/** Cel mai mare font la care textul încape în casetă. */
function fitFont(text: string, width: number, height: number): number {
  let size = Math.max(MIN_FONT, Math.round(height * 0.7));
  while (size > MIN_FONT && estimateTextHeight(text, size, width) > height) size -= 2;
  return size;
}

const readableOn = (bg: string, a: string, b: string): string => (contrastRatio(a, bg) >= contrastRatio(b, bg) ? a : b);

export function compose(a: Anatomy, b: Brand, copy: Copy, illustration: string | null, format: keyof typeof FORMATS): Design {
  const { width: W, height: H } = FORMATS[format];
  const elements: DesignElement[] = [];
  const box = (z: Zone) => ({ x: Math.round(z.box.x * W), y: Math.round(z.box.y * H), width: Math.round(z.box.w * W), height: Math.round(z.box.h * H) });

  const image = (z: Zone, src: string) => {
    // imaginile sunt pătrate: le centrăm în zonă, ca să nu se deformeze pe alt raport
    const r = box(z);
    const side = Math.min(r.width, r.height);
    elements.push({ type: "image", id: z.id, x: r.x + Math.round((r.width - side) / 2), y: r.y + Math.round((r.height - side) / 2), width: side, height: side, src });
  };

  const text = (z: Zone, value: string, fill: string, fontFamily: string, fontWeight: "normal" | "bold", align: "left" | "center") => {
    const r = box(z);
    const fontSize = fitFont(value, r.width, r.height);
    const lines = estimateTextHeight(value, fontSize, r.width);
    const y = align === "center" ? r.y + Math.max(0, Math.round((r.height - lines) / 2)) : r.y;
    elements.push({ type: "text", id: z.id, x: r.x, y, width: r.width, text: value, fontSize, fill, fontWeight, align, fontFamily });
  };

  /** Text pe un dreptunghi plin; latura lui e și ținta de clic (CTA) sau insigna (ofertă). */
  const pill = (z: Zone, value: string, bg: string) => {
    const r = box(z);
    elements.push({ type: "rect", id: `${z.id}-bg`, ...r, fill: bg, radius: Math.round(Math.min(r.height / 4, 24)) });
    const inner = { ...z, box: { ...z.box, x: z.box.x + 0.02, w: Math.max(0, z.box.w - 0.04), y: z.box.y + z.box.h * 0.15, h: z.box.h * 0.7 } };
    text(inner, value, readableOn(bg, WHITE, brandColor(b, "text")), b.fonts.body, "bold", "center");
  };

  for (const z of a.zones) {
    const value = copy[z.id];
    switch (z.role) {
      case "illustration":
      case "photo":
        image(z, illustration ?? b.mascot.image);
        break;
      case "logo":
        if (b.logo) image(z, b.logo);
        break;
      case "headline":
        if (value) text(z, value, brandColor(b, "text"), b.fonts.heading, "bold", "left");
        break;
      case "body":
        if (value) text(z, value, brandColor(b, "text"), b.fonts.body, "normal", "left");
        break;
      case "offer":
        if (value) pill(z, value, brandColor(b, "accent"));
        break;
      case "cta":
        if (value) pill(z, value, brandColor(b, "primary"));
        break;
    }
  }

  // mențiunile obligatorii stau jos, fiecare pe rândul ei
  const margin = Math.round(W * 0.08);
  b.mandatory.forEach((line, i) => {
    const y = H - margin / 2 - (b.mandatory.length - i) * MANDATORY_FONT * 1.4;
    elements.push({ type: "text", id: `mandatory-${i}`, x: margin, y: Math.round(y), width: W - 2 * margin, text: line, fontSize: MANDATORY_FONT, fill: brandColor(b, "text"), fontWeight: "normal", align: "left", fontFamily: b.fonts.body });
  });

  const headline = a.zones.find((z) => z.role === "headline");
  return { title: (headline && copy[headline.id]) || b.name, width: W, height: H, background: brandColor(b, "background"), elements };
}
