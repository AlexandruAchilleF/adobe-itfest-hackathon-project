import { describe, expect, it } from "vitest";
import { blocking, checkDocument, type Doc, validCui } from "../src/lib/checks";

const now = new Date("2026-11-07T12:00:00");
const rules = { maxAgeDays: 30, limits: { taxi: 100 }, requireCui: true };
const doc: Doc = { kind: "bon", vendor: "Taxi Exemplu SRL", cui: "12345674", number: "0042", date: "2026-11-05", currency: "lei", lines: [{ label: "Cursă", amount: 70 }, { label: "Bagaj", amount: 8 }], total: 78 };
const run = (d: Partial<Doc> = {}, existing: Doc[] = [], category = "taxi") => checkDocument({ ...doc, ...d }, { rules, category, existing, now });
const level = (checks: ReturnType<typeof run>, id: string) => checks.find((c) => c.id === id)?.level;

describe("cifra de control a codului fiscal", () => {
  it("calculată cu cheia 753217532", () => {
    // 001234567 × 753217532 = 95; 95 × 10 mod 11 = 4 → 12345674
    expect(validCui("12345674")).toBe(true);
    expect(validCui("12345675")).toBe(false);
    expect(validCui("RO 12345674")).toBe(true);
    expect(validCui("abc")).toBe(false);
  });
});

describe("verificarea documentului", () => {
  it("un document corect trece tot", () => expect(blocking(run())).toEqual([]));

  it("prinde totalul care nu iese din linii (ex: 87 citit în loc de 78)", () => {
    const c = run({ total: 87 });
    expect(level(c, "suma")).toBe("error");
    expect(c.find((x) => x.id === "suma")!.detail).toContain("78,00 lei");
  });

  it("cod fiscal greșit sau lipsă", () => {
    expect(level(run({ cui: "12345675" }), "cui")).toBe("error");
    expect(level(run({ cui: "" }), "cui")).toBe("error");
    expect(checkDocument({ ...doc, cui: "" }, { rules: { ...rules, requireCui: false }, category: "taxi", existing: [], now })[1].level).toBe("warning");
  });

  it("data veche, din viitor sau ilizibilă", () => {
    expect(level(run({ date: "2026-09-01" }), "data")).toBe("error");
    expect(level(run({ date: "2026-12-01" }), "data")).toBe("error");
    expect(level(run({ date: "ieri" }), "data")).toBe("error");
  });

  it("duplicat după CUI + număr, sau după firmă + dată + total când lipsește numărul", () => {
    expect(level(run({}, [doc]), "duplicat")).toBe("error");
    expect(level(run({ number: "0043" }, [doc]), "duplicat")).toBe("ok");
    const noNumber = { ...doc, cui: "", number: "" };
    expect(level(run(noNumber, [noNumber]), "duplicat")).toBe("error");
  });

  it("plafonul pe categorie e avertisment, nu blochează", () => {
    const c = run({ lines: [{ label: "Cursă aeroport", amount: 120 }], total: 120 });
    expect(level(c, "plafon")).toBe("warning");
    expect(blocking(c)).toEqual([]);
    expect(run({}, [], "fara-plafon").some((x) => x.id === "plafon")).toBe(false);
  });
});
