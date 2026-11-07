import { describe, expect, it } from "vitest";
import { sampleAnatomy } from "../src/lib/anatomy";
import { demoBrand } from "../src/lib/brand";
import { questionsFor } from "../src/lib/gaps";

describe("questionsFor", () => {
  it("întreabă ce lipsește, în ordine", () => {
    expect(questionsFor(sampleAnatomy, demoBrand, {}).map((x) => x.id)).toEqual(["product", "offer", "cta", "formats"]);
  });
  it("variantele vin din anatomie", () => {
    const q = questionsFor(sampleAnatomy, demoBrand, {});
    expect(q.find((x) => x.id === "cta")!.options).toEqual(sampleAnatomy.suggestions.cta);
    expect(q.find((x) => x.id === "product")!.options).toEqual(sampleAnatomy.suggestions.product);
  });
  it("nu întreabă de ofertă dacă referința n-are zonă de ofertă", () => {
    const a = { ...sampleAnatomy, zones: sampleAnatomy.zones.filter((z) => z.role !== "offer") };
    expect(questionsFor(a, demoBrand, {}).map((x) => x.id)).not.toContain("offer");
  });
  it("nu întreabă de CTA dacă referința n-are zonă de CTA", () => {
    const a = { ...sampleAnatomy, zones: sampleAnatomy.zones.filter((z) => z.role !== "cta") };
    expect(questionsFor(a, demoBrand, {}).map((x) => x.id)).not.toContain("cta");
  });
  it("nu mai întreabă nimic când are toate răspunsurile", () => {
    expect(questionsFor(sampleAnatomy, demoBrand, { product: "Gelato", offer: "-20%", cta: "Comandă", formats: ["post"] })).toEqual([]);
  });
  it("formatele goale contează ca nerăspuns", () => {
    expect(questionsFor(sampleAnatomy, demoBrand, { formats: [] }).map((x) => x.id)).toContain("formats");
  });
  it("hero apare doar la secțiuni de site", () => {
    const formats = (kind: "image" | "section") => questionsFor({ ...sampleAnatomy, kind }, demoBrand, {}).find((x) => x.id === "formats")!.options;
    expect(formats("section")).toContain("hero");
    expect(formats("image")).toEqual(["post", "story"]);
  });
  it("nu întreabă niciodată mai mult de 5 lucruri", () => {
    expect(questionsFor(sampleAnatomy, demoBrand, {}).length).toBeLessThanOrEqual(5);
  });
  it("formatele se aleg din variante, restul acceptă text liber", () => {
    const q = questionsFor(sampleAnatomy, demoBrand, {});
    expect(q.find((x) => x.id === "formats")!.free).toBe(false);
    expect(q.find((x) => x.id === "product")!.free).toBe(true);
  });
});
