import { describe, expect, it } from "vitest";
import { Design, exampleDesign, pointsToPath } from "../src/lib/design";
import { decodeDesign, designViewUrl, encodeDesign, MAX_QR_URL } from "../src/lib/share";

describe("design", () => {
  it("exemplul respectă schema", () => expect(Design.safeParse(exampleDesign).success).toBe(true));

  it("encode/decode e reversibil", () => {
    expect(decodeDesign(encodeDesign(exampleDesign))).toEqual(exampleDesign);
  });

  it("returnează null pentru link-uri corupte", () => expect(decodeDesign("gunoi%%")).toBeNull());

  it("un design tipic încape într-un QR", () => {
    expect(designViewUrl(exampleDesign, "https://exemplu.vercel.app").length).toBeLessThan(MAX_QR_URL);
  });

  it("pointsToPath produce un path SVG valid", () => {
    expect(pointsToPath([])).toBe("");
    expect(pointsToPath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe("M 0 0 L 10 5");
    const d = pointsToPath([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 30, y: 10 }]);
    expect(d.startsWith("M 0 0 Q")).toBe(true);
    expect(d.endsWith("L 30 10")).toBe(true);
  });
});
