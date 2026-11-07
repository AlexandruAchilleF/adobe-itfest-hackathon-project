import { describe, expect, it } from "vitest";
import { demoBrand } from "../src/lib/brand";
import { kitVerdict, seedCampaign } from "../src/lib/campaigns";
import { boxPercent, DEMO_SITE, demoQuestions, demoScan, DRIFTED_OFFER, guardReplay } from "../src/lib/landingDemo";

describe("site-ul de demo din machetă", () => {
  it("regulile extensiei aleg hero-ul, oferta, mascota și butonul", () => {
    const { picks } = demoScan();
    expect(picks.map((p) => p.kind).sort()).toEqual(["cta", "hero", "mascot", "offer"]);
  });

  it("Spire spune ce a găsit, din alegeri", () => {
    expect(demoScan().said).toBe("Am găsit 4 lucruri bune pentru o campanie: hero-ul, oferta, mascota și butonul.");
  });

  it("chenarele stau pe casetele elementelor, în procente din pagină", () => {
    expect(boxPercent("el-6")).toEqual({ left: "5.56%", top: "48.15%", width: "17.36%", height: "6.67%" });
    expect(() => boxPercent("nu-exista")).toThrow();
  });

  it("conținutul stă în stânga panoului Spire (ultimele 37% din lățime)", () => {
    const content = DEMO_SITE.elements.filter((e) => e.tag !== "section");
    for (const e of content) expect(e.box.x + e.box.w).toBeLessThanOrEqual(DEMO_SITE.viewport.w * 0.63);
  });
});

describe("întrebările din machetă", () => {
  it("după produs rămân trei: oferta, butonul, formatele", () => {
    expect(demoQuestions(seedCampaign(), demoBrand).map((q) => q.id)).toEqual(["offer", "cta", "formats"]);
  });

  it("răspunsurile campaniei de exemplu sunt printre variante", () => {
    const c = seedCampaign();
    const [offer, cta] = demoQuestions(c, demoBrand);
    expect(offer.options).toContain(c.answers.offer);
    expect(cta.options).toContain(c.answers.cta);
  });
});

describe("bucla gărzii, reluată pe campania de exemplu", () => {
  it("prima variantă pică la preț, a doua trece după corectură", async () => {
    const steps = await guardReplay(seedCampaign(), demoBrand, null);
    expect(steps).toHaveLength(2);
    const price = (i: number) => steps[i].checks.find((c) => c.id === "price")!;
    expect(price(0).ok).toBe(false);
    expect(price(0).message).toContain("20%");
    expect(steps[0].copy.offer).toBe(DRIFTED_OFFER);
    expect(price(1).ok).toBe(true);
    expect(steps[1].checks.every((c) => c.ok)).toBe(true);
  });

  it("cu ilustrația măsurată, garda adaugă paleta și amprenta", async () => {
    const steps = await guardReplay(seedCampaign(), demoBrand, { colors: ["#F6F1E7", "#0E3A5B"], hashDistance: 30 });
    expect(steps.at(-1)!.checks.map((c) => c.id)).toEqual(expect.arrayContaining(["illustration-palette", "not-copy"]));
  });
});

describe("kitVerdict", () => {
  const ok = { id: "price" as const, ok: true, message: "", source: "cod" as const, fixable: true };
  it("fără corecturi spune doar câte trec", () => expect(kitVerdict({ checks: [ok, ok], attempts: 1 })).toBe("2 din 2 verificări trec."));
  it("o corectură: „o dată”", () => expect(kitVerdict({ checks: [ok], attempts: 2 })).toBe("Am refăcut o dată ce a picat la gardă. 1 din 1 verificări trec."));
  it("două corecturi: „de 2 ori”", () => expect(kitVerdict({ checks: [ok], attempts: 3 })).toMatch(/^Am refăcut de 2 ori/));
});
