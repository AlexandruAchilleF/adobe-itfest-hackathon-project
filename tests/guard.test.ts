import { describe, expect, it } from "vitest";
import { sampleAnatomy } from "../src/lib/anatomy";
import { brandColor, brandPalette, demoBrand } from "../src/lib/brand";
import { compose } from "../src/lib/compose";
import type { Design } from "../src/lib/design";
import { type Check, type CheckId, guardDesign, guardKit, samePrice, THRESHOLDS } from "../src/lib/guard";

const copy = { title: "Gelato de iarnă", offer: "-20% azi", cta: "Comandă acum" };
const answers = { product: "Gelato", offer: "-20% azi", cta: "Comandă acum" };
const design = compose(sampleAnatomy, demoBrand, copy, null, "post");
const ok = { design, brand: demoBrand, answers, copy };
const byId = (checks: Check[], id: CheckId) => {
  const c = checks.find((x) => x.id === id);
  if (!c) throw new Error(`lipsește verificarea ${id}`);
  return c;
};
const withText = (d: Design, id: string, text: string): Design => ({
  ...d,
  elements: d.elements.map((e) => (e.id === id && e.type === "text" ? { ...e, text } : e)),
});
const without = (d: Design, match: (id: string) => boolean): Design => ({ ...d, elements: d.elements.filter((e) => !match(e.id)) });

describe("samePrice", () => {
  it("același preț, scris altfel", () => {
    expect(samePrice("49 lei", "49,00 lei")).toBe(true);
    expect(samePrice("49 lei", "49 RON")).toBe(true);
    expect(samePrice("49.00 lei", "49 lei")).toBe(true);
    expect(samePrice("1.000 lei", "1000 lei")).toBe(true);
  });
  it("alt preț", () => {
    expect(samePrice("49 lei", "59 lei")).toBe(false);
    expect(samePrice("49 lei", "49 %")).toBe(false);
  });
});

