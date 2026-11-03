import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import {
  bodySize,
  buildPages,
  detectOutline,
  documentContext,
  linesFromItems,
  type ParsedDocument,
  type PdfLine,
  type PdfTextItem,
  sectionsOf,
  verifyCitations,
} from "../src/lib/documents";

async function parseSample(): Promise<ParsedDocument> {
  const data = new Uint8Array(readFileSync(new URL("../public/samples/caiet-de-sarcini-exemplu.pdf", import.meta.url)));
  const pdf = await getDocument({ data }).promise;
  const byPage: PdfLine[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    byPage.push(linesFromItems(content.items as unknown as PdfTextItem[], i));
  }
  const pages = buildPages(byPage);
  return { name: "caiet.pdf", pages, ...detectOutline(pages.flatMap((p) => p.lines)) };
}

describe("PDF exemplu (pdf.js real)", async () => {
  const doc = await parseSample();

  it("detectează titlul documentului", () =>
    expect(doc.title).toBe("Caiet de sarcini: platformă web pentru programări online"));

  it("detectează H1 și H2 cu paginile corecte", () => {
    const find = (t: string) => doc.outline.find((h) => h.text.startsWith(t));
    expect(find("2. Cerințe de calificare")).toMatchObject({ level: "H1", page: 1 });
    expect(find("2.2 Capacitatea tehnică")).toMatchObject({ level: "H2", page: 1 });
    expect(find("4. Documente de depus")).toMatchObject({ level: "H1", page: 2 });
    expect(find("5.1 Depunerea ofertelor")).toMatchObject({ level: "H2", page: 3 });
    expect(doc.outline.some((h) => h.text.startsWith("Autoritatea contractantă"))).toBe(false);
  });

  it("împarte documentul în secțiuni cu textul lor", () => {
    const s = sectionsOf(doc).find((x) => x.heading.text.startsWith("5.1"));
    expect(s?.text).toContain("20 noiembrie 2026");
  });

  it("verifică citatele: corect, pagină greșită, inventat", () => {
    const [ok, moved, fake] = verifyCitations(
      [
        { page: 1, quote: "cel puțin două contracte similare finalizate în ultimii trei ani" },
        { page: 1, quote: "Garanția de participare este de 1.800 lei" },
        { page: 2, quote: "Ofertantul trebuie să aibă certificare ISO 9001" },
      ],
      doc.pages,
    );
    expect(ok).toMatchObject({ verified: true, corrected: false, page: 1 });
    expect(moved).toMatchObject({ verified: true, corrected: true, page: 2 });
    expect(fake).toMatchObject({ verified: false });
  });

  it("contextul are markere de pagină și respectă bugetul", () => {
    expect(documentContext(doc)).toContain("[p. 3]");
    const short = documentContext(doc, 400);
    expect(short.length).toBeLessThan(600);
    expect(short).toContain("documentul continuă");
  });
});

describe("logica de linii și cuprins", () => {
  const item = (str: string, x: number, y: number, h: number): PdfTextItem => ({ str, transform: [h, 0, 0, h, x, y], height: h });

  it("unește bucățile de pe aceeași linie, de la stânga la dreapta", () => {
    const lines = linesFromItems([item("lume", 60, 700, 10), item("Salut", 10, 700.5, 10), item("Jos", 10, 600, 10)], 1);
    expect(lines.map((l) => l.text)).toEqual(["Salut lume", "Jos"]);
  });

  it("mărimea corpului e cea cu cele mai multe caractere", () => {
    const lines = [
      { page: 1, y: 1, size: 20, text: "Titlu" },
      { page: 1, y: 2, size: 10, text: "un paragraf lung de text obișnuit" },
    ];
    expect(bodySize(lines)).toBe(10);
  });
});
