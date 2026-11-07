import { describe, expect, it } from "vitest";
import {
  critiquePage,
  summarySentence,
  type Critique,
  type ElementFacts,
  type PageFacts,
} from "../src/lib/critique";

// Pagina „curată”: nimic de criticat la nivel de pagină.
function page(over: Partial<PageFacts> = {}): PageFacts {
  return {
    url: "https://gelateria.ro/",
    title: "Gelateria Uliu",
    lang: "ro",
    metaDescription: "Înghețată făcută în fiecare dimineață, în centrul Clujului.",
    jsonLdTypes: ["IceCreamShop"],
    h1Count: 1,
    imagesWithoutAlt: 0,
    ...over,
  };
}

let seq = 0;
// Un element „curat”: text negru pe alb, mărime normală, în primul ecran.
function el(over: Partial<ElementFacts> = {}): ElementFacts {
  seq += 1;
  return {
    id: `e${seq}`,
    tag: "p",
    role: "",
    text: "Înghețată făcută azi",
    accessibleName: "",
    fontSizePx: 16,
    fontWeight: 400,
    color: "#111111",
    background: "#ffffff",
    box: { x: 20, y: 100, w: 300, h: 24 },
    inFirstScreen: true,
    isLink: false,
    href: null,
    isButtonLike: false,
    isImage: false,
    alt: null,
    isHeadingLike: false,
    ...over,
  };
}

const VIEW = { w: 1280, h: 800 };
const rules = (cs: Critique[]) => cs.map((c) => c.ruleId);
const run = (els: ElementFacts[], p: PageFacts = page()) => critiquePage(p, els, VIEW);

describe("critica: contrast", () => {
  it("text gri deschis pe alb: de îmbunătățit, cu cifrele doar în evidence", () => {
    const e = el({ color: "#cccccc", text: "Programul: L–V 10–20" });
    const [c] = run([e]);
    expect(c.ruleId).toBe("contrast-slab");
    expect(c.elementId).toBe(e.id);
    expect(c.level).toBe("de-imbunatatit");
    expect(c.evidence.contrast).toBeLessThan(4.5);
    expect(c.evidence.needed).toBe(4.5);
    expect(c.title).toContain("„Programul: L–V 10–20”");
  });
  it("buton din primul ecran cu contrast slab: important", () => {
    const e = el({ tag: "button", role: "button", text: "Comandă acum", accessibleName: "Comandă acum", color: "#f9c0d0" });
    const [c] = run([e]);
    expect(c.ruleId).toBe("contrast-slab");
    expect(c.level).toBe("important");
  });
  it("același buton, dar mai jos pe pagină: de îmbunătățit", () => {
    const e = el({ tag: "button", role: "button", text: "Comandă", accessibleName: "Comandă", color: "#f9c0d0", inFirstScreen: false, box: { x: 0, y: 2000, w: 100, h: 40 } });
    expect(run([e])[0].level).toBe("de-imbunatatit");
  });
  it("text mare are pragul mai mic (3)", () => {
    // ~3.5 între #888 și alb
    const big = el({ color: "#888888", fontSizePx: 32, fontWeight: 400 });
    const small = el({ color: "#888888", fontSizePx: 16 });
    const boldish = el({ color: "#888888", fontSizePx: 19, fontWeight: 700 });
    const out = run([big, small, boldish]);
    expect(out.map((c) => c.elementId)).toEqual([small.id]);
  });
  it("contrast bun nu e criticat; formate rgb() și rgba() sunt înțelese", () => {
    expect(run([el({ color: "rgb(17, 17, 17)", background: "rgb(255,255,255)" })])).toEqual([]);
    expect(rules(run([el({ color: "rgb(204 204 204)", background: "rgba(255, 255, 255, 1)" })]))).toEqual(["contrast-slab"]);
  });
  it("culori invalide sau transparente sunt sărite, fără excepții", () => {
    const bad = [
      el({ color: "transparent" }),
      el({ background: "rgba(0, 0, 0, 0)" }),
      el({ color: "nu-e-culoare", background: "" }),
      el({ color: "#zzz" }),
      el({ background: "rgba(255,255,255,0.5)" }),
      el({ color: "var(--x)" }),
    ];
    expect(() => run(bad)).not.toThrow();
    expect(run(bad)).toEqual([]);
  });
  it("text semitransparent e amestecat cu fundalul", () => {
    // negru la 20% pe alb arată gri deschis
    expect(rules(run([el({ color: "rgba(0,0,0,0.2)" })]))).toEqual(["contrast-slab"]);
  });
});

