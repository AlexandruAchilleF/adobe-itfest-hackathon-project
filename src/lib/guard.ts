// Garda: verifică rezultatul cu reguli, nu cu încredere în AI. Mesajele spun ce s-a găsit.
// Doar verificarea mascotei e făcută de AI și e marcată ca atare (`source: "ai"`).
import { auditDesign, backgroundUnder, contrastRatio } from "./accessibility";
import { type Brand, brandPalette } from "./brand";
import { nearest } from "./color";
import type { Copy } from "./compose";
import type { Design, DesignElement } from "./design";
import type { Answers } from "./gaps";

export type CheckId = "text" | "price" | "mandatory" | "fonts" | "brand-colors" | "illustration-palette" | "not-copy" | "contrast" | "cta" | "headline" | "mascot" | "kit";

export interface Check {
  id: CheckId;
  ok: boolean;
  message: string;
  source: "cod" | "ai";
  /** agentul poate încerca să repare singur */
  fixable: boolean;
}

export const THRESHOLDS = {
  brandColorDeltaE: 12,
  illustrationPaletteDeltaE: 25,
  minHashDistance: 10,
  ctaMinContrast: 4.5,
  ctaMinHeightRatio: 0.05,
  headlineMaxWords: 8,
};

const WHITE = "#FFFFFF";
const PRICE = /(\d[\d.,]*)\s*(lei|ron|eur|€|%)/gi;

/** Valoarea și unitatea: „1.000,50 lei” → 1000.5 lei. */
function parsePrice(raw: string): { value: number; unit: string } | null {
  const match = raw.match(/(\d[\d.,]*)\s*(lei|ron|eur|€|%)/i);
  if (!match) return null;
  const digits = match[1].replace(/[.,]$/, "");
  const lastSep = Math.max(digits.lastIndexOf(","), digits.lastIndexOf("."));
  const isDecimal = lastSep >= 0 && digits.length - lastSep - 1 !== 3;
  const whole = isDecimal ? digits.slice(0, lastSep) : digits;
  const decimals = isDecimal ? digits.slice(lastSep + 1) : "0";
  const unit = match[2].toLowerCase();
  return { value: Number(`${whole.replace(/[.,]/g, "")}.${decimals}`), unit: unit === "ron" ? "lei" : unit === "€" ? "eur" : unit };
}

export function samePrice(a: string, b: string): boolean {
  const pa = parsePrice(a);
  const pb = parsePrice(b);
  if (!pa || !pb) return a.trim().toLowerCase() === b.trim().toLowerCase();
  return pa.value === pb.value && pa.unit === pb.unit;
}

const pricesIn = (text: string): string[] => [...text.matchAll(PRICE)].map((m) => m[0]);
const includesPrice = (list: string[], price: string) => list.some((p) => samePrice(p, price));

type TextElement = Extract<DesignElement, { type: "text" }>;
const textsOf = (d: Design): TextElement[] => d.elements.filter((e): e is TextElement => e.type === "text");
const code = (id: CheckId, ok: boolean, message: string, fixable = true): Check => ({ id, ok, message, source: "cod", fixable });
const norm = (s: string) => s.trim().replace(/\s+/g, " ");

function colorsOf(d: Design): string[] {
  const colors = d.elements.flatMap((e) => {
    if (e.type === "line") return [e.stroke];
    if (e.type === "path") return [e.stroke, ...(e.fill ? [e.fill] : [])];
    return "fill" in e ? [e.fill] : [];
  });
  return [...new Set([d.background, ...colors])];
}

function checkPrice(design: Design, brand: Brand, answers: Answers): Check {
  const onDesign = textsOf(design)
    .filter((t) => !brand.mandatory.includes(t.text))
    .flatMap((t) => pricesIn(t.text));
  const approved = [...(answers.price ? pricesIn(answers.price) : []), ...(answers.offer ? pricesIn(answers.offer) : [])];
  const stranger = onDesign.find((p) => !includesPrice(approved, p));
  if (stranger) {
    const expected = answers.price ?? answers.offer;
    return code("price", false, expected ? `Prețul de pe design e ${stranger}, oferta e ${expected}` : `Pe design apare ${stranger}, dar oferta nu are preț`);
  }
  if (answers.price && !includesPrice(onDesign, answers.price)) return code("price", false, `Prețul ${answers.price} lipsește de pe design`);
  return code("price", true, "Prețul e cel din ofertă");
}

function checkCta(design: Design, answers: Answers, copy: Copy): Check {
  const label = answers.cta ?? copy.cta;
  if (!label) return code("cta", false, "Designul n-are buton", false);
  const index = design.elements.findIndex((e) => e.type === "text" && norm(e.text) === norm(label));
  const element = design.elements[index];
  if (element?.type !== "text") return code("cta", false, `Butonul „${label}” nu e pe design`);

  const rect = design.elements.slice(0, index).reverse().find((e) => e.type === "rect" && element.x + element.width / 2 >= e.x && element.x + element.width / 2 <= e.x + e.width && element.y + element.fontSize / 2 >= e.y && element.y + element.fontSize / 2 <= e.y + e.height);
  const height = rect?.type === "rect" ? rect.height : element.fontSize * 1.2;
  if (height / design.height < THRESHOLDS.ctaMinHeightRatio) return code("cta", false, `Butonul are ${Math.round(height)} px înălțime, prea mic pentru format`);
  if (element.y + element.fontSize / 2 < design.height / 2) return code("cta", false, "Butonul nu e în zona de jos a designului");
  const contrast = contrastRatio(element.fill, backgroundUnder(design, index));
  if (contrast < THRESHOLDS.ctaMinContrast) return code("cta", false, `Butonul are contrast ${contrast.toFixed(1)}:1, trebuie cel puțin ${THRESHOLDS.ctaMinContrast}:1`);
  return code("cta", true, "Butonul se vede și se citește");
}

