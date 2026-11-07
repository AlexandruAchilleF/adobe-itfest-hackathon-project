import { describe, expect, it } from "vitest";
import { acceptExtractedBrief } from "../src/lib/pageBrief";
import { briefSeed, fillBriefGaps } from "../src/lib/gaps";

describe("brief propus din pagină", () => {
  it("folosește titlul și acțiunea observată, fără public sau ofertă inventată", () => {
    expect(briefSeed({ title: "Marina Park" }, [{ tag: "h1", text: "Camping în Vama Veche" }, { tag: "a", text: "Rezervă acum" }])).toEqual({ product: "Camping în Vama Veche", cta: "Rezervă acum" });
  });
  it("acceptă numai extracții cu dovezi citite și respinge cifrele inventate", () => {
    expect(acceptExtractedBrief({ product: { value: "Cazare", evidence: "Cazare pentru familii" }, audience: { value: "Familii", evidence: "Cazare pentru familii" }, goal: { value: "100 rezervări", evidence: "Cazare pentru familii" }, cta: { value: "Cumpără", evidence: "inexistent" } }, ["Cazare pentru familii"])).toEqual({ product: "Cazare", audience: "Familii" });
  });
  it("nu suprascrie răspunsurile utilizatorului, inclusiv un câmp gol editat", () => {
    expect(fillBriefGaps({ product: "Ales de om", cta: "" }, { product: "Din pagină", cta: "Rezervă", audience: "Familii" })).toEqual({ product: "Ales de om", cta: "", audience: "Familii" });
  });
});
