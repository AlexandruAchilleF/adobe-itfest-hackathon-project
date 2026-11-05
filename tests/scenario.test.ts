import { describe, expect, it } from "vitest";
import { distanceKm } from "../src/modules/map/geo";
import { baselineScore, buildRequestSeed, requestSchema, validateScenario } from "../src/scenario/model";
import { vecini } from "../src/scenario/scenarios/vecini";
import type { Scenario } from "../src/scenario/types";
import { scenario } from "../src/scenario/config";

describe("scenariul activ", () => {
  it("nu are probleme de configurare", () => expect(validateScenario(scenario)).toEqual([]));
  it("seed-ul respectă schema cererii (categorii din scenariu)", () => {
    const schema = requestSchema(scenario);
    for (const r of buildRequestSeed(scenario)) expect(schema.safeParse(r).success, r.title).toBe(true);
  });
  it("are 8–10 cereri în seed, ca demo-ul să pară plin", () => {
    expect(scenario.seed.requests.length).toBeGreaterThanOrEqual(8);
    expect(scenario.seed.requests.length).toBeLessThanOrEqual(12);
  });
});

describe("validateScenario prinde greșelile de copy-paste", () => {
  const broken: Scenario = {
    ...vecini,
    ranks: [{ name: "A", min: 5, frame: "#fff" }, { name: "B", min: 1, frame: "#fff" }],
    seed: {
      ...vecini.seed,
      requests: [
        { ...vecini.seed.requests[0], category: "inexistent" },
        { ...vecini.seed.requests[0], requester: "andrei" },
        { ...vecini.seed.requests[0], steps: [["deliver", "andrei"]] },
      ],
    },
  };
  const problems = validateScenario(broken).join("\n");
  it("categorie inexistentă", () => expect(problems).toContain("categoria inexistent"));
  it("rol greșit", () => expect(problems).toContain("nu are rolul"));
  it("pași imposibili în seed", () => expect(problems).toContain("Seed:"));
  it("ranguri", () => expect(problems).toContain("Primul rang"));
});

describe("seed-ul are istoric generat de ciclul real", () => {
  const seed = buildRequestSeed(vecini, new Date("2026-11-07T12:00:00Z"));
  it("pașii din config devin statusuri", () => {
    expect(seed.map((r) => r.status)).toEqual(["deschis", "deschis", "deschis", "deschis", "acceptat", "confirmat", "confirmat", "livrat"]);
  });
  it("cererile confirmate au confirm în istoric, cu cine a ajutat", () => {
    const done = seed.find((r) => r.status === "confirmat")!;
    expect(done.history.at(-1)).toMatchObject({ event: "confirm", actors: { vecin: done.actors.vecin } });
  });
});

describe("scorul de potrivire (determinist)", () => {
  it("distanța București Nord–Titan e plauzibilă", () => expect(distanceKm({ lat: 44.4466, lng: 26.0731 }, { lat: 44.416, lng: 26.173 })).toBeGreaterThan(7));
  it("favorizează urgența și apropierea, iar cererile care nu mai sunt deschise au 0", () => {
    const origin = { lat: 44.416, lng: 26.173 };
    const near = { urgency: 5, status: "deschis" as const, lat: 44.417, lng: 26.172 };
    const far = { ...near, lat: 44.5, lng: 25.9 };
    expect(baselineScore(vecini, near, origin)).toBeGreaterThan(baselineScore(vecini, far, origin));
    expect(baselineScore(vecini, { ...near, status: "acceptat" }, origin)).toBe(0);
    expect(baselineScore(vecini, near, origin)).toBeLessThanOrEqual(100);
  });
});

describe("mock-ul de structurare (modul demo)", async () => {
  const { guessQuantity, mockStructure } = await import("../src/scenario/mock");
  it("ia cantitatea, nu etajul sau ora", () => {
    expect(guessQuantity("Sunt la etajul 4 pe Calea Moșilor, îmi trebuie 6 sticle")).toEqual({ quantity: 6, unit: "sticle" });
    expect(guessQuantity("Avem 20 de porții de supă până la ora 22")).toEqual({ quantity: 20, unit: "porții" });
    expect(guessQuantity("Str. Brașov 12 bloc 3")).toEqual({ quantity: 1, unit: "bucată" });
  });
  it("categoria și adresa vin din text", () => {
    const m = mockStructure("Nu mai am apă pe Calea Moșilor, 6 sticle până diseară", vecini);
    expect(m).toMatchObject({ category: "apa", quantity: 6, urgency: 5 });
    expect(m.address).toContain("Calea Moșilor");
  });
});

describe("meniul și mascota din config", async () => {
  const { mainNav, showMascot, teamNav } = await import("../src/scenario/nav");
  it("meniul principal folosește cuvintele scenariului și ascunde raportarea dacă e oprită", () => {
    expect(mainNav(vecini).map((n) => n.label)).toEqual(["Harta", "Profilul meu", "Clasament", "Raportează"]);
    expect(mainNav({ ...vecini, reports: { ...vecini.reports, enabled: false } }).map((n) => n.href)).not.toContain("/raport");
    const office = mainNav({ ...vecini, features: { ...vecini.features, map: false, gamification: false } });
    expect(office.map((n) => n.label)).toEqual(["Cereri", "Profilul meu", "Raportează"]);
  });
  it("rețetele vechi apar doar cu optionalModules", () => {
    expect(teamNav(vecini).map((n) => n.href)).toContain("/docs");
    expect(teamNav({ ...vecini, features: { ...vecini.features, optionalModules: false } })).toEqual([]);
  });
  it("mascota: oprită din config sau ascunsă pe anumite pagini", () => {
    expect(showMascot(vecini, "/harta")).toBe(true);
    expect(showMascot(vecini, "/business")).toBe(false);
    expect(showMascot({ ...vecini, mascot: { ...vecini.mascot, enabled: false } }, "/harta")).toBe(false);
  });
});