describe("guardDesign", () => {
  it("designul compus corect trece tot", () => {
    expect(guardDesign(ok).filter((c) => !c.ok)).toEqual([]);
  });
  it("textul schimbat nu mai e cel dat de om", () => {
    expect(byId(guardDesign({ ...ok, design: withText(design, "title", "Alt titlu") }), "text").ok).toBe(false);
  });
  it("prețul de pe design diferă de cel din ofertă, iar mesajul spune ce a găsit", () => {
    const c = byId(guardDesign({ ...ok, answers: { ...answers, price: "49 lei" }, design: withText(design, "offer", "-20% azi la 59 lei") }), "price");
    expect(c.ok).toBe(false);
    expect(c.message).toContain("59 lei");
    expect(c.message).toContain("49 lei");
  });
  it("prețul corect, scris altfel, trece", () => {
    const d = withText(design, "offer", "-20% azi la 49,00 lei");
    expect(byId(guardDesign({ ...ok, answers: { ...answers, price: "49 lei" }, design: d }), "price").ok).toBe(true);
  });
  it("un preț apărut din senin pe design nu trece, chiar dacă oferta n-are preț", () => {
    expect(byId(guardDesign({ ...ok, design: withText(design, "offer", "59 lei") }), "price").ok).toBe(false);
  });
  it("un procent schimbat pe design nu trece", () => {
    expect(byId(guardDesign({ ...ok, design: withText(design, "offer", "-30% azi") }), "price").ok).toBe(false);
  });
  it("prețul cerut, dar absent de pe design, nu trece", () => {
    expect(byId(guardDesign({ ...ok, answers: { ...answers, price: "49 lei" } }), "price").ok).toBe(false);
  });
  it("mesajul de succes pentru preț", () => {
    expect(byId(guardDesign(ok), "price").message).toBe("Prețul e cel din ofertă");
  });
  it("mențiunea obligatorie lipsă", () => {
    expect(byId(guardDesign({ ...ok, design: without(design, (id) => id.startsWith("mandatory")) }), "mandatory").ok).toBe(false);
  });
  it("un font străin", () => {
    const d = { ...design, elements: design.elements.map((e) => (e.type === "text" ? { ...e, fontFamily: "Comic Sans" } : e)) };
    expect(byId(guardDesign({ ...ok, design: d }), "fonts").ok).toBe(false);
  });
  it("o culoare străină", () => {
    const d = { ...design, elements: design.elements.map((e) => (e.id === "cta-bg" && e.type === "rect" ? { ...e, fill: "#00FF00" } : e)) };
    expect(byId(guardDesign({ ...ok, design: d }), "brand-colors").ok).toBe(false);
  });
  it("paleta ilustrației departe de marcă", () => {
    expect(byId(guardDesign({ ...ok, illustration: { colors: ["#00FF00"], hashDistance: 30 } }), "illustration-palette").ok).toBe(false);
    expect(byId(guardDesign({ ...ok, illustration: { colors: brandPalette(demoBrand), hashDistance: 30 } }), "illustration-palette").ok).toBe(true);
  });
  it("câteva culori străine (contur, umbră) nu pică o ilustrație altfel pe marcă", () => {
    const colors = [...brandPalette(demoBrand), "#111111"];
    expect(byId(guardDesign({ ...ok, illustration: { colors, hashDistance: 30 } }), "illustration-palette").ok).toBe(true);
  });
  it("ilustrația aproape identică cu referința", () => {
    expect(byId(guardDesign({ ...ok, illustration: { colors: brandPalette(demoBrand), hashDistance: 3 } }), "not-copy").ok).toBe(false);
    expect(byId(guardDesign({ ...ok, illustration: { colors: brandPalette(demoBrand), hashDistance: THRESHOLDS.minHashDistance } }), "not-copy").ok).toBe(true);
  });
  it("fără ilustrație generată, spune că e cea originală", () => {
    const c = byId(guardDesign({ ...ok, illustration: null }), "illustration-palette");
    expect(c).toMatchObject({ ok: true, fixable: false });
    expect(c.message).toBe("Imaginea din marcă, generarea n-a reușit");
  });
  it("contrast slab", () => {
    const d = { ...design, elements: design.elements.map((e) => (e.id === "title" && e.type === "text" ? { ...e, fill: brandColor(demoBrand, "background") } : e)) };
    expect(byId(guardDesign({ ...ok, design: d }), "contrast")).toMatchObject({ ok: false, fixable: true });
  });
  it("CTA lipsă", () => {
    expect(byId(guardDesign({ ...ok, design: without(design, (id) => id === "cta" || id === "cta-bg") }), "cta").ok).toBe(false);
  });
  it("CTA sus pe postare nu trece", () => {
    const d = { ...design, elements: design.elements.map((e) => (e.id === "cta" && e.type === "text" ? { ...e, y: 20 } : e)) };
    expect(byId(guardDesign({ ...ok, design: d }), "cta").ok).toBe(false);
  });
  it("CTA prea mic nu trece", () => {
    const d = { ...design, elements: design.elements.map((e) => (e.id === "cta-bg" && e.type === "rect" ? { ...e, height: 30 } : e)) };
    expect(byId(guardDesign({ ...ok, design: d }), "cta").ok).toBe(false);
  });
  it("titlul prea lung", () => {
    const long = "Unu doi trei patru cinci șase șapte opt nouă";
    expect(byId(guardDesign({ ...ok, design: withText(design, "title", long) }), "headline").ok).toBe(false);
  });
  it("verificarea mascotei e marcată AI", () => {
    expect(byId(guardDesign({ ...ok, mascot: { ok: false, reason: "e o cămilă" } }), "mascot")).toMatchObject({ ok: false, source: "ai", message: "e o cămilă" });
  });
  it("restul verificărilor sunt marcate cod", () => {
    expect(guardDesign(ok).every((c) => c.source === "cod")).toBe(true);
  });
});

describe("guardKit", () => {
  const priced = { ...copy, offer: "-20% azi la 49 lei" };
  const post = compose(sampleAnatomy, demoBrand, priced, null, "post");
  const story = compose(sampleAnatomy, demoBrand, priced, null, "story");
  it("aceeași ofertă pe toate formatele trece", () => {
    expect(guardKit({ post, story }, { price: "49 lei", cta: "Comandă acum" })).toMatchObject({ id: "kit", ok: true, source: "cod" });
  });
  it("alt preț pe un format nu trece", () => {
    expect(guardKit({ post, story: withText(story, "offer", "-20% azi la 59 lei") }, { price: "49 lei" }).ok).toBe(false);
  });
  it("alt procent pe un format nu trece", () => {
    expect(guardKit({ post, story: withText(story, "offer", "-30% azi la 49 lei") }, {}).ok).toBe(false);
  });
  it("alt CTA pe un format nu trece", () => {
    expect(guardKit({ post, story: withText(story, "cta", "Vino azi") }, { cta: "Comandă acum" }).ok).toBe(false);
  });
  it("un singur format trece", () => expect(guardKit({ post }, {}).ok).toBe(true));
});
