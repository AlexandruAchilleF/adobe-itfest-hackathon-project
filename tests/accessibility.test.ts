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
