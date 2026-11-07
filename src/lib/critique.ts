// Critica pe pagină: reguli deterministe, fără DOM și fără AI (judecățile AI: critiqueAi.ts).
// Intrarea sunt faptele citite din pagină de chrome-extension/content.js; ieșirea sunt
// criticile pe care uliul le spune pe rând, în limbaj obișnuit. Cifrele (contrastul, mărimea
// fontului) stau în `evidence`, nu în text. Modulul e împachetat ca IIFE în
// chrome-extension/critique.js (npm run ext:critique); de aici, importurile trebuie să rămână ușoare.

import { contrastRatio, wcagLevel } from "./accessibility";

// ── Intrarea: faptele din pagină ──

/** Faptele despre pagină, adunate o singură dată de content.js. */
export interface PageFacts {
  /** location.href */
  url: string;
  /** document.title (poate fi gol) */
  title: string;
  /** atributul lang de pe <html>; "" dacă lipsește */
  lang: string;
  /** conținutul lui <meta name="description">; "" dacă lipsește */
  metaDescription: string;
  /** valorile "@type" din toate blocurile <script type="application/ld+json"> (inclusiv din @graph); [] dacă nu există */
  jsonLdTypes: string[];
  /** câte elemente <h1> vizibile are pagina */
  h1Count: number;
  /** câte <img> au atributul alt lipsă (nu gol), pe toată pagina; informativ, regula folosește elementele */
  imagesWithoutAlt: number;
}

/** Caseta unui element, în coordonatele viewport-ului (getBoundingClientRect). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Faptele despre un element analizat (content.js trimite cel mult 200, cele vizibile). */
export interface ElementFacts {
  /** id stabil dat de content.js (de exemplu „s12”), ca să găsească elementul pe care aterizează uliul */
  id: string;
  /** numele etichetei, cu litere mici: "a", "button", "div", "img", "h2" */
  tag: string;
  /**
   * rolul: atributul role dacă există; altfel cel implicit: "button" pentru button și input de tip
   * button/submit/reset, "link" pentru a cu href, "heading" pentru h1–h6, "img" pentru img; altfel "".
   */
  role: string;
  /** textul vizibil (innerText), scurtat de content.js la cel mult 120 de caractere; "" dacă nu are */
  text: string;
  /** numele accesibil: aria-label, aria-labelledby, alt, title sau textul; "" dacă nu are */
  accessibleName: string;
  /** mărimea fontului calculată, în pixeli CSS */
  fontSizePx: number;
  /** grosimea fontului calculată (400 normal, 700 bold) */
  fontWeight: number;
  /** culoarea textului calculată, de obicei "rgb(r, g, b)" sau "rgba(r, g, b, a)"; se acceptă și hex */
  color: string;
  /** fundalul efectiv, rezolvat prin strămoși până la primul fundal opac; hex sau rgb. Dacă nu se poate afla (imagine de fundal, transparent până sus), "" */
  background: string;
  /** caseta în viewport */
  box: Box;
  /** true dacă elementul se vede fără derulare (caseta intersectează primul ecran) */
  inFirstScreen: boolean;
  /** true pentru a cu href (sau role="link") */
  isLink: boolean;
  /** href-ul, dacă e link; altfel null */
  href: string | null;
  /** are cursor:pointer sau onclick, dar nu e a, button, input, select, textarea sau summary */
  isButtonLike: boolean;
  /** true pentru img (și role="img") */
  isImage: boolean;
  /** atributul alt al imaginii: null = lipsește, "" = decorativă */
  alt: string | null;
  /** text mare (de exemplu cel puțin 20 de pixeli, sau 18 și bold), care nu e h1–h3 și n-are role="heading" */
  isHeadingLike: boolean;
}

// ── Ieșirea: criticile ──

export type CritiqueLevel = "important" | "de-imbunatatit" | "marunt";

export type CritiqueRule =
  | "ai-critique"
  | "fara-nume"
  | "contrast-slab"
  | "buton-fals"
  | "pagina-fara-titlu"
  | "link-vag"
  | "titlu-nemarcat"
  | "text-mic"
  | "imagine-fara-descriere"
  | "fara-descriere"
  | "fara-date-structurate"
  | "fara-limba"
  | "mai-multe-titluri";

