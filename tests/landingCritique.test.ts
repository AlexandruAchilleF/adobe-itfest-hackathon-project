import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { critiquePage, MAX_CRITIQUES } from "../src/lib/critique";
import { DEMO_SITE } from "../src/lib/landingDemo";
import { bubbleAt, CRITIQUE_BOXES, CRITIQUE_ELEMENTS, CRITIQUE_PAGE, CRITIQUE_URL, CRITIQUE_VIEWPORT, critiqueStops, LEVEL_LABELS, perchOn } from "../src/lib/landingCritique";

describe("critica din machetă", () => {
  it("pagina e cea de la „Se uită”, la jumătate de scară", () => {
    expect(CRITIQUE_URL).toBe(DEMO_SITE.url);
    expect(CRITIQUE_VIEWPORT).toEqual({ w: DEMO_SITE.viewport.w / 2, h: DEMO_SITE.viewport.h / 2 });
    for (const [id, b] of Object.entries(CRITIQUE_BOXES)) {
      const e = DEMO_SITE.elements.find((el) => el.id === id);
      expect(e?.box).toEqual({ x: b.x * 2, y: b.y * 2, w: b.w * 2, h: b.h * 2 });
    }
  });

  it("regulile reale găsesc trei elemente, pe niveluri diferite", () => {
    const stops = critiqueStops();
    expect(stops.map((s) => [s.critique.elementId, s.critique.ruleId, s.critique.level])).toEqual([
      ["el-6", "contrast-slab", "important"],
      ["el-3", "link-vag", "de-imbunatatit"],
      ["el-7", "imagine-fara-descriere", "marunt"],
    ]);
  });

  it("textele sunt exact cele din critiquePage, fără observații pierdute", () => {
    const real = critiquePage(CRITIQUE_PAGE, CRITIQUE_ELEMENTS, CRITIQUE_VIEWPORT);
    expect(critiqueStops().map((s) => s.critique)).toEqual(real);
    expect(real.length).toBeLessThanOrEqual(MAX_CRITIQUES);
  });

  it("contrastul butonului e măsurat din culorile desenate", () => {
    const cta = critiqueStops()[0].critique;
    expect(Number(cta.evidence.contrast)).toBeLessThan(Number(cta.evidence.needed));
    expect(cta.title).toContain("Comandă acum");
  });

  it("uliul aterizează în pagină, pe fiecare element", () => {
    for (const { perch, box } of critiqueStops(64)) {
      expect(perch.x).toBeGreaterThanOrEqual(box.x);
      expect(perch.x).toBeLessThanOrEqual(box.x + box.w);
      expect(perch.y - 64 * 0.78).toBeGreaterThanOrEqual(0);
      expect(perch.y).toBeLessThanOrEqual(CRITIQUE_VIEWPORT.h);
    }
  });

  it("uliul nu iese din pagină nici pe un element lipit de margine", () => {
    const at = perchOn({ x: 700, y: 0, w: 20, h: 10 }, CRITIQUE_VIEWPORT, 80);
    expect(at.x).toBe(680);
    expect(at.y).toBeCloseTo(10 + 80 * 0.78);
  });

  it("balonul rămâne în pagină", () => {
    const view = { w: 640, h: 480 };
    const bubble = { w: 290, h: 230 };
    for (const box of [{ x: 0, y: 0, w: 10, h: 10 }, { x: 600, y: 460, w: 40, h: 20 }]) {
      const at = bubbleAt(box, view, bubble);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.x + bubble.w).toBeLessThanOrEqual(view.w);
      expect(at.y + bubble.h).toBeLessThanOrEqual(view.h);
    }
  });

  it("etichetele nivelurilor sunt cele din balonul extensiei", () => {
    const content = readFileSync("chrome-extension/content.js", "utf8");
    for (const [level, label] of Object.entries(LEVEL_LABELS)) expect(content).toContain(`"${level}":"${label}"`);
  });
});
