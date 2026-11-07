import { describe, expect, it } from "vitest";
import { dHash, grayGrid, hamming } from "../src/lib/similarity";

const gradientGrid = Array.from({ length: 72 }, (_, i) => (i % 9) * 28);
const invertedGradientGrid = gradientGrid.map((v) => 255 - v);

describe("amprenta imaginilor", () => {
  it("grayGrid face 9×8 valori, media pe blocuri", () => {
    const rgba = new Uint8ClampedArray(18 * 16 * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      const x = (i / 4) % 18;
      const v = x < 9 ? 0 : 255;
      rgba.set([v, v, v, 255], i);
    }
    const grid = grayGrid(rgba, 18, 16);
    expect(grid).toHaveLength(72);
    expect(grid[0]).toBe(0);
    expect(grid[8]).toBe(255);
  });
  it("merge și pe imagini mai mici decât grila", () => {
    expect(grayGrid(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1)).toEqual(Array(72).fill(255));
  });
  it("dHash are 64 de biți, în hex", () => expect(dHash(gradientGrid)).toMatch(/^[0-9a-f]{16}$/));
  it("aceeași imagine are distanța 0", () => expect(hamming(dHash(gradientGrid), dHash(gradientGrid))).toBe(0));
  it("o imagine inversată e foarte departe", () => {
    expect(hamming(dHash(gradientGrid), dHash(invertedGradientGrid))).toBeGreaterThan(40);
  });
});