export interface Critique {
  /** elementul pe care aterizează uliul; null = critică despre toată pagina */
  elementId: string | null;
  level: CritiqueLevel;
  title: string;
  body: string;
  /** Propunere a asistentului, afișată numai în recapitulare. */
  fix: string;
  /** Context păstrat pentru compatibilitate; nu apare în tur. */
  agent: string;
  /** regula care a găsit-o sau „parere-ai”, pentru observațiile verificate din critiqueAi.ts */
  ruleId: CritiqueRule | "parere-ai";
  /** cifrele din spatele criticii (nu apar în text) */
  evidence: Record<string, string | number>;
}

export const MAX_CRITIQUES = 5;
export const MAX_PER_RULE = 1;
/** Sub această mărime, textul e prea mic. */
export const MIN_FONT_PX = 12;
/** O imagine e „mare” dacă are ambele laturi de cel puțin atât și o arie de cel puțin LARGE_IMAGE_AREA. */
const LARGE_IMAGE_SIDE = 100;
const LARGE_IMAGE_AREA = 150 * 150;

const LEVEL_RANK: Record<CritiqueLevel, number> = { important: 0, "de-imbunatatit": 1, marunt: 2 };

// Gravitatea regulilor la același nivel (pentru „o critică pe element: cea mai gravă”).
const RULE_RANK: Record<CritiqueRule, number> = {
  "ai-critique": 12,
  "fara-nume": 0,
  "contrast-slab": 1,
  "buton-fals": 2,
  "pagina-fara-titlu": 3,
  "link-vag": 4,
  "titlu-nemarcat": 5,
  "text-mic": 6,
  "imagine-fara-descriere": 7,
  "fara-descriere": 8,
  "fara-date-structurate": 9,
  "fara-limba": 10,
  "mai-multe-titluri": 11,
};

// ── Culori: parsare robustă (null = nu știm, deci sărim) ──

type Rgba = [number, number, number, number];

/** Citește o culoare CSS în formă hex, rgb() sau rgba(). Orice altceva (transparent, var(), nume) dă null. */
export function parseColor(input: string | null | undefined): Rgba | null {
  if (typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (!/^[0-9a-f]+$/.test(h)) return null;
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const m = s.match(/^rgba?\(\s*([^)]*)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const num = (p: string, max: number) => {
    const pct = p.endsWith("%");
    const v = Number.parseFloat(pct ? p.slice(0, -1) : p);
    if (!Number.isFinite(v)) return Number.NaN;
    return Math.max(0, Math.min(max, pct ? (v / 100) * max : v));
  };
  const rgb = parts.slice(0, 3).map((p) => num(p, 255));
  const a = parts.length === 4 ? num(parts[3], 1) : 1;
  if (rgb.some(Number.isNaN) || Number.isNaN(a)) return null;
  return [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2]), a];
}

const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
const toHex = ([r, g, b]: Rgba | [number, number, number]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** Contrastul textului pe fundal; null dacă una din culori nu se poate folosi. */
function textContrast(color: string, background: string): { ratio: number; fg: string; bg: string; textIsLighter: boolean } | null {
  const fg = parseColor(color);
  const bg = parseColor(background);
  if (!fg || !bg) return null;
  // fundalul trebuie să fie opac (content.js îl rezolvă); altfel nu știm ce e dedesubt
  if (bg[3] < 0.99 || fg[3] <= 0.01) return null;
  // text semitransparent: îl amestecăm cu fundalul
  const a = fg[3];
  const mixed: [number, number, number] = [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)) as [number, number, number];
  const fgHex = toHex(mixed);
  const bgHex = toHex(bg);
  const lum = (c: [number, number, number] | Rgba) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return { ratio: contrastRatio(fgHex, bgHex), fg: fgHex, bg: bgHex, textIsLighter: lum(mixed) > lum(bg) };
}

// ── Text pentru om ──

const clean = (s: string | null | undefined) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

/** Textul elementului, scurtat la cel mult 40 de caractere, între „”. */
export function quote(text: string): string {
  const t = clean(text);
  const short = t.length > 40 ? `${t.slice(0, 39).trimEnd()}…` : t;
  return `„${short}”`;
}

