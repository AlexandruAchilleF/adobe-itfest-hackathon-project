import { describe, expect, it } from "vitest";
import { deltaE, dominantColors, hexToLab, nearest } from "../src/lib/color";

const pixels = (...colors: Array<[[number, number, number], number]>) => {
  const out: number[] = [];
  for (const [[r, g, b], n] of colors) for (let i = 0; i < n; i++) out.push(r, g, b, 255);
  return new Uint8ClampedArray(out);
};
const CORAL: [number, number, number] = [0xf2, 0x5c, 0x3b];
const NAVY: [number, number, number] = [0x0e, 0x3a, 0x5b];

describe("culori", () => {
  it("hexToLab: albul are L 100, negrul L 0", () => {
    expect(hexToLab("#ffffff")[0]).toBeCloseTo(100, 0);
    expect(hexToLab("#000000")[0]).toBeCloseTo(0, 5);
  });
  it("deltaE: identic e 0, negru–alb e aproape 100", () => {
    expect(deltaE("#ffffff", "#ffffff")).toBe(0);
    expect(deltaE("#000000", "#ffffff")).toBeGreaterThan(99);
  });
  it("deltaE nu ține cont de majuscule", () => expect(deltaE("#F25C3B", "#f25c3b")).toBe(0));
  it("nearest alege cea mai apropiată culoare din paletă", () => {
    expect(nearest("#F35D3C", ["#F25C3B", "#0E3A5B"]).hex).toBe("#F25C3B");
    expect(nearest("#F35D3C", ["#F25C3B", "#0E3A5B"]).distance).toBeLessThan(2);
  });
});

describe("dominantColors", () => {
  it("găsește cele două culori dintr-o imagine pe jumătate", () => {
    expect(dominantColors(pixels([CORAL, 50], [NAVY, 50]), 2).sort()).toEqual(["#0e3a5b", "#f25c3b"]);
  });
  it("le întoarce pe cele mai frecvente primele", () => {
    expect(dominantColors(pixels([CORAL, 10], [NAVY, 90]), 2)[0]).toBe("#0e3a5b");
  });
  it("e determinist", () => {
    const p = pixels([CORAL, 33], [NAVY, 21], [[200, 200, 10], 40]);
    expect(dominantColors(p, 3)).toEqual(dominantColors(p, 3));
  });
  it("ignoră pixelii transparenți", () => {
    expect(dominantColors(new Uint8ClampedArray([1, 2, 3, 0, 0xf2, 0x5c, 0x3b, 255]), 2)).toEqual(["#f25c3b"]);
  });
  it("o imagine goală nu are culori", () => expect(dominantColors(new Uint8ClampedArray(), 3)).toEqual([]));
});
