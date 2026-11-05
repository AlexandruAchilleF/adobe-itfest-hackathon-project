import { describe, expect, it } from "vitest";
import { confirmationReward, giverStats, impact, isSuspended, leaderboard, pointsFor, rankFor } from "../src/lib/gamification";
import { advance, apply, createRequest, type Request } from "../src/lib/flow";
import { vecini } from "../src/scenario/scenarios/vecini";
import type { Scenario } from "../src/scenario/types";

const cfg: Pick<Scenario, "points" | "trust" | "ranks" | "flow"> = {
  flow: vecini.flow,
  points: { role: "vecin", base: 10, perUnit: 1, maxUnits: 20, urgency: [1, 1.2, 1.5, 2, 2.5], disputePenalty: 15 },
  trust: { suspendAfterDisputes: 2 },
  ranks: [
    { name: "Novice", min: 0, frame: "#999" },
    { name: "Generos", min: 50, frame: "#38f" },
    { name: "Expert", min: 150, frame: "#fa0" },
  ],
};
const t0 = new Date("2026-11-07T10:00:00Z");
const req = (quantity: number, urgency: number) =>
  createRequest(vecini.flow, { title: `x${quantity}`, category: "hrana", description: "", quantity, unit: "porții", urgency, address: "", lat: 0, lng: 0 }, "adapost", t0);
const roleOf = (h: string) => (h === "adapost" ? "varstnic" : "vecin");
const to = (r: Request, steps: string[], giver: string) => advance(vecini.flow, r, steps.map((s) => [s, s === "confirm" || s === "dispute" ? "adapost" : giver] as [string, string]), roleOf, t0);
const done = (r: Request, giver: string) => to(r, ["accept", "deliver", "confirm"], giver);
const disputed = (r: Request, giver: string) => to(r, ["accept", "deliver", "dispute"], giver);
const advanceTo = (r: Request, stage: "livrat" | "acceptat", giver: string, _t: Date) => to(r, stage === "livrat" ? ["accept", "deliver"] : ["accept"], giver);

describe("puncte", () => {
  it("formula: (base + perUnit × cantitate) × urgență", () => {
    expect(pointsFor({ quantity: 6, urgency: 5 }, cfg.points)).toBe(40);
    expect(pointsFor({ quantity: 6, urgency: 1 }, cfg.points)).toBe(16);
  });
  it("cantitatea e plafonată (nu poți umfla punctele cu 1000 de porții)", () => {
    expect(pointsFor({ quantity: 1000, urgency: 1 }, cfg.points)).toBe(30);
  });
  it("urgența în afara 1–5 e adusă în interval", () => {
    expect(pointsFor({ quantity: 0, urgency: 9 }, cfg.points)).toBe(25);
    expect(pointsFor({ quantity: 0, urgency: -1 }, cfg.points)).toBe(10);
  });
});

describe("statistici pe om", () => {
  const all = [done(req(6, 5), "ana"), done(req(10, 3), "ana"), advanceTo(req(3, 3), "livrat", "ana", t0), advanceTo(req(3, 3), "acceptat", "ana", t0), done(req(4, 2), "dan")];
  it("punctele vin doar din livrările confirmate de cel care a primit", () => {
    const s = giverStats("ana", all, cfg);
    expect(s).toMatchObject({ points: 40 + 30, confirmed: 2, units: 16, pending: 1, active: 1, disputes: 0, suspended: false });
  });
  it("„nu am primit” scade puncte și, repetat, suspendă contul", () => {
    const withDisputes = [...all, disputed(req(1, 1), "ana"), disputed(req(1, 1), "ana")];
    const s = giverStats("ana", withDisputes, cfg);
    expect(s.disputes).toBe(2);
    expect(s.points).toBe(70 - 30);
    expect(s.suspended).toBe(true);
    expect(isSuspended(1, cfg.trust)).toBe(false);
  });
  it("o contestație redeschisă rămâne în istoric (nu se șterge prin reopen)", () => {
    const reopened = apply(vecini.flow, disputed(req(1, 1), "ana"), "reopen", { handle: "adapost", role: "varstnic" }, t0);
    expect(giverStats("ana", [reopened], cfg).disputes).toBe(1);
  });
  it("punctele nu scad sub 0", () => {
    expect(giverStats("dan", [disputed(req(1, 1), "dan")], cfg).points).toBe(0);
  });
});

describe("ranguri", () => {
  it("rangul și progresul spre următorul", () => {
    expect(rankFor(0, cfg.ranks)).toMatchObject({ rank: { name: "Novice" }, next: { name: "Generos" }, progress: 0, toNext: 50 });
    expect(rankFor(100, cfg.ranks)).toMatchObject({ rank: { name: "Generos" }, progress: 0.5, toNext: 50 });
    expect(rankFor(999, cfg.ranks)).toMatchObject({ rank: { name: "Expert" }, next: null, progress: 1 });
  });
  it("merge și cu rangurile nesortate în config", () => {
    expect(rankFor(60, [...cfg.ranks].reverse()).rank.name).toBe("Generos");
  });
});

describe("clasament și impact", () => {
  const all = [done(req(6, 5), "ana"), done(req(20, 5), "dan"), done(req(1, 1), "ana")];
  it("ordonat după puncte, cu loc și rang", () => {
    const rows = leaderboard([{ handle: "ana", name: "Ana" }, { handle: "dan", name: "Dan" }, { handle: "ion", name: "Ion" }], all, cfg);
    expect(rows.map((r) => [r.place, r.name, r.points, r.rank.name])).toEqual([
      [1, "Dan", 75, "Generos"],
      [2, "Ana", 51, "Generos"],
      [3, "Ion", 0, "Novice"],
    ]);
  });
  it("cifrele de impact", () => {
    expect(impact([...all, req(5, 3), advanceTo(req(2, 2), "livrat", "ion", t0)], cfg)).toEqual({ units: 27, confirmed: 3, open: 1, inProgress: 1, disputed: 0, helpers: 2 });
  });
  it("recompensa la confirmare: puncte și rang nou", () => {
    const before = [advanceTo(req(20, 5), "livrat", "ana", t0)];
    const after = [apply(vecini.flow, before[0], "confirm", { handle: "adapost", role: "varstnic" }, t0)];
    expect(confirmationReward(before, after, "ana", cfg)).toMatchObject({ gained: 75, total: 75, rankUp: { name: "Generos" } });
  });
});
