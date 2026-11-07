// Anatomia referinței: ce fel de element e, unde stau zonele, ce rol are fiecare culoare și ce stil
// are ilustrația. AI-ul o propune din imagine; de aici încolo lucrează doar codul.
import { z } from "zod";

export const ZoneRole = z.enum(["headline", "offer", "cta", "body", "illustration", "logo", "photo"]);
export type ZoneRole = z.infer<typeof ZoneRole>;

const Unit = z.number().min(0).max(1);

export const Zone = z.object({
  id: z.string().min(1),
  role: ZoneRole,
  /** coordonate 0–1 față de lățimea și înălțimea elementului */
  box: z.object({ x: Unit, y: Unit, w: Unit, h: Unit }),
  maxChars: z.number().int().nonnegative(),
});
export type Zone = z.infer<typeof Zone>;

export const ColorRoles = z.object({
  background: z.string(),
  primary: z.string(),
  accent: z.string(),
  text: z.string(),
  /** de unde vin: citite din pagină sau ghicite din pixeli */
  source: z.enum(["pagina", "pixeli"]),
});
export type ColorRoles = z.infer<typeof ColorRoles>;

export const Anatomy = z.object({
  kind: z.enum(["image", "section"]),
  width: z.number().positive(),
  height: z.number().positive(),
  zones: z.array(Zone),
  colors: ColorRoles,
  illustration: z.object({ style: z.string(), subject: z.string() }).nullable(),
  why: z.array(z.string()),
  suggestions: z.object({ cta: z.array(z.string()), product: z.array(z.string()) }),
});
export type Anatomy = z.infer<typeof Anatomy>;

/** Ce acceptăm de la model: casetele pot veni în pixeli sau puțin peste margine. */
export const AnatomyRead = Anatomy.extend({
  zones: z.array(Zone.extend({ box: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }) })),
});
export type AnatomyRead = z.infer<typeof AnatomyRead>;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** O axă: pixeli (peste 2) → împărțiți la dimensiune; apoi tăiată la marginea imaginii. */
function axis(start: number, size: number, total: number): [number, number] {
  const scale = Math.max(start, size) > 2 ? total : 1;
  const s = clamp01(start / scale);
  return [s, Math.min(1 - s, clamp01(size / scale))];
}

/** Aduce casetele propuse de model în coordonate 0–1, ca să treacă schema strictă. */
export function normalizeAnatomy(a: AnatomyRead): Anatomy {
  return {
    ...a,
    zones: a.zones.map((zone) => {
      const [x, w] = axis(zone.box.x, zone.box.w, a.width);
      const [y, h] = axis(zone.box.y, zone.box.h, a.height);
      return { ...zone, box: { x, y, w, h } };
    }),
  };
}

/** Exemplu de postare cu o cămilă; e și răspunsul de rezervă al analizei. */
export const sampleAnatomy: Anatomy = {
  kind: "image",
  width: 1080,
  height: 1350,
  zones: [
    { id: "title", role: "headline", box: { x: 0.08, y: 0.06, w: 0.84, h: 0.16 }, maxChars: 32 },
    { id: "offer", role: "offer", box: { x: 0.08, y: 0.23, w: 0.5, h: 0.08 }, maxChars: 24 },
    { id: "art", role: "illustration", box: { x: 0.18, y: 0.32, w: 0.64, h: 0.44 }, maxChars: 0 },
    { id: "cta", role: "cta", box: { x: 0.08, y: 0.8, w: 0.5, h: 0.08 }, maxChars: 20 },
    { id: "logo", role: "logo", box: { x: 0.74, y: 0.8, w: 0.18, h: 0.08 }, maxChars: 0 },
  ],
  colors: { background: "#F4E3C1", primary: "#B5472F", accent: "#2F6F73", text: "#2B1D14", source: "pixeli" },
  illustration: {
    style: "desen plat, contururi groase și egale, culori saturate, umbre simple dintr-o singură bucată",
    subject: "o cămilă cu ochelari de soare",
  },
  why: [
    "Titlul mare e citit primul, iar ilustrația ține privirea pe mijloc.",
    "Oferta stă imediat sub titlu, deci se vede înainte de buton.",
    "Butonul e singurul lucru colorat în partea de jos.",
  ],
  suggestions: {
    cta: ["Comandă acum", "Vino azi", "Vezi oferta"],
    product: ["Gelato", "Cafea", "Tort de înghețată"],
  },
};