describe("critica: buton fals", () => {
  it("element apăsabil fără rol de buton", () => {
    const e = el({ tag: "div", text: "Rezervă o masă", accessibleName: "Rezervă o masă", isButtonLike: true });
    const [c] = run([e]);
    expect(c.ruleId).toBe("buton-fals");
    expect(c.title).toContain("„Rezervă o masă”");
  });
  it("cu rol de buton pus corect nu e criticat", () => {
    expect(run([el({ tag: "div", role: "button", text: "Rezervă", accessibleName: "Rezervă", isButtonLike: true })])).toEqual([]);
  });
});

describe("critica: link vag", () => {
  const link = (text: string) => el({ tag: "a", role: "link", isLink: true, href: "/arome", text, accessibleName: text });
  it.each(["click aici", "Click AICI", "Aici", "mai mult", "Citește mai mult", "citeste mai mult…", "Află mai multe »", "link", "Detalii", "Read more"])(
    "„%s” e vag",
    (t) => {
      expect(rules(run([link(t)]))).toEqual(["link-vag"]);
    },
  );
  it("un link care spune ce găsești nu e criticat", () => {
    expect(run([link("Vezi aromele de azi"), link("Detalii despre livrare")])).toEqual([]);
  });
});

describe("critica: imagine fără descriere", () => {
  it("imagine ARIA cu nume accesibil: nu cere încă o descriere", () => {
    const labelled = el({ tag: "svg", role: "img", isImage: true, text: "", alt: null,
      accessibleName: "Logo Gelateria Uliu", box: { x: 0, y: 200, w: 300, h: 100 } });
    expect(run([labelled])).toEqual([]);
  });
  it("poză mare fără descriere", () => {
    const e = el({ tag: "img", role: "img", isImage: true, text: "", alt: null, box: { x: 0, y: 200, w: 600, h: 400 } });
    const [c] = run([e]);
    expect(c.ruleId).toBe("imagine-fara-descriere");
    expect(c.level).toBe("marunt");
  });
  it("poză mică, poză decorativă (descriere goală) sau poză descrisă: nimic", () => {
    const small = el({ tag: "img", isImage: true, text: "", alt: null, box: { x: 0, y: 0, w: 24, h: 24 } });
    const decor = el({ tag: "img", isImage: true, text: "", alt: "", box: { x: 0, y: 0, w: 600, h: 400 } });
    const ok = el({ tag: "img", isImage: true, text: "", alt: "Cupă cu trei arome", box: { x: 0, y: 0, w: 600, h: 400 } });
    expect(run([small, decor, ok])).toEqual([]);
  });
});

describe("critica: text mic", () => {
  it("sub 12 e mărunt", () => {
    const e = el({ fontSizePx: 10, text: "Termeni și condiții" });
    const [c] = run([e]);
    expect(c.ruleId).toBe("text-mic");
    expect(c.level).toBe("marunt");
    expect(c.evidence.fontSizePx).toBe(10);
  });
  it("12 e în regulă", () => {
    expect(run([el({ fontSizePx: 12 })])).toEqual([]);
  });
});

