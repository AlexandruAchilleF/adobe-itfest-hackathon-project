import { describe, expect, it } from "vitest";
import { sampleAnatomy } from "../src/lib/anatomy";
import { brandPalette, demoBrand } from "../src/lib/brand";
import { mascotInstruction } from "../src/lib/mascotPrompt";

describe("mascotInstruction", () => {
  const t = mascotInstruction(sampleAnatomy, demoBrand);
  it("cere mascota mărcii, în stilul referinței", () => {
    expect(t).toContain(demoBrand.mascot.description);
    expect(t).toContain(sampleAnatomy.illustration!.style);
  });
  it("cere o imagine fără text, pe fundal uniform", () => {
    expect(t).toMatch(/no text/i);
    expect(t).toMatch(/uniform.*background/i);
  });
  it("dă toate culorile mărcii", () => {
    for (const hex of brandPalette(demoBrand)) expect(t).toContain(hex);
  });
  it("numește cele două imagini, ca modelul să nu copieze subiectul", () => {
    expect(t).toMatch(/image 1/i);
    expect(t).toMatch(/image 2/i);
  });
  it("nu cere subiectul din referință", () => expect(t).not.toContain(sampleAnatomy.illustration!.subject));
  it("merge și fără ilustrație în anatomie", () => {
    expect(mascotInstruction({ ...sampleAnatomy, illustration: null }, demoBrand)).toContain(demoBrand.mascot.description);
  });
});
