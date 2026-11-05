import { describe, expect, it } from "vitest";
import { matchRoute, tourReducer } from "../src/modules/mascot/page";

describe("turul ghidat", () => {
  const steps = [
    { target: "a", text: "1" },
    { target: "b", text: "2" },
  ];
  it("pornește, avansează și se termină după ultimul pas", () => {
    let s = tourReducer(null, { type: "start", steps });
    expect(s?.index).toBe(0);
    s = tourReducer(s, { type: "next" });
    expect(s?.index).toBe(1);
    expect(tourReducer(s, { type: "next" })).toBeNull();
  });
  it("înapoi nu trece sub primul pas; fără pași nu pornește", () => {
    expect(tourReducer({ steps, index: 0 }, { type: "prev" })?.index).toBe(0);
    expect(tourReducer(null, { type: "start", steps: [] })).toBeNull();
  });
});

describe("navigare în limbaj natural", () => {
  const routes = [
    { href: "/docs", label: "Documente" },
    { href: "/map", label: "Hartă + potrivire" },
    { href: "/design", label: "Design editabil" },
  ];
  it("găsește pagina după cuvinte, cu sau fără diacritice", () => {
    expect(matchRoute("du-mă la hartă", routes)?.href).toBe("/map");
    expect(matchRoute("vreau la documentele mele", routes)?.href).toBe("/docs");
    expect(matchRoute("deschide design-ul", routes)?.href).toBe("/design");
  });
  it("nu ghicește dacă nimic nu se potrivește", () => expect(matchRoute("cât e ceasul", routes)).toBeNull());
});