function checkHeadline(design: Design): Check {
  const [largest] = [...textsOf(design)].sort((a, b) => b.fontSize - a.fontSize);
  if (!largest) return code("headline", false, "Designul n-are titlu");
  const words = largest.text.trim().split(/\s+/).length;
  return words > THRESHOLDS.headlineMaxWords
    ? code("headline", false, `Titlul are ${words} cuvinte, cel mult ${THRESHOLDS.headlineMaxWords} se citesc dintr-o privire`)
    : code("headline", true, "Titlul se citește dintr-o privire");
}

function illustrationChecks(illustration: { colors: string[]; hashDistance: number } | null, brand: Brand): Check[] {
  if (!illustration) return [code("illustration-palette", true, "Imaginea din marcă, generarea n-a reușit", false)];
  const palette = brandPalette(brand);
  const distances = illustration.colors.map((c) => nearest(c, palette).distance);
  // media, nu maximul: conturul și umbra pot fi în afara paletei fără ca imaginea să iasă de pe marcă
  const average = distances.length ? distances.reduce((s, d) => s + d, 0) / distances.length : 0;
  return [
    average <= THRESHOLDS.illustrationPaletteDeltaE
      ? code("illustration-palette", true, "Ilustrația e pe culorile mărcii")
      : code("illustration-palette", false, `Ilustrația e la distanța ${Math.round(average)} de culorile mărcii, pragul e ${THRESHOLDS.illustrationPaletteDeltaE}`),
    illustration.hashDistance >= THRESHOLDS.minHashDistance
      ? code("not-copy", true, "Ilustrația nu e o copie a referinței")
      : code("not-copy", false, `Ilustrația e aproape identică cu referința (distanța ${illustration.hashDistance})`),
  ];
}

export function guardDesign(input: {
  design: Design;
  brand: Brand;
  answers: Answers;
  copy: Copy;
  illustration?: { colors: string[]; hashDistance: number } | null;
  mascot?: { ok: boolean; reason: string };
}): Check[] {
  const { design, brand, answers, copy, illustration, mascot } = input;
  const texts = textsOf(design).map((t) => norm(t.text));

  const missing = Object.values(copy).filter((value) => value && !texts.includes(norm(value)));
  const absentMandatory = brand.mandatory.filter((line) => !texts.includes(norm(line)));
  const allowedFonts = [brand.fonts.heading, brand.fonts.body];
  const strangeFonts = [...new Set(textsOf(design).map((t) => t.fontFamily ?? "fără font").filter((f) => !allowedFonts.includes(f)))];
  const palette = [...brandPalette(brand), WHITE];
  const strangeColors = colorsOf(design).filter((c) => nearest(c, palette).distance > THRESHOLDS.brandColorDeltaE);
  const failedContrast = auditDesign(design).filter((a) => a.level === "fail");

  const checks: Check[] = [
    missing.length ? code("text", false, `Lipsește de pe design: „${missing[0]}”`) : code("text", true, "Textele sunt exact cele date de tine"),
    checkPrice(design, brand, answers),
    absentMandatory.length ? code("mandatory", false, `Lipsește mențiunea: „${absentMandatory[0]}”`) : code("mandatory", true, "Mențiunile obligatorii sunt prezente"),
    strangeFonts.length ? code("fonts", false, `Font care nu e al mărcii: ${strangeFonts[0]}`) : code("fonts", true, "Fonturile sunt ale mărcii"),
    strangeColors.length ? code("brand-colors", false, `Culoare care nu e a mărcii: ${strangeColors[0]}`) : code("brand-colors", true, "Culorile sunt din paleta mărcii"),
    failedContrast.length ? code("contrast", false, `Textul „${failedContrast[0].text.slice(0, 30)}” are contrast ${failedContrast[0].contrast}:1`) : code("contrast", true, "Textele au contrast suficient"),
    checkCta(design, answers, copy),
    checkHeadline(design),
  ];
  if (illustration !== undefined) checks.push(...illustrationChecks(illustration, brand));
  if (mascot) checks.push({ id: "mascot", ok: mascot.ok, message: mascot.reason, source: "ai", fixable: true });
  return checks;
}

/** Oferta și butonul sunt aceleași pe toate formatele. */
export function guardKit(designs: Partial<Record<"post" | "story", Design>>, answers: Answers): Check {
  const entries = Object.entries(designs) as Array<["post" | "story", Design]>;
  const prices = entries.map(([format, d]) => ({ format, prices: textsOf(d).flatMap((t) => pricesIn(t.text)) }));
  for (const a of prices) {
    for (const b of prices) {
      const odd = a.prices.find((p) => !includesPrice(b.prices, p));
      if (odd) return code("kit", false, `Pe ${a.format} apare ${odd}, dar pe ${b.format} nu`);
    }
    if (answers.price && !includesPrice(a.prices, answers.price)) return code("kit", false, `Pe ${a.format} lipsește prețul ${answers.price}`);
  }
  if (answers.cta) {
    const other = entries.find(([, d]) => !textsOf(d).some((t) => norm(t.text) === norm(answers.cta ?? "")));
    if (other) return code("kit", false, `Pe ${other[0]} butonul nu e „${answers.cta}”`);
  }
  return code("kit", true, "Oferta și butonul sunt aceleași pe toate formatele");
}
