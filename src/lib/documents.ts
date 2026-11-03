// Documente PDF → date structurate, fără AI acolo unde se poate (determinist, verificabil):
//  - linii de text pe pagini, cu mărimea fontului
//  - cuprins (titlu + H1/H2/H3 cu pagina), ca în Adobe India Hackathon 2025 „Connecting the Dots" 1A
//  - verificarea citărilor date de AI: citatul chiar există în pagina indicată?
// Partea care depinde de browser (pdf.js) e în src/modules/documents/pdfjs.ts.

export interface PdfTextItem {
  str: string;
  /** matricea de transformare pdf.js: [a, b, c, d, x, y] */
  transform: number[];
  height: number;
  hasEOL?: boolean;
}

export interface PdfLine {
  page: number;
  text: string;
  /** mărimea fontului (aprox. înălțimea textului) */
  size: number;
  y: number;
}

export interface PdfPage {
  page: number;
  text: string;
  lines: PdfLine[];
}

export interface Heading {
  level: "H1" | "H2" | "H3";
  text: string;
  page: number;
}

export interface DocOutline {
  title: string;
  outline: Heading[];
}

export interface ParsedDocument extends DocOutline {
  name: string;
  pages: PdfPage[];
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Grupează bucățile de text pdf.js în linii (același y ± toleranță), de sus în jos. */
export function linesFromItems(items: PdfTextItem[], page: number): PdfLine[] {
  const rows: Array<{ y: number; parts: Array<{ x: number; str: string }>; size: number }> = [];
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const size = Math.abs(it.height || it.transform[3] || 0);
    const tol = Math.max(2, size * 0.4);
    let row = rows.find((r) => Math.abs(r.y - y) <= tol);
    if (!row) {
      row = { y, parts: [], size: 0 };
      rows.push(row);
    }
    row.parts.push({ x, str: it.str });
    row.size = Math.max(row.size, size);
  }
  return rows
    .sort((a, b) => b.y - a.y) // în PDF, y crește în sus
    .map((r) => ({
      page,
      y: r.y,
      size: Math.round(r.size * 10) / 10,
      text: clean(
        r.parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" "),
      ),
    }))
    .filter((l) => l.text.length > 0);
}

/** Mărimea „corpului de text": mărimea care acoperă cele mai multe caractere. */
export function bodySize(lines: PdfLine[]): number {
  const weight = new Map<number, number>();
  for (const l of lines) weight.set(l.size, (weight.get(l.size) ?? 0) + l.text.length);
  let best = 0;
  let bestW = -1;
  for (const [size, w] of weight) if (w > bestW) [best, bestW] = [size, w];
  return best || 10;
}

/**
 * Cuprins din mărimea fontului: liniile vizibil mai mari decât corpul de text și scurte
 * devin titluri; cele mai mari 3 mărimi devin H1, H2, H3. Titlul documentului = cea mai
 * mare linie de pe prima pagină.
 */
export function detectOutline(input: PdfLine[]): DocOutline {
  if (!input.length) return { title: "", outline: [] };
  const body = bodySize(input);
  const big = (l: PdfLine) => l.size >= body * 1.15;
  // titlurile lungi se rup pe mai multe rânduri: le unim (aceeași mărime, rânduri consecutive)
  const lines: PdfLine[] = [];
  for (const l of input) {
    const prev = lines[lines.length - 1];
    if (prev && big(prev) && big(l) && prev.page === l.page && prev.size === l.size && prev.y - l.y <= l.size * 1.8) {
      lines[lines.length - 1] = { ...prev, text: `${prev.text} ${l.text}` };
    } else {
      lines.push(l);
    }
  }
  const isHeadingLike = (l: PdfLine) => big(l) && l.text.length <= 160 && !/[.;:,]$/.test(l.text) && /\p{L}/u.test(l.text);

  const firstPage = Math.min(...lines.map((l) => l.page));
  const firstLines = lines.filter((l) => l.page === firstPage);
  const maxFirst = Math.max(...firstLines.map((l) => l.size));
  const titleLine = firstLines.find((l) => l.size === maxFirst && isHeadingLike(l));

  const candidates = lines.filter((l) => isHeadingLike(l) && l !== titleLine);
  const sizes = [...new Set(candidates.map((l) => l.size))].sort((a, b) => b - a).slice(0, 3);
  const levels: Heading["level"][] = ["H1", "H2", "H3"];
  const outline = candidates
    .filter((l) => sizes.includes(l.size))
    .map((l) => ({ level: levels[sizes.indexOf(l.size)], text: l.text, page: l.page }));

  return { title: titleLine?.text ?? "", outline };
}

export function buildPages(linesByPage: PdfLine[][]): PdfPage[] {
  return linesByPage.map((lines, i) => ({
    page: lines[0]?.page ?? i + 1,
    lines,
    text: lines.map((l) => l.text).join("\n"),
  }));
}

/** Secțiunile documentului: textul dintre două titluri, cu pagina de început. */
export function sectionsOf(doc: ParsedDocument): Array<{ heading: Heading; text: string }> {
  const all = doc.pages.flatMap((p) => p.lines);
  const result: Array<{ heading: Heading; text: string }> = [];
  let current: { heading: Heading; parts: string[] } | null = null;
  for (const line of all) {
    // titlurile unite din mai multe rânduri încep cu textul primului rând
    const h = doc.outline.find((o) => o.page === line.page && (o.text === line.text || o.text.startsWith(`${line.text} `)));
    if (h) {
      if (current) result.push({ heading: current.heading, text: current.parts.join(" ") });
      current = { heading: h, parts: [] };
    } else if (current && line.text !== doc.title) {
      current.parts.push(line.text);
    }
  }
  if (current) result.push({ heading: current.heading, text: current.parts.join(" ") });
  return result;
}

/**
 * Textul documentului pentru prompt, cu markere de pagină [p. N], tăiat la un buget de caractere
 * (spune explicit dacă a tăiat, ca modelul să nu inventeze restul).
 */
export function documentContext(doc: ParsedDocument, maxChars = 60_000): string {
  let out = "";
  for (const p of doc.pages) {
    const block = `\n[p. ${p.page}]\n${p.text}\n`;
    if (out.length + block.length > maxChars) {
      out += `\n[… documentul continuă după pagina ${p.page - 1}; restul nu a fost inclus]`;
      break;
    }
    out += block;
  }
  return out.trim();
}

// ── Verificarea citărilor ──
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[„”"'`«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface Citation {
  page: number;
  quote: string;
}

export interface VerifiedCitation extends Citation {
  /** citatul a fost găsit în document */
  verified: boolean;
  /** pagina a fost corectată (AI-ul a indicat altă pagină) */
  corrected: boolean;
}

/**
 * Răspunsul la „ce faceți când AI-ul greșește?": fiecare citat e căutat în text.
 * Dacă e pe altă pagină, pagina se corectează; dacă nu există deloc, e marcat neverificat.
 */
export function verifyCitations(citations: Citation[], pages: PdfPage[]): VerifiedCitation[] {
  return citations.map((c) => {
    const q = norm(c.quote);
    // acceptăm și citate scurtate: primele ~60 de caractere trebuie să apară
    const probe = q.length > 60 ? q.slice(0, 60) : q;
    if (!probe) return { ...c, verified: false, corrected: false };
    const onPage = pages.find((p) => p.page === c.page);
    if (onPage && norm(onPage.text).includes(probe)) return { ...c, verified: true, corrected: false };
    const other = pages.find((p) => norm(p.text).includes(probe));
    if (other) return { ...c, page: other.page, verified: true, corrected: true };
    return { ...c, verified: false, corrected: false };
  });
}