describe("critica: titluri", () => {
  it("text mare care arată a titlu, dar nu e marcat", () => {
    const e = el({ tag: "div", text: "Aromele săptămânii", fontSizePx: 30, fontWeight: 700, isHeadingLike: true });
    expect(rules(run([e]))).toEqual(["titlu-nemarcat"]);
  });
  it("fără titlu principal pe pagină: critica stă pe cel mai mare titlu vizual din primul ecran", () => {
    const small = el({ tag: "div", text: "Despre noi", fontSizePx: 24, isHeadingLike: true, box: { x: 0, y: 50, w: 200, h: 30 } });
    const big = el({ tag: "div", text: "Gelateria Uliu", fontSizePx: 48, isHeadingLike: true, box: { x: 0, y: 120, w: 400, h: 60 } });
    const out = run([small, big], page({ h1Count: 0 }));
    const t = out.find((c) => c.ruleId === "pagina-fara-titlu")!;
    expect(t.elementId).toBe(big.id);
    expect(t.title).toContain("„Gelateria Uliu”");
    // cel mic primește critica lui separată
    expect(out.find((c) => c.elementId === small.id)?.ruleId).toBe("titlu-nemarcat");
    // pe cel mare doar una (cea mai gravă)
    expect(out.filter((c) => c.elementId === big.id)).toHaveLength(1);
  });
  it("fără titlu principal și fără titlu vizual: critică la nivel de pagină", () => {
    const out = run([], page({ h1Count: 0 }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ruleId: "pagina-fara-titlu", elementId: null });
  });
  it("mai multe titluri principale: mărunt, la nivel de pagină", () => {
    const out = run([], page({ h1Count: 3 }));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ruleId: "mai-multe-titluri", elementId: null, level: "marunt" });
    expect(out[0].evidence.h1Count).toBe(3);
  });
  it("un singur titlu principal: nimic", () => {
    expect(run([], page({ h1Count: 1 }))).toEqual([]);
  });
});

describe("critica: fără nume", () => {
  it("buton fără nume în primul ecran: important", () => {
    const e = el({ tag: "button", role: "button", text: "", accessibleName: "" });
    const [c] = run([e]);
    expect(c.ruleId).toBe("fara-nume");
    expect(c.level).toBe("important");
  });
  it("link fără nume mai jos: de îmbunătățit", () => {
    const e = el({ tag: "a", role: "link", isLink: true, href: "/x", text: "", accessibleName: "  ", inFirstScreen: false, box: { x: 0, y: 3000, w: 20, h: 20 } });
    const [c] = run([e]);
    expect(c.ruleId).toBe("fara-nume");
    expect(c.level).toBe("de-imbunatatit");
  });
  it("buton cu nume (de exemplu dintr-o etichetă ascunsă) nu e criticat", () => {
    expect(run([el({ tag: "button", role: "button", text: "", accessibleName: "Caută" })])).toEqual([]);
  });
});

describe("critica: pagina", () => {
  it("lipsesc descrierea, limba și datele structurate", () => {
    const out = run([], page({ metaDescription: " ", lang: "", jsonLdTypes: [] }));
    expect(new Set(rules(out))).toEqual(new Set(["fara-descriere", "fara-limba", "fara-date-structurate"]));
    expect(out.every((c) => c.elementId === null)).toBe(true);
    const ds = out.find((c) => c.ruleId === "fara-date-structurate")!;
    expect(ds.agent).toContain("programul, adresa, prețurile");
  });
  it("pagina completă nu are critici", () => {
    expect(run([])).toEqual([]);
  });
});

