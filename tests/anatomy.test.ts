import { describe, expect, it } from "vitest";
import { Anatomy, sampleAnatomy } from "../src/lib/anatomy";

describe("anatomia", () => {
  it("exemplul trece schema", () => expect(Anatomy.parse(sampleAnatomy)).toBeTruthy());
  it("exemplul are zonele cerute de compunere", () => {
    expect(sampleAnatomy.zones.map((z) => z.role)).toEqual(expect.arrayContaining(["headline", "offer", "cta", "illustration", "logo"]));
  });
  it("casetele sunt în coordonate 0–1", () => {
    const zone = { ...sampleAnatomy.zones[0], box: { x: 0, y: 0, w: 1080, h: 200 } };
    expect(Anatomy.safeParse({ ...sampleAnatomy, zones: [zone] }).success).toBe(false);
  });
  it("sursa culorilor e pagina sau pixelii", () => {
    expect(Anatomy.safeParse({ ...sampleAnatomy, colors: { ...sampleAnatomy.colors, source: "ghicit" } }).success).toBe(false);
  });
  it("ilustrația poate lipsi", () => {
    expect(Anatomy.safeParse({ ...sampleAnatomy, illustration: null }).success).toBe(true);
  });
});
