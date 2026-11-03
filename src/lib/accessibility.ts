// Verificări de design fără AI (deterministe, instant): contrast WCAG, simulare de
// daltonism, lizibilitate la distanță. Bune pentru „AI-ul propune, regulile verifică".

import type { Design, DesignElement } from "./design";

// ── Culori și contrast (WCAG 2.x) ──
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) => {
  const v = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

export function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(hexToRgb(a));
  const lb = relativeLuminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** Nivel WCAG. Text mare = ≥ 24px normal sau ≥ 18.66px bold (la 1x). */
export function wcagLevel(ratio: number, largeText = false): "AAA" | "AA" | "fail" {
  if (ratio >= (largeText ? 4.5 : 7)) return "AAA";
  if (ratio >= (largeText ? 3 : 4.5)) return "AA";
  return "fail";
}

// ── Daltonism (Machado et al. 2009, severitate maximă), aplicat în RGB liniar ──
export type ColorVision = "normal" | "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

export const COLOR_VISION_LABELS: Record<ColorVision, string> = {
  normal: "Vedere normală",
  protanopia: "Protanopie (fără roșu, ~1% din bărbați)",
  deuteranopia: "Deuteranopie (fără verde, ~1% din bărbați)",
  tritanopia: "Tritanopie (fără albastru, rară)",
  achromatopsia: "Acromatopsie (alb-negru)",
};

const MATRICES: Record<Exclude<ColorVision, "normal" | "achromatopsia">, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

export function simulateColor(rgb: [number, number, number], type: ColorVision): [number, number, number] {
  if (type === "normal") return rgb;
  const [r, g, b] = rgb.map(toLinear);
  if (type === "achromatopsia") {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const v = toSrgb(y);
    return [v, v, v];
  }
  const m = MATRICES[type];
  return [toSrgb(m[0] * r + m[1] * g + m[2] * b), toSrgb(m[3] * r + m[4] * g + m[5] * b), toSrgb(m[6] * r + m[7] * g + m[8] * b)];
}

/** Aplică simularea pe pixelii unui canvas (in place). Cache pe culoare pentru viteză. */
export function simulateImageData(data: ImageData, type: ColorVision): ImageData {
  if (type === "normal") return data;
  const px = data.data;
  const cache = new Map<number, [number, number, number]>();
  for (let i = 0; i < px.length; i += 4) {
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    let out = cache.get(key);
    if (!out) {
      out = simulateColor([px[i], px[i + 1], px[i + 2]], type);
      cache.set(key, out);
    }
    px[i] = out[0];
    px[i + 1] = out[1];
    px[i + 2] = out[2];
  }
  return data;
}

// ── Lizibilitate la distanță ──
/**
 * Regula din industria de signalistică: ~2,5 cm înălțime de literă pentru fiecare 3 m
 * de distanță (≈ 0,83 cm/m) ca textul să fie citit confortabil.
 */
export const CM_PER_METER = 2.54 / 3.048;
/** Înălțimea literelor mari ≈ 70% din font-size. */
export const CAP_HEIGHT = 0.7;

/** De la ce distanță maximă (m) se citește un text de `fontSizePx`, pe un afiș lat de `physicalWidthCm`. */
export function readableDistanceM(fontSizePx: number, designWidthPx: number, physicalWidthCm: number): number {
  const letterCm = fontSizePx * CAP_HEIGHT * (physicalWidthCm / designWidthPx);
  return Math.round((letterCm / CM_PER_METER) * 10) / 10;
}

/**
 * Cât blur (în pixeli ai designului) simulează privitul de la `distanceM`.
 * Calibrat pe aceeași regulă ca `readableDistanceM`: la distanța-limită a unui text,
 * blur-ul ajunge la ~1/5 din înălțimea literei (cât grosimea unei linii), deci textul
 * devine greu de citit exact acolo unde auditul spune că nu se mai citește.
 */
export function distanceBlurPx(designWidthPx: number, physicalWidthCm: number, distanceM: number): number {
  const pixelCm = physicalWidthCm / designWidthPx;
  const letterAtLimitCm = distanceM * CM_PER_METER;
  return Math.max(0, Math.round((letterAtLimitCm / 5 / pixelCm) * 10) / 10);
}

// ── Audit pentru un Design ──
export interface TextAudit {
  id: string;
  text: string;
  fill: string;
  background: string;
  contrast: number;
  level: "AAA" | "AA" | "fail";
  readableFromM: number;
}

const inside = (el: DesignElement, x: number, y: number) => {
  if (el.type === "rect" || el.type === "image") return x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height;
  if (el.type === "circle") return Math.hypot(x - el.x, y - el.y) <= el.radius;
  return false;
};

/** Culoarea de fundal de sub centrul unui element (ultima formă plină de sub el, altfel fundalul). */
export function backgroundUnder(design: Design, index: number): string {
  const el = design.elements[index];
  if (el.type !== "text") return design.background;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.fontSize / 2;
  for (let i = index - 1; i >= 0; i--) {
    const below = design.elements[i];
    if ((below.type === "rect" || below.type === "circle") && inside(below, cx, cy)) return below.fill;
  }
  return design.background;
}

/**
 * Verifică toate textele: contrast WCAG și de la ce distanță se citesc.
 * „Text mare" (prag WCAG) e estimat relativ la o pânză de 1080px lățime.
 */
export function auditDesign(design: Design, physicalWidthCm = 29.7): TextAudit[] {
  return design.elements.flatMap((el, i) => {
    if (el.type !== "text") return [];
    const bg = backgroundUnder(design, i);
    const contrast = contrastRatio(el.fill, bg);
    const large = el.fontSize * (1080 / design.width) >= 24 || (el.fontWeight === "bold" && el.fontSize * (1080 / design.width) >= 18.66);
    return [
      {
        id: el.id,
        text: el.text,
        fill: el.fill,
        background: bg,
        contrast,
        level: wcagLevel(contrast, large),
        readableFromM: readableDistanceM(el.fontSize, design.width, physicalWidthCm),
      },
    ];
  });
}

// ── Reparare automată (deterministă) ──
export interface FixResult {
  design: Design;
  /** ce s-a schimbat, în cuvinte, pentru UI și pitch */
  changes: string[];
}

/**
 * Face toate textele lizibile de la `distanceM` și conforme WCAG AA:
 * mărește fontul până la minimul necesar și, dacă e nevoie, trece textul pe alb sau negru.
 */
export function autoFixDesign(design: Design, { physicalWidthCm = 29.7, distanceM = 2 } = {}): FixResult {
  const changes: string[] = [];
  const pxPerCm = design.width / physicalWidthCm;
  const elements = design.elements.map((el, i) => {
    if (el.type !== "text") return el;
    let next = el;
    const minSize = Math.ceil((distanceM * CM_PER_METER * pxPerCm) / CAP_HEIGHT);
    if (el.fontSize < minSize) {
      const fontSize = Math.min(minSize, Math.round(design.width / 5));
      next = { ...next, fontSize };
      changes.push(`„${el.text.slice(0, 30)}”: font ${el.fontSize}px → ${fontSize}px (lizibil de la ${distanceM} m)`);
    }
    const bg = backgroundUnder(design, i);
    const large = next.fontSize * (1080 / design.width) >= 24;
    if (wcagLevel(contrastRatio(next.fill, bg), large) === "fail") {
      const fill = contrastRatio("#ffffff", bg) >= contrastRatio("#000000", bg) ? "#ffffff" : "#000000";
      changes.push(`„${el.text.slice(0, 30)}”: culoare ${next.fill} → ${fill} (contrast ${contrastRatio(next.fill, bg)} → ${contrastRatio(fill, bg)})`);
      next = { ...next, fill };
    }
    return next;
  });
  return { design: { ...design, elements }, changes };
}