describe("critica: ordine și limite", () => {
  it("important, apoi de îmbunătățit, apoi mărunt; în nivel, primul ecran înainte, apoi de sus în jos", () => {
    const tiny = el({ fontSizePx: 9, text: "mic", box: { x: 0, y: 10, w: 50, h: 10 } });
    const lowLink = el({ tag: "a", isLink: true, href: "/", text: "aici", accessibleName: "aici", inFirstScreen: false, box: { x: 0, y: 900, w: 40, h: 20 } });
    const highLink = el({ tag: "a", isLink: true, href: "/", text: "click aici", accessibleName: "click aici", box: { x: 0, y: 400, w: 40, h: 20 } });
    const cta = el({ tag: "button", role: "button", text: "Comandă", accessibleName: "Comandă", color: "#f9c0d0", box: { x: 0, y: 600, w: 120, h: 40 } });
    const out = run([tiny, lowLink, highLink, cta], page({ lang: "" }));
    expect(out.map((c) => c.elementId)).toEqual([cta.id, highLink.id, lowLink.id, tiny.id, null]);
    expect(out.map((c) => c.level)).toEqual(["important", "de-imbunatatit", "de-imbunatatit", "marunt", "marunt"]);
  });
  it("cel mult o critică pe element: cea mai gravă", () => {
    // contrast slab + text mic + buton fals, pe același element
    const e = el({ tag: "div", text: "Comandă", accessibleName: "Comandă", isButtonLike: true, color: "#dddddd", fontSizePx: 10 });
    const out = run([e]);
    expect(out).toHaveLength(1);
    expect(out[0].ruleId).toBe("contrast-slab");
    expect(out[0].level).toBe("important");
    // dar vorbește și despre butonul fals, la asistenții AI
    expect(out[0].agent).toMatch(/buton/);
  });
  it("cel mult 2 critici din aceeași regulă", () => {
    const links = Array.from({ length: 6 }, (_, i) =>
      el({ tag: "a", isLink: true, href: "/", text: "aici", accessibleName: "aici", box: { x: 0, y: 100 + i * 30, w: 40, h: 20 } }),
    );
    const out = run(links);
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.elementId)).toEqual([links[0].id, links[1].id]);
  });
  it("cel mult 8 critici în total", () => {
    const many: ElementFacts[] = [];
    for (let i = 0; i < 2; i++) {
      many.push(el({ color: "#dddddd", text: `gri ${i}` }));
      many.push(el({ tag: "a", isLink: true, href: "/", text: "aici", accessibleName: "aici" }));
      many.push(el({ fontSizePx: 9, text: `mic ${i}` }));
      many.push(el({ tag: "div", text: `Titlu ${i}`, fontSizePx: 30, isHeadingLike: true }));
      many.push(el({ tag: "div", text: `Apasă ${i}`, accessibleName: `Apasă ${i}`, isButtonLike: true }));
      many.push(el({ tag: "button", role: "button", text: "", accessibleName: "" }));
      many.push(el({ tag: "img", isImage: true, text: "", alt: null, box: { x: 0, y: 0, w: 500, h: 300 } }));
    }
    const out = run(many, page({ lang: "", metaDescription: "", jsonLdTypes: [] }));
    expect(out).toHaveLength(8);
    expect(new Set(out.map((c) => c.elementId ?? Math.random())).size).toBe(8);
  });
  it("elemente fără mărime (ascunse) sunt sărite", () => {
    expect(run([el({ color: "#eeeeee", box: { x: 0, y: 0, w: 0, h: 0 } })])).toEqual([]);
  });
});

