// Critica de pe landing page: aceleași reguli ca în extensie (critiquePage), rulate pe faptele unei pagini de demo.
// Macheta desenează pagina din aceste fapte, deci critica vorbește despre ce se vede: butonul chiar e palid,
// linkul chiar scrie „Detalii”, iar poza chiar n-are descriere. Textele nu sunt scrise aici, doar faptele. Logică pură.
import { type Box, type Critique, type CritiqueLevel, critiquePage, type ElementFacts, type PageFacts } from "./critique";

/** Pagina e aceeași de la „Se uită” (DEMO_SITE din landingDemo.ts), dar în pixeli CSS reali: la jumătate din cei 1440 × 1080 de acolo. */
export const CRITIQUE_VIEWPORT = { w: 720, h: 540 };
export const CRITIQUE_URL = "referinta.example/ceai-rece";
export const CRITIQUE_IMAGE = "/samples/spire/referinta-ilustratie.jpg";

/** Aceleași etichete ca în balonul din chrome-extension/content.js. */
export const LEVEL_LABELS: Record<CritiqueLevel, string> = { important: "Important", "de-imbunatatit": "De îmbunătățit", marunt: "Mărunt" };

const INK = "rgb(43, 29, 20)";
const WHITE = "rgb(255, 255, 255)";
const SAND = "rgb(244, 227, 193)";
const HEADER = "rgb(251, 242, 226)";
const TEAL = "rgb(47, 111, 115)";
/** Butonul palid: de aici vine observația de contrast. */
const PALE_CTA = "rgb(242, 184, 162)";

export const CRITIQUE_BOXES: Record<string, Box> = {
  "el-1": { x: 40, y: 16, w: 35, h: 16 },
  "el-2": { x: 90, y: 16, w: 42, h: 16 },
  "el-3": { x: 147, y: 16, w: 43, h: 16 },
  "el-4": { x: 40, y: 115, w: 230, h: 55 },
  "el-5": { x: 40, y: 200, w: 190, h: 26 },
  "el-6": { x: 40, y: 260, w: 125, h: 36 },
  "el-7": { x: 265, y: 95, w: 185, h: 310 },
};

function element(id: string, tag: string, text: string, rest: Partial<ElementFacts>): ElementFacts {
  return {
    id,
    tag,
    role: "",
    text,
    accessibleName: text,
    fontSizePx: 13,
    fontWeight: 500,
    color: INK,
    background: SAND,
    box: CRITIQUE_BOXES[id],
    inFirstScreen: true,
    isLink: false,
    href: null,
    isButtonLike: false,
    isImage: false,
    alt: null,
    isHeadingLike: false,
    ...rest,
  };
}

const navLink = (id: string, text: string, path: string) =>
  element(id, "a", text, { role: "link", isLink: true, href: `https://${CRITIQUE_URL.split("/")[0]}/${path}`, background: HEADER });

/** Faptele despre pagină: are titlu, descriere, limbă și date structurate, deci observațiile sunt toate pe elemente. */
export const CRITIQUE_PAGE: PageFacts = {
  url: `https://${CRITIQUE_URL}`,
  title: "Ceai rece",
  lang: "ro",
  metaDescription: "Ceai rece, cu reducere azi la orice sortiment.",
  jsonLdTypes: ["Store"],
  h1Count: 1,
  imagesWithoutAlt: 1,
};

/** Ce ar citi extensia de pe pagina desenată în machetă. */
export const CRITIQUE_ELEMENTS: ElementFacts[] = [
  navLink("el-1", "Meniu", "meniu"),
  navLink("el-2", "Ceaiuri", "ceaiuri"),
  navLink("el-3", "Detalii", "detalii"),
  element("el-4", "h1", "Ceai rece", { role: "heading", fontSizePx: 48, fontWeight: 700 }),
  element("el-5", "p", "-30% azi la orice ceai rece", { fontWeight: 600, color: WHITE, background: TEAL }),
  element("el-6", "button", "Comandă acum", { role: "button", fontSizePx: 14, fontWeight: 600, color: WHITE, background: PALE_CTA }),
  element("el-7", "img", "", { role: "img", accessibleName: "", background: "", isImage: true, alt: null }),
];

export interface CritiqueStop {
  critique: Critique;
  label: string;
  /** caseta elementului pe care aterizează uliul */
  box: Box;
  /** unde stau ghearele uliului */
  perch: { x: number; y: number };
}

/** Punctul de aterizare, ca perchOn din content.js. Dacă deasupra elementului n-are loc, uliul stă sub el. */
export function perchOn(box: Box, viewport: { w: number; h: number }, hawk: number): { x: number; y: number } {
  const x = box.x + Math.min(box.w * 0.5, box.w - 40) + 8;
  const top = box.y + 4;
  const y = top < hawk * 0.78 ? box.y + box.h + hawk * 0.78 : top;
  return { x: Math.max(hawk / 2, Math.min(viewport.w - hawk / 2, x)), y: Math.min(viewport.h, y) };
}

/** Balonul stă în dreapta elementului, cât permite pagina; niciodată în afara ei. */
export function bubbleAt(box: Box, view: { w: number; h: number }, bubble: { w: number; h: number }, gap = 8): { x: number; y: number } {
  return {
    x: Math.max(gap, Math.min(view.w - bubble.w - gap, box.x + box.w + gap)),
    y: Math.max(gap, Math.min(view.h - bubble.h - gap, box.y - gap * 2)),
  };
}

/** Rulează regulile reale și întoarce opririle uliului (doar observațiile legate de un element). */
export function critiqueStops(hawk = 80): CritiqueStop[] {
  const crits = critiquePage(CRITIQUE_PAGE, CRITIQUE_ELEMENTS, CRITIQUE_VIEWPORT);
  return crits.flatMap((critique) => {
    const el = CRITIQUE_ELEMENTS.find((e) => e.id === critique.elementId);
    if (!el) return [];
    return [{ critique, label: LEVEL_LABELS[critique.level], box: el.box, perch: perchOn(el.box, CRITIQUE_VIEWPORT, hawk) }];
  });
}