/** Fără diacritice, litere mici, fără semne la capete. */
function normalize(s: string): string {
  return clean(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .replace(/\s+/g, " ");
}

const VAGUE_LINKS = new Set([
  "click aici",
  "clic aici",
  "apasa aici",
  "aici",
  "mai mult",
  "mai multe",
  "vezi mai mult",
  "vezi mai multe",
  "citeste mai mult",
  "citeste mai multe",
  "afla mai mult",
  "afla mai multe",
  "link",
  "detalii",
  "click",
  "click here",
  "here",
  "more",
  "read more",
  "learn more",
]);

export function isVagueLinkText(text: string): boolean {
  return VAGUE_LINKS.has(normalize(text));
}

const isActionEl = (e: ElementFacts) =>
  e.isLink || e.isButtonLike || e.tag === "button" || e.role === "button" || e.role === "link";

const isNamedControl = (e: ElementFacts) => e.isLink || e.tag === "button" || e.role === "button" || e.role === "link";

const isFakeButton = (e: ElementFacts) => e.isButtonLike && e.role !== "button" && e.role !== "link";

/** Cum îi spunem elementului în titlu: „Butonul „X””, „Linkul „X””, „Textul „X””. */
function subject(e: ElementFacts, text: string): string {
  if (e.isLink || e.role === "link") return `Linkul ${quote(text)}`;
  if (e.tag === "button" || e.role === "button" || e.isButtonLike) return `Butonul ${quote(text)}`;
  return `Textul ${quote(text)}`;
}

type Draft = Omit<Critique, "elementId" | "ruleId"> & { ruleId: CritiqueRule } & { el: ElementFacts | null };

const FAKE_BUTTON_AGENT =
  "Asistenții AI care comandă sau rezervă în numele clienților nu-și dau seama că e un buton. Aș folosi un buton real, accesibil și din tastatură.";

// ── Regulile pe element ──

function ruleContrast(e: ElementFacts): Draft | null {
  const text = clean(e.text);
  if (!text || e.isImage) return null;
  const c = textContrast(e.color, e.background);
  if (!c) return null;
  const weight = Number.isFinite(e.fontWeight) ? e.fontWeight : 400;
  const large = e.fontSizePx >= 24 || (e.fontSizePx >= 18.66 && weight >= 700);
  if (wcagLevel(c.ratio, large) !== "fail") return null;
  const action = isActionEl(e);
  const important = action && e.inFirstScreen;
  const fakeButton = isFakeButton(e);
  const fix = action
    ? c.textIsLighter
      ? "Aș închide fundalul, ca scrisul deschis să se vadă clar."
      : "Aș închide culoarea scrisului pe fundalul deschis."
    : c.textIsLighter
      ? "Aș închide fundalul, ca scrisul deschis să se vadă clar."
      : "Aș închide culoarea scrisului.";
  return {
    el: e,
    level: important ? "important" : "de-imbunatatit",
    ruleId: "contrast-slab",
    title: action ? `${subject(e, text)} abia se vede` : `${subject(e, text)} se citește greu`,
    body: action
      ? important
        ? "Scrisul se pierde pe fundal chiar în primul ecran."
        : "Scrisul se pierde pe fundal."
      : "Culoarea scrisului e prea apropiată de cea a fundalului.",
    fix,
    agent: fakeButton
      ? FAKE_BUTTON_AGENT
      : "Asistenții AI care se uită la pagină ca un om, din imagine, pot rata și ei ce abia se vede.",
    evidence: {
      contrast: c.ratio,
      needed: large ? 3 : 4.5,
      fontSizePx: e.fontSizePx,
      fontWeight: weight,
      color: c.fg,
      background: c.bg,
      ...(fakeButton ? { fakeButton: 1 } : {}),
    },
  };
}

function ruleNoName(e: ElementFacts): Draft | null {
  if (!isNamedControl(e) || e.isImage) return null;
  if (clean(e.accessibleName) || clean(e.text)) return null;
  const isLink = e.isLink || e.role === "link";
  return {
    el: e,
    level: e.inFirstScreen ? "important" : "de-imbunatatit",
    ruleId: "fara-nume",
    title: isLink ? "Un link n-are nume" : "Un buton n-are nume",
    body: `Acest ${isLink ? "link" : "buton"} nu are text sau nume accesibil care să spună ce face.`,
    fix: "Aș adăuga un nume accesibil care descrie acțiunea reală.",
    agent: `Asistenții AI nu folosesc un ${isLink ? "link" : "buton"} fără nume: nu știu ce face, așa că îl ocolesc.`,
    evidence: { tag: e.tag, w: Math.round(e.box.w), h: Math.round(e.box.h) },
  };
}

function ruleFakeButton(e: ElementFacts): Draft | null {
  if (!isFakeButton(e)) return null;
  const text = clean(e.text) || clean(e.accessibleName);
  return {
    el: e,
    level: "de-imbunatatit",
    ruleId: "buton-fals",
    title: text ? `${quote(text)} nu e un buton real` : "Un element apăsabil n-are rol de buton",
    body: "Elementul pare apăsabil, dar nu are rol de buton sau link.",
    fix: "Aș folosi un buton real, accesibil și din tastatură.",
    agent: "Asistenții AI care fac lucruri în numele clienților nu-și dau seama că se poate apăsa, așa că îl ocolesc.",
    evidence: { tag: e.tag },
  };
}

function ruleVagueLink(e: ElementFacts): Draft | null {
  if (!(e.isLink || e.role === "link")) return null;
  const text = clean(e.text) || clean(e.accessibleName);
  if (!text || !isVagueLinkText(text)) return null;
  return {
    el: e,
    level: "de-imbunatatit",
    ruleId: "link-vag",
    title: `${quote(text)} nu spune unde ajungi`,
    body: "Omul trebuie să ghicească ce găsește dacă apasă.",
    fix: "Aș numi linkul după destinația lui reală.",
    agent: `Asistenții AI aleg linkurile după ce scrie pe ele. Pe ${quote(text)} nu-l vor alege niciodată.`,
    evidence: { text: normalize(text), href: e.href ?? "" },
  };
}

function ruleImage(e: ElementFacts): Draft | null {
  if (!e.isImage || e.alt !== null || clean(e.accessibleName)) return null;
  const { w, h } = e.box;
  if (!(w >= LARGE_IMAGE_SIDE && h >= LARGE_IMAGE_SIDE && w * h >= LARGE_IMAGE_AREA)) return null;
  return {
    el: e,
    level: "marunt",
    ruleId: "imagine-fara-descriere",
    title: "Poza mare n-are descriere",
    body: "Cine nu vede poza, sau un motor de căutare, nu află ce arată.",
    fix: "Aș adăuga o descriere scurtă a imaginii, dacă transmite informație.",
    agent: "Un asistent AI nu poate citi poza, doar descrierea ei. Fără ea, nu știe ce vinzi.",
    evidence: { w: Math.round(w), h: Math.round(h) },
  };
}

function ruleSmallText(e: ElementFacts): Draft | null {
  const text = clean(e.text);
  if (!text || e.isImage || !Number.isFinite(e.fontSizePx) || e.fontSizePx <= 0 || e.fontSizePx >= MIN_FONT_PX) return null;
  return {
    el: e,
    level: isActionEl(e) ? "de-imbunatatit" : "marunt",
    ruleId: "text-mic",
    title: `${subject(e, text)} e scris prea mic`,
    body: "Se citește greu, mai ales pe telefon și de către cei care nu mai văd bine.",
    fix: "Aș mări scrisul mic pentru a-l face mai ușor de citit.",
    agent: "Asistenții AI care se uită la pagină din imagine pot citi greșit un scris atât de mic.",
    evidence: { fontSizePx: e.fontSizePx, min: MIN_FONT_PX },
  };
}

function ruleHeadingLike(e: ElementFacts): Draft | null {
  const text = clean(e.text);
  if (!e.isHeadingLike || !text) return null;
  return {
    el: e,
    level: "de-imbunatatit",
    ruleId: "titlu-nemarcat",
    title: `${quote(text)} nu e marcat ca titlu`,
    body: "Textul arată ca un titlu, dar nu este marcat ca atare în structura paginii.",
    fix: "Aș marca acest text ca titlu al secțiunii.",
    agent: "Asistenții AI se orientează după titluri. Pe acesta nu-l văd, așa că nu știu unde începe partea asta din pagină.",
    evidence: { fontSizePx: e.fontSizePx },
  };
}

const ELEMENT_RULES = [ruleNoName, ruleContrast, ruleFakeButton, ruleVagueLink, ruleHeadingLike, ruleSmallText, ruleImage];

// ── Regulile pe pagină ──

function pageRules(page: PageFacts, els: ElementFacts[]): Draft[] {
  const out: Draft[] = [];
  const h1 = Number.isFinite(page.h1Count) ? page.h1Count : 0;
  if (h1 === 0) {
    // titlul vizual cel mai mare din primul ecran: acolo aterizează uliul
    let best: ElementFacts | null = null;
    for (const e of els) {
      if (!e.isHeadingLike || !e.inFirstScreen || !clean(e.text)) continue;
      if (!best || e.fontSizePx > best.fontSizePx || (e.fontSizePx === best.fontSizePx && e.box.y < best.box.y)) best = e;
    }
    out.push({
      el: best,
      level: "de-imbunatatit",
      ruleId: "pagina-fara-titlu",
      title: best ? `Titlul ${quote(best.text)} nu e marcat` : "Pagina n-are un titlu principal",
      body: best
        ? "Arată ca titlul paginii, dar pagina nu are niciun titlu marcat ca principal."
        : "Pagina nu are niciun titlu marcat ca principal.",
      fix: best
        ? "Aș marca acest text ca titlu principal al paginii."
        : "Aș adăuga un titlu principal care spune ce oferă pagina.",
      agent: "Pentru asistenții AI, titlul principal spune despre ce e pagina. Fără el, nu știu sigur ce oferi.",
      evidence: { h1Count: 0, ...(best ? { fontSizePx: best.fontSizePx } : {}) },
    });
  } else if (h1 > 1) {
    out.push({
      el: null,
      level: "marunt",
      ruleId: "mai-multe-titluri",
      title: "Pagina are mai multe titluri principale",
      body: "Mai multe texte sunt marcate ca titlul paginii, așa că nu e clar care e cel adevărat.",
      fix: "Aș păstra un titlu principal și aș marca restul drept subtitluri.",
      agent: "Asistenții AI nu știu pe care să-l creadă când rezumă pagina.",
      evidence: { h1Count: h1 },
    });
  }
  if (!clean(page.metaDescription)) {
    out.push({
      el: null,
      level: "de-imbunatatit",
      ruleId: "fara-descriere",
      title: "Pagina n-are o descriere",
      body: "Lipsește descrierea scurtă pe care motoarele de căutare o pot folosi în rezultate.",
      fix: "Aș adăuga o descriere scurtă, fidelă conținutului paginii.",
      agent: "Asistenții AI citesc descrierea ca să afle repede despre ce e pagina. Fără ea, ghicesc din bucăți.",
      evidence: { length: 0 },
    });
  }
  if (!Array.isArray(page.jsonLdTypes) || page.jsonLdTypes.length === 0) {
    out.push({
      el: null,
      level: "de-imbunatatit",
      ruleId: "fara-date-structurate",
      title: "Lipsesc datele structurate ale afacerii",
      body: "Nu am găsit date structurate pentru motoare de căutare și asistenți AI.",
      fix: "Aș structura informațiile verificate din pagină pentru căutare și asistenți AI.",
      agent: "Asistenții AI nu găsesc direct programul, adresa, prețurile. Când cineva întreabă „e deschis acum?”, nu pot răspunde sigur.",
      evidence: { types: 0 },
    });
  }
  if (!clean(page.lang)) {
    out.push({
      el: null,
      level: "marunt",
      ruleId: "fara-limba",
      title: "Pagina nu spune în ce limbă e",
      body: "Limba paginii nu este declarată; cititoarele de ecran pot pronunța greșit textul.",
      fix: "Aș declara limba reală a paginii.",
      agent: "Asistenții AI pot traduce sau rezuma greșit dacă nu știu limba paginii.",
      evidence: { lang: "" },
    });
  }
  return out;
}

// ── Asamblarea ──

const isVisible = (e: ElementFacts) =>
  !!e && !!e.box && Number.isFinite(e.box.w) && Number.isFinite(e.box.h) && e.box.w > 0 && e.box.h > 0;

const graver = (a: Draft, b: Draft) =>
  LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId];