describe("critica: ton", () => {
  it("niciun text nu are termeni tehnici", () => {
    const els = [
      el({ color: "#cccccc", text: "Programul de vară" }),
      el({ tag: "button", role: "button", text: "Comandă acum", accessibleName: "Comandă acum", color: "#f9c0d0" }),
      el({ tag: "div", text: "Rezervă", accessibleName: "Rezervă", isButtonLike: true }),
      el({ tag: "a", isLink: true, href: "/", text: "click aici", accessibleName: "click aici" }),
      el({ tag: "img", isImage: true, text: "", alt: null, box: { x: 0, y: 0, w: 500, h: 300 } }),
      el({ fontSizePx: 9, text: "Termeni" }),
      el({ tag: "div", text: "Gelateria Uliu", fontSizePx: 40, isHeadingLike: true }),
      el({ tag: "div", text: "Arome", fontSizePx: 28, isHeadingLike: true }),
      el({ tag: "button", role: "button", text: "", accessibleName: "" }),
      el({ tag: "a", isLink: true, href: "/", text: "", accessibleName: "" }),
      el({ color: "#ffffff", background: "#eeeeee", text: "Pe fundal închis", fontSizePx: 30, inFirstScreen: false, box: { x: 0, y: 1000, w: 10, h: 10 } }),
    ];
    const all = [
      ...critiquePage(page({ h1Count: 0, lang: "", metaDescription: "", jsonLdTypes: [] }), els, VIEW),
      ...critiquePage(page({ h1Count: 4 }), els, VIEW),
      ...critiquePage(page({ h1Count: 0 }), [], VIEW),
      ...critiquePage(page({ h1Count: 4, lang: "", metaDescription: "", jsonLdTypes: [] }), [], VIEW),
      // fiecare element singur, ca să treacă toate regulile, nu doar primele 8
      ...els.flatMap((e) => critiquePage(page(), [e], VIEW)),
    ];
    const ids = new Set(all.map((c) => c.ruleId));
    expect([...ids].sort()).toEqual(["buton-fals","contrast-slab","fara-date-structurate","fara-descriere","fara-limba","fara-nume","imagine-fara-descriere","link-vag","mai-multe-titluri","pagina-fara-titlu","text-mic","titlu-nemarcat"]);
    const banned = ["#", ":1", "<", ">", "wcag", "px", "alt", "h1", "aria", "html", "json", "contrast", "undefined", "null", "nan"];
    for (const c of all) {
      for (const t of [c.title, c.body, c.fix, c.agent]) {
        expect(t.trim().length).toBeGreaterThan(0);
        for (const b of banned) expect(t.toLowerCase(), `${c.ruleId}: ${t}`).not.toContain(b);
      }
    }
  });
  it("textul elementului e scurtat la cel mult 40 de caractere, între „”", () => {
    const long = "Înghețată artizanală făcută în fiecare dimineață din lapte de la ferma vecină";
    const [c] = run([el({ color: "#cccccc", text: `  ${long}\n` })]);
    const m = c.title.match(/„([^”]*)”/);
    expect(m).not.toBeNull();
    expect(m![1].length).toBeLessThanOrEqual(40);
    expect(m![1].endsWith("…")).toBe(true);
  });
});

describe("critica: viteză", () => {
  it("1000 de elemente se analizează repede", () => {
    const els = Array.from({ length: 1000 }, (_, i) =>
      el({
        color: i % 3 === 0 ? "#cccccc" : "rgb(20, 20, 20)",
        fontSizePx: i % 7 === 0 ? 10 : 16,
        isLink: i % 5 === 0,
        text: i % 5 === 0 ? "aici" : `Paragraf ${i}`,
        box: { x: 0, y: i * 20, w: 300, h: 18 },
        inFirstScreen: i < 40,
      }),
    );
    const t0 = performance.now();
    const out = critiquePage(page({ lang: "" }), els, VIEW);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(out.length).toBeLessThanOrEqual(8);
  });
});

describe("fraza de final", () => {
  it("nimic găsit", () => {
    expect(summarySentence([])).toBe("N-am găsit nimic grav pe pagina asta.");
  });
  it("câte lucruri și cu ce să înceapă", () => {
    const e = el({ tag: "button", role: "button", text: "Comandă acum", accessibleName: "Comandă acum", color: "#f9c0d0" });
    const out = run([e, el({ fontSizePx: 9, text: "mic" })], page({ lang: "" }));
    const s = summarySentence(out);
    expect(s.startsWith("Am găsit 3 lucruri de reparat. Începe cu")).toBe(true);
    expect(s).toContain("„Comandă acum”");
  });
  it("un singur lucru", () => {
    const s = summarySentence(run([], page({ lang: "" })));
    expect(s.startsWith("Am găsit un lucru de reparat")).toBe(true);
  });
});
