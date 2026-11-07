import { describe, expect, it } from "vitest";
import type { CampaignPick } from "../src/lib/campaign";
import type { PageElement, PageSummary } from "../src/lib/extensionBridge";
import {
  estimateViewport,
  foundSentence,
  KIND_LABEL,
  picksReply,
  readSentence,
  revealDelay,
  SCAN_MIN_MS,
  SCAN_TIMEOUT_MS,
  scanRequest,
} from "../src/lib/extensionPanel";

function el(over: Partial<PageElement> & { id: string }): PageElement {
  return {
    tag: "div",
    text: "",
    box: { x: 0, y: 0, w: 100, h: 30 },
    styles: { color: "#111", background: "transparent", fontFamily: "Inter", fontSize: "16px", fontWeight: "400" },
    inFirstScreen: true,
    ...over,
  };
}

const pick = (kind: CampaignPick["kind"], id: string = kind): CampaignPick => ({ elementId: id, kind, score: 1, reason: `motiv ${kind}` });

function page(headings: number, ctas: number): PageSummary {
  return {
    url: "https://exemplu.ro/",
    title: "Exemplu",
    headings: Array.from({ length: headings }, (_, i) => `Titlu ${i}`),
    ctas: Array.from({ length: ctas }, (_, i) => `Buton ${i}`),
    colors: [],
    fonts: [],
  };
}

describe("constantele", () => {
  it("lupa stă cel puțin 1,8 s, iar pagina are 5 s să răspundă", () => {
    expect(SCAN_MIN_MS).toBe(1800);
    expect(SCAN_TIMEOUT_MS).toBe(5000);
  });
});

describe("revealDelay", () => {
  it("datele venite repede așteaptă până la SCAN_MIN_MS de la apăsare", () => {
    expect(revealDelay(1000, 1300)).toBe(1500);
  });
  it("datele venite târziu se arată imediat", () => {
    expect(revealDelay(1000, 1000 + SCAN_MIN_MS)).toBe(0);
    expect(revealDelay(1000, 9000)).toBe(0);
  });
});

describe("estimateViewport", () => {
  it("fără elemente: minimul, 320 × 480", () => {
    expect(estimateViewport([])).toEqual({ w: 320, h: 480 });
  });

  it("lățimea = cea mai mare margine dreaptă; înălțimea = cea mai mare margine de jos din primul ecran", () => {
    const els = [
      el({ id: "a", box: { x: 0, y: 0, w: 1280, h: 80 } }),
      el({ id: "b", box: { x: 100, y: 200, w: 400, h: 520 } }),
      // sub primul ecran: nu contează pentru înălțime
      el({ id: "c", box: { x: 0, y: 900, w: 600, h: 400 }, inFirstScreen: false }),
    ];
    expect(estimateViewport(els)).toEqual({ w: 1280, h: 720 });
  });

  it("casetele mici nu coboară sub minim", () => {
    expect(estimateViewport([el({ id: "a", box: { x: 10, y: 10, w: 50, h: 20 } })])).toEqual({ w: 320, h: 480 });
  });

  it("casetele uriașe (un wrapper cât pagina) sunt plafonate", () => {
    const v = estimateViewport([el({ id: "a", box: { x: 0, y: 0, w: 9000, h: 20000 } })]);
    expect(v.w).toBeLessThanOrEqual(2560);
    expect(v.h).toBeLessThanOrEqual(1600);
    expect(v.w).toBeGreaterThanOrEqual(320);
    expect(v.h).toBeGreaterThanOrEqual(480);
  });
});

describe("KIND_LABEL", () => {
  it("are eticheta în română pentru fiecare rol", () => {
    expect(KIND_LABEL).toEqual({ hero: "hero-ul", offer: "oferta", mascot: "mascota", cta: "butonul", badge: "insigna" });
  });
});

describe("foundSentence", () => {
  it("zero alegeri: îndeamnă la „Decupează”", () => {
    expect(foundSentence([])).toBe("N-am găsit nimic potrivit pe pagina asta. Încearcă „Decupează”.");
  });
  it("o alegere", () => {
    expect(foundSentence([pick("hero")])).toBe("Am găsit un lucru bun pentru o campanie: hero-ul.");
  });
  it("două alegeri: „X și Y”", () => {
    expect(foundSentence([pick("hero"), pick("cta")])).toBe("Am găsit 2 lucruri bune pentru o campanie: hero-ul și butonul.");
  });
  it("patru alegeri: „X, Y, Z și W”", () => {
    expect(foundSentence([pick("hero"), pick("offer"), pick("mascot"), pick("cta")])).toBe(
      "Am găsit 4 lucruri bune pentru o campanie: hero-ul, oferta, mascota și butonul.",
    );
  });
  it("același rol de două ori se spune o dată, cu numărul", () => {
    expect(foundSentence([pick("hero"), pick("offer", "o1"), pick("offer", "o2")])).toBe("Am găsit 3 lucruri bune pentru o campanie: hero-ul și 2 oferte.");
  });
});

describe("readSentence", () => {
  it("pluralul românesc: 1, 2–19, apoi „de” de la 20", () => {
    expect(readSentence(page(6, 4), 143)).toBe("Am citit 143 de elemente, 6 titluri, 4 butoane.");
    expect(readSentence(page(1, 1), 1)).toBe("Am citit 1 element, 1 titlu, 1 buton.");
    expect(readSentence(page(2, 2), 2)).toBe("Am citit 2 elemente, 2 titluri, 2 butoane.");
    expect(readSentence(page(19, 19), 19)).toBe("Am citit 19 elemente, 19 titluri, 19 butoane.");
    expect(readSentence(page(20, 20), 20)).toBe("Am citit 20 de elemente, 20 de titluri, 20 de butoane.");
  });
  it("101–119 fără „de”, 100 și 200 cu „de”, 0 fără", () => {
    expect(readSentence(page(0, 0), 101)).toBe("Am citit 101 elemente, 0 titluri, 0 butoane.");
    expect(readSentence(page(0, 0), 100)).toBe("Am citit 100 de elemente, 0 titluri, 0 butoane.");
    expect(readSentence(page(0, 0), 200)).toBe("Am citit 200 de elemente, 0 titluri, 0 butoane.");
  });
});

describe("mesajele spre extensie", () => {
  it("cererea de scanare", () => {
    expect(scanRequest()).toEqual({ type: "spire:scan" });
  });
  it("alegerile, așa cum le așteaptă content.js", () => {
    const picks = [pick("hero")];
    expect(picksReply(picks)).toEqual({ type: "spire:picks", picks });
  });
});
