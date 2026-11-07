import { describe, expect, it } from "vitest";
import { Brand, brandColor, brandPalette, demoBrand } from "../src/lib/brand";

describe("marca", () => {
  it("marca de demo trece schema", () => expect(Brand.parse(demoBrand)).toBeTruthy());
  it("culoarea se ia după rol", () => {
    expect(brandColor(demoBrand, "primary")).toBe("#D43F1C");
    expect(brandColor(demoBrand, "background")).toBe("#F6F1E7");
  });
  it("paleta are cele patru culori", () => {
    expect(brandPalette(demoBrand)).toHaveLength(4);
    expect(brandPalette(demoBrand)).toContain("#7CC6D9");
  });
  it("respinge o marcă cu mai puțin de patru culori", () => {
    expect(Brand.safeParse({ ...demoBrand, colors: demoBrand.colors.slice(0, 3) }).success).toBe(false);
  });
  it("respinge o culoare care nu e hex", () => {
    expect(Brand.safeParse({ ...demoBrand, colors: [...demoBrand.colors.slice(0, 3), { role: "text", hex: "albastru" }] }).success).toBe(false);
  });
});
