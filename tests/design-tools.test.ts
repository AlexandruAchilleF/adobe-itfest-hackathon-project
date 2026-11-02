import { describe, expect, it } from "vitest";
import {
  auditDesign,
  backgroundUnder,
  contrastRatio,
  distanceBlurPx,
  readableDistanceM,
  simulateColor,
  wcagLevel,
} from "../src/lib/accessibility";
import { exampleDesign } from "../src/lib/design";
import { applyHomography, cssMatrix3d, homography, orderQuad } from "../src/lib/perspective";
import { DwellDetector, mapToViewport } from "../src/modules/pointer/dwell";

describe("perspectivă", () => {
  const src = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
    { x: 0, y: 50 },
  ];
  const dst = [
    { x: 10, y: 20 },
    { x: 200, y: 40 },
    { x: 180, y: 160 },
    { x: 15, y: 140 },
  ];
  const H = homography(src, dst);
  it("duce colțurile exact în colțurile țintă", () => {
    src.forEach((p, i) => {
      const q = applyHomography(H, p);
      expect(q.x).toBeCloseTo(dst[i].x, 6);
      expect(q.y).toBeCloseTo(dst[i].y, 6);
    });
  });
  it("identitatea pentru același patrulater", () => {
    const I = homography(src, src);
    expect(applyHomography(I, { x: 37, y: 12 }).x).toBeCloseTo(37, 6);
  });
  it("ordonează colțurile atinse în orice ordine", () => expect(orderQuad([dst[2], dst[0], dst[3], dst[1]])).toEqual(dst));
  it("produce matrix3d CSS", () => expect(cssMatrix3d(H)).toMatch(/^matrix3d\((-?[\d.e-]+,){15}-?[\d.e-]+\)$/));
  it("refuză puncte coliniare", () => expect(() => homography(src, [dst[0], dst[0], dst[0], dst[0]])).toThrow(/coliniare/));
});

describe("accesibilitate", () => {
  it("contrast alb/negru = 21, identic = 1", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBe(21);
    expect(contrastRatio("#777", "#777777")).toBe(1);
  });
  it("praguri WCAG", () => {
    expect(wcagLevel(4.6)).toBe("AA");
    expect(wcagLevel(3.2)).toBe("fail");
    expect(wcagLevel(3.2, true)).toBe("AA");
    expect(wcagLevel(7.5)).toBe("AAA");
  });
  it("protanopie: roșul și verdele devin greu de distins", () => {
    const red = simulateColor([220, 30, 30], "protanopia");
    const green = simulateColor([30, 160, 30], "protanopia");
    const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    expect(dist(red, green)).toBeLessThan(dist([220, 30, 30], [30, 160, 30]) / 2);
    expect(simulateColor([10, 20, 30], "normal")).toEqual([10, 20, 30]);
    const [r, g, b] = simulateColor([200, 50, 50], "achromatopsia");
    expect(r === g && g === b).toBe(true);
  });
  it("lizibilitate: litere de 2,5 cm se citesc de la ~3 m", () => {
    // font 100px pe 1000px lățime, afiș de 35,7 cm → literă ≈ 2,5 cm
    expect(readableDistanceM(100, 1000, 35.7)).toBeCloseTo(3, 0);
  });
  it("blur-ul ajunge la 1/5 din literă exact la distanța-limită", () => {
    const limit = readableDistanceM(100, 1000, 35.7);
    const letterPx = 100 * 0.7;
    expect(distanceBlurPx(1000, 35.7, limit)).toBeCloseTo(letterPx / 5, 0);
  });
  it("blur-ul crește cu distanța", () => {
    expect(distanceBlurPx(1080, 50, 10)).toBeGreaterThan(distanceBlurPx(1080, 50, 2));
    expect(distanceBlurPx(1080, 50, 0)).toBe(0);
  });
  it("auditul găsește fundalul real de sub text", () => {
    const i = exampleDesign.elements.findIndex((e) => e.id === "title");
    expect(backgroundUnder(exampleDesign, i)).toBe("#1e293b");
    const audit = auditDesign(exampleDesign, 50);
    expect(audit.map((a) => a.id)).toEqual(["title", "subtitle"]);
    expect(audit[0].level).toBe("AAA");
    expect(audit[0].readableFromM).toBeGreaterThan(audit[1].readableFromM);
  });
});

describe("dwell click", () => {
  it("dă click o singură dată după ce cursorul stă pe loc", () => {
    const d = new DwellDetector(30, 1000);
    expect(d.push(100, 100, 0).fire).toBe(false);
    expect(d.push(105, 102, 500).progress).toBeCloseTo(0.5);
    expect(d.push(103, 101, 1000).fire).toBe(true);
    expect(d.push(103, 101, 2000).fire).toBe(false);
  });
  it("mișcarea resetează temporizarea", () => {
    const d = new DwellDetector(30, 1000);
    d.push(100, 100, 0);
    expect(d.push(200, 100, 900).progress).toBe(0);
    expect(d.push(200, 100, 1950).fire).toBe(true);
  });
  it("zona de lucru mică acoperă tot ecranul", () => {
    expect(mapToViewport({ x: 0.15, y: 0.15 }, 1000, 500)).toEqual({ x: 0, y: 0 });
    expect(mapToViewport({ x: 0.85, y: 0.85 }, 1000, 500)).toEqual({ x: 1000, y: 500 });
    expect(mapToViewport({ x: 0.5, y: 0.5 }, 1000, 500)).toEqual({ x: 500, y: 250 });
  });
});
