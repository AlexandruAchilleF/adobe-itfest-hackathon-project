import { describe, expect, it } from "vitest";
import { ageLabel, ageMinutes, countByType, freshness, type Report, seedReports, visibleReports } from "../src/lib/reports";

const now = new Date("2026-11-07T20:00:00Z");
const cfg = { freshMinutes: 30, expireMinutes: 180 };
const at = (minAgo: number) => new Date(now.getTime() - minAgo * 60_000).toISOString();
const rep = (minAgo: number, type = "apa"): Report => ({ type, note: "", lat: 0, lng: 0, at: at(minAgo), by: "anonim", approx: false });

describe("rapoarte live", () => {
  it("vechimea, în cuvinte", () => {
    expect(ageLabel(0.4)).toBe("acum");
    expect(ageLabel(7.9)).toBe("acum 7 min");
    expect(ageLabel(125)).toBe("acum 2 h");
    expect(ageLabel(26 * 60)).toBe("ieri");
    expect(ageLabel(3 * 24 * 60)).toBe("acum 3 zile");
  });
  it("vechimea nu e negativă (ceas de telefon decalat)", () => expect(ageMinutes({ at: at(-5) }, now)).toBe(0));
  it("se estompează după prospețime și dispare la expirare", () => {
    expect(freshness(rep(10), cfg, now)).toBe(1);
    expect(freshness(rep(105), cfg, now)).toBeCloseTo(0.625);
    expect(freshness(rep(180), cfg, now)).toBe(0);
  });
  it("arată doar ce n-a expirat, cele noi primele", () => {
    const list = [rep(50), rep(200), rep(5)].map((data, i) => ({ id: String(i), data }));
    expect(visibleReports(list, cfg, now).map((r) => r.id)).toEqual(["2", "0"]);
  });
  it("numără pe tipuri în fereastra dată", () => {
    expect(countByType([rep(5, "apa"), rep(10, "apa"), rep(20, "farmacie"), rep(90, "apa")], 60, now)).toEqual({ apa: 2, farmacie: 1 });
  });
  it("seed-ul primește ore relative la încărcare", () => {
    const [r] = seedReports([{ type: "apa", note: "x", lat: 1, lng: 2, minutesAgo: 12 }], now);
    expect(ageLabel(ageMinutes(r, now))).toBe("acum 12 min");
  });
});
