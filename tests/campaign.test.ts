import { describe, expect, it } from "vitest";
import { campaignCandidates } from "../src/lib/campaign";
import type { PageElement } from "../src/lib/extensionBridge";

const VP = { w: 1440, h: 900 };

function el(over: Partial<PageElement> & { id: string }): PageElement {
  return {
    tag: "div",
    text: "",
    box: { x: 400, y: 500, w: 100, h: 30 },
    styles: { color: "#111", background: "rgba(0, 0, 0, 0)", fontFamily: "Inter", fontSize: "16px", fontWeight: "400" },
    inFirstScreen: true,
    ...over,
  };
}

const logoTopLeft = el({ id: "logo", tag: "img", imageSrc: "https://x.ro/logo.png", box: { x: 16, y: 12, w: 80, h: 40 } });
const smallEl = (i: number) => el({ id: `s${i}`, text: `text ${i}`, box: { x: i % 1000, y: 700, w: 30, h: 20 } });

const fixtureElements: PageElement[] = [
  logoTopLeft,
  smallEl(1),
  el({ id: "cta", tag: "button", text: "Comandă acum", styles: { color: "#fff", background: "#C2410C", fontFamily: "Inter", fontSize: "16px", fontWeight: "600" }, box: { x: 600, y: 700, w: 180, h: 48 } }),
  el({ id: "offer", text: "-20% la toate cupele, 49 lei", box: { x: 100, y: 420, w: 360, h: 40 } }),
  smallEl(2),
  el({ id: "mascot", tag: "svg", box: { x: 560, y: 300, w: 320, h: 320 } }),
  el({ id: "hero", tag: "section", text: "Cafeaua ta de dimineață", box: { x: 0, y: 60, w: 1440, h: 500 } }),
];

describe("campaignCandidates", () => {
  it("alege hero, ofertă, mascotă și CTA, în ordinea scorului", () => {
    const picks = campaignCandidates(fixtureElements, VP);
    expect(picks.map((p) => p.kind)).toEqual(["hero", "offer", "mascot", "cta"]);
    expect(picks.map((p) => p.elementId)).toEqual(["hero", "offer", "mascot", "cta"]);
    expect(picks.every((p) => p.reason.length > 0)).toBe(true);
  });

  it("întoarce cel mult 4, chiar la 1000 de elemente", () => {
    const many = Array.from({ length: 1000 }, (_, i) => smallEl(i));
    expect(campaignCandidates(many, VP).length).toBeLessThanOrEqual(4);
  });

  it("logo-ul din colțul de sus nu e mascotă", () => {
    expect(campaignCandidates([logoTopLeft], VP).find((p) => p.kind === "mascot")).toBeUndefined();
  });

  it("fundal transparent nu face un buton CTA", () => {
    for (const background of ["rgba(0, 0, 0, 0)", "transparent", "rgba(255,0,0,0)"]) {
      const b = el({ id: "b", tag: "button", text: "Vezi mai mult", styles: { color: "#000", background, fontFamily: "x", fontSize: "16px", fontWeight: "400" } });
      expect(campaignCandidates([b], VP)).toEqual([]);
    }
  });

  it("un link cu 6 cuvinte nu e CTA", () => {
    const a = el({ id: "a", tag: "a", text: "Citește mai multe despre toate cupele noastre", styles: { color: "#fff", background: "#C2410C", fontFamily: "x", fontSize: "16px", fontWeight: "400" } });
    expect(campaignCandidates([a], VP)).toEqual([]);
  });

  it("lista goală dă []", () => {
    expect(campaignCandidates([], VP)).toEqual([]);
  });
});