// în nivel: primul ecran întâi, apoi de sus în jos; criticile de pagină la urmă
function compareOrder(a: Draft, b: Draft): number {
  const lv = LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
  if (lv) return lv;
  if (!a.el || !b.el) {
    if (a.el) return -1;
    if (b.el) return 1;
    return RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId];
  }
  const fs = Number(b.el.inFirstScreen) - Number(a.el.inFirstScreen);
  if (fs) return fs;
  return a.el.box.y - b.el.box.y || a.el.box.x - b.el.box.x || RULE_RANK[a.ruleId] - RULE_RANK[b.ruleId];
}

/**
 * Criticile paginii, cel mult 5, ordonate: important, de îmbunătățit, mărunt.
 * Cel mult una pe element (cea mai gravă) și cel mult una din aceeași regulă.
 * `viewport` e păstrat pentru reguli care țin de ecran; acum folosim `inFirstScreen` dat de content.js.
 */
export function critiquePage(page: PageFacts, els: ElementFacts[], viewport: { w: number; h: number }): Critique[] {
  void viewport;
  const list = Array.isArray(els) ? els : [];
  const pageDrafts = pageRules(page ?? ({} as PageFacts), list.filter(isVisible));

  // cea mai gravă critică pe fiecare element
  const best = new Map<string, Draft>();
  const consider = (d: Draft) => {
    if (!d.el) return;
    const prev = best.get(d.el.id);
    if (!prev || graver(d, prev) < 0) best.set(d.el.id, d);
  };
  for (const d of pageDrafts) consider(d);
  for (const e of list) {
    if (!isVisible(e)) continue;
    for (const rule of ELEMENT_RULES) {
      const d = rule(e);
      if (d) consider(d);
    }
  }

  const drafts = [...best.values(), ...pageDrafts.filter((d) => !d.el)].sort(compareOrder);
  const selected: Draft[] = [];
  const seenRules = new Set<CritiqueRule>();
  const seenElements = new Set<string>();
  const seenFamilies = new Set<string>();
  // Aproximare conservatoare din fapte, fără a presupune componente DOM comune.
  // Ignorăm eticheta și culoarea scrisului: meniurile repetă forma, dar au texte diferite.
  const family = (e: ElementFacts | null) => e && isActionEl(e)
    ? JSON.stringify([e.tag, e.role, e.isButtonLike, e.isLink, e.fontSizePx, e.fontWeight, e.background, Math.round(e.box.h)])
    : null;
  const add = (d: Draft) => {
    const key = family(d.el);
    if (selected.length >= MAX_CRITIQUES || seenRules.has(d.ruleId)
      || (d.el && seenElements.has(d.el.id)) || (key && seenFamilies.has(key))) return;
    selected.push(d);
    seenRules.add(d.ruleId);
    if (d.el) seenElements.add(d.el.id);
    if (key) seenFamilies.add(key);
  };
  // Păstrăm cea mai importantă problemă locală; rezervăm apoi loc structurii și descoperirii.
  const firstElement = drafts.find((d) => d.el && !pageDrafts.includes(d));
  if (firstElement) add(firstElement);
  for (const d of pageDrafts.slice().sort(graver)) add(d);
  for (const d of drafts) add(d);
  const out: Critique[] = selected.sort(compareOrder).map(({ el, ...rest }) => ({
    elementId: el ? el.id : null,
    ...rest,
  }));
  return out;
}

/** Numărul constatărilor din verificările făcute, fără a pretinde un audit complet. */
export function summarySentence(crits: Critique[]): string {
  const n = Array.isArray(crits) ? crits.length : 0;
  if (n === 0) return "N-am găsit probleme la verificările făcute.";
  if (n === 1) return "Am găsit un lucru de îmbunătățit.";
  const de = n % 100 === 0 || n % 100 >= 20 ? "de " : "";
  return `Am găsit ${n} ${de}lucruri de îmbunătățit.`;
}

/** Doar propuneri provenite din constatări, în ordinea lor, fără schimbări inventate. */
export function modificationSuggestions(crits: Critique[]): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(crits) ? crits : []) {
    const fix = clean(c.fix);
    const key = normalize(fix);
    if (!fix || seen.has(key)) continue;
    seen.add(key);
    suggestions.push(fix);
    if (suggestions.length === 3) break;
  }
  return suggestions;
}
