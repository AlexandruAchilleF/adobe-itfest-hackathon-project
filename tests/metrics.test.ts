import { describe, expect, it } from "vitest";
import { advance, createRequest } from "../src/lib/flow";
import { cycleMinutes, formatDuration, monthlyCost, processStats, segments } from "../src/lib/metrics";
import { deconturi } from "../src/scenario/scenarios/deconturi";

const F = deconturi.flow;
const t0 = new Date("2026-11-02T09:00:00Z");
const roles: Record<string, string> = { andrei: "angajat", maria: "manager", irina: "contabil" };
const data = { title: "Taxi", category: "taxi", description: "", quantity: 50, unit: "lei", urgency: 3, address: "", lat: 0, lng: 0 };
const make = (steps: Parameters<typeof advance>[2]) => advance(F, createRequest(F, data, "andrei", t0), steps, (h) => roles[h], t0);

// trimis → 2 zile la manager → retur → 1 h la angajat → 3 h la manager → aprobat → 1 zi la contabil → plătit → 30 min → încasat
const full = make([
  ["returneaza", "maria", "lipsește bonul", 2 * 24 * 60],
  ["retrimite", "andrei", undefined, 60],
  ["aproba", "maria", undefined, 180],
  ["plateste", "irina", undefined, 24 * 60],
  ["incaseaza", "andrei", undefined, 30],
]);
const now = new Date("2026-11-07T09:00:00Z");

describe("cronometrul procesului", () => {
  it("bucățile de timp, cu cine era așteptat", () => {
    const s = segments(F, full, now);
    expect(s.map((x) => [x.state, x.minutes, x.who])).toEqual([
      ["trimis", 2880, undefined],
      ["de-corectat", 60, "andrei"],
      ["trimis", 180, "maria"],
      ["aprobat", 1440, undefined],
      ["platit", 30, "andrei"],
    ]);
    expect(s.some((x) => x.current)).toBe(false);
  });

  it("o cerere deschisă are bucata curentă până acum", () => {
    const open = make([["aproba", "maria", undefined, 60]]);
    const last = segments(F, open, now).at(-1)!;
    expect(last).toMatchObject({ state: "aprobat", current: true, waitingOn: ["contabil"] });
    expect(last.minutes).toBe((now.getTime() - t0.getTime()) / 60_000 - 60);
  });

  it("durata totală, blocajul, cererile întoarse și cine așteaptă cel mai mult", () => {
    const open = make([["aproba", "maria", undefined, 60]]);
    const st = processStats(F, [{ id: "a", data: full }, { id: "b", data: open }], now);
    expect(cycleMinutes(F, full)).toBe(2880 + 60 + 180 + 1440 + 30);
    expect(st.closed).toBe(1);
    expect(st.returned).toBe(1);
    expect(st.bottleneck?.state).toBe("aprobat");
    expect(st.byState.find((x) => x.state === "trimis")).toMatchObject({ visits: 3, waitingOn: ["manager"] });
    expect(st.waiting.map((w) => w.id)).toEqual(["b"]);
  });

  it("durate în cuvinte", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(190)).toBe("3 h 10 min");
    expect(formatDuration(1440)).toBe("1 zi");
    expect(formatDuration(3120)).toBe("2 zile 4 h");
  });

  it("costul lunar vine doar din cifrele introduse de om", () => {
    expect(monthlyCost(120, 15, 60)).toEqual({ hours: 30, cost: 1800 });
    expect(monthlyCost(-5, 15, 60)).toEqual({ hours: 0, cost: 0 });
  });
});
