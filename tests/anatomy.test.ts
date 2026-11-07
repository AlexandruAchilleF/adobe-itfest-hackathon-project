import { describe, expect, it } from "vitest";
import { Anatomy, AnatomyRead, normalizeAnatomy, sampleAnatomy } from "../src/lib/anatomy";

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

describe("normalizeAnatomy (răspunsul modelului adus la 0–1)", () => {
  const withBox = (box: { x: number; y: number; w: number; h: number }) =>
    AnatomyRead.parse({ ...sampleAnatomy, width: 1080, height: 1350, zones: [{ ...sampleAnatomy.zones[0], box }] });

  it("casetele deja în 0–1 rămân la fel", () => {
    const box = sampleAnatomy.zones[0].box;
    expect(normalizeAnatomy(withBox(box)).zones[0].box).toEqual(box);
  });
  it("casetele în pixeli se împart la lățime și înălțime", () => {
    expect(normalizeAnatomy(withBox({ x: 108, y: 675, w: 540, h: 135 })).zones[0].box).toEqual({ x: 0.1, y: 0.5, w: 0.5, h: 0.1 });
  });
  it("depășirile mici se taie la marginea imaginii", () => {
    const box = normalizeAnatomy(withBox({ x: 0.9, y: 1.02, w: 0.3, h: 0.1 })).zones[0].box;
    expect(box).toEqual({ x: 0.9, y: 1, w: expect.closeTo(0.1, 6), h: 0 });
  });
  it("rezultatul trece schema strictă", () => {
    expect(Anatomy.safeParse(normalizeAnatomy(withBox({ x: 1200, y: 1500, w: 300, h: 300 }))).success).toBe(true);
  });
});
