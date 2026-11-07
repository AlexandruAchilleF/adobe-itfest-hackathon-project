import { describe, expect, it } from "vitest";
import { checkVideoPlan, END_CARD_SECONDS, frameAt, repairVideoPlan, totalSeconds, VideoPlan, videoPlanMock, videoPrompt, type VideoInput } from "../src/lib/videoPlan";

const input: VideoInput = {
  brandName: "Marina Park", sourceTitle: "Camping cazare in Vama Veche", product: "Camping și glamping în Vama Veche",
  audience: "tineri și familii", goal: "Rezervări pentru vara 2027", cta: "Rezervă acum",
  description: "Un clip de 20 de secunde pentru story. Arată glampingul și hamacele.", clarifications: ["Instagram"],
  mandatory: [], photoCount: 3,
};
const scene = (title: string, photo: number | null = 0, seconds = 4) => ({ photo, kicker: "", title, seconds, motion: "zoom-in" as const });

describe("scenariul de rezervă", () => {
  it("se construiește doar din brief, folosește fotografiile și trece verificările", () => {
    const plan = VideoPlan.parse(videoPlanMock(input));
    expect(plan.scenes[0].title).toBe(input.product);
    expect(plan.scenes.map((s) => s.photo)).toEqual([0, 1, 2]);
    expect(plan.cta).toBe("Rezervă acum");
    expect(checkVideoPlan(plan, input).every((c) => c.ok)).toBe(true);
  });
  it("fără fotografii și fără răspunsuri tot iese un clip valid, pe culorile mărcii", () => {
    const plan = VideoPlan.parse(videoPlanMock({ ...input, product: undefined, audience: undefined, goal: undefined, cta: undefined, clarifications: [], photoCount: 0 }));
    expect(plan.scenes.every((s) => s.photo === null)).toBe(true);
    expect(plan.cta).toBe("Află mai multe");
  });
});

describe("verificările codului", () => {
  it("prinde cifrele inventate, dar acceptă cifrele din brief", () => {
    const plan = { scenes: [scene("Vara 2027 la mare"), scene("Acum cu -30%", 1)], cta: "Rezervă" };
    const cifre = checkVideoPlan(plan, input).find((c) => c.id === "cifre")!;
    expect(cifre.ok).toBe(false);
    expect(cifre.detail).toContain("30");
    expect(cifre.detail).not.toContain("2027");
  });
  it("prinde fotografiile care nu există și durata prea lungă, iar repararea le corectează", () => {
    const plan = { scenes: [scene("Unu", 7, 6), scene("Doi", 1, 6), scene("Trei", 2, 6), scene("Patru", 0, 6), scene("Cinci", 1, 6)], cta: "Rezervă" };
    const before = checkVideoPlan(plan, input);
    expect(before.find((c) => c.id === "fotografii")!.ok).toBe(false);
    expect(before.find((c) => c.id === "durata")!.ok).toBe(false);
    const fixed = repairVideoPlan(plan, input.photoCount);
    expect(fixed.scenes[0].photo).toBeNull();
    expect(totalSeconds(fixed)).toBeLessThanOrEqual(30.01);
    expect(checkVideoPlan(fixed, input).every((c) => c.ok)).toBe(true);
  });
});

describe("cronologia cadrelor", () => {
  const plan = { scenes: [scene("A", 0, 2), scene("B", 1, 4)], cta: "Rezervă" };
  it("găsește scena și progresul ei, apoi cadrul final", () => {
    expect(frameAt(plan, 1)).toMatchObject({ kind: "scene", index: 0, local: 0.5 });
    expect(frameAt(plan, 3)).toMatchObject({ kind: "scene", index: 1, local: 0.25, elapsed: 1 });
    expect(frameAt(plan, 6 + END_CARD_SECONDS / 2)).toMatchObject({ kind: "end", local: 0.5 });
    expect(totalSeconds(plan)).toBe(6 + END_CARD_SECONDS);
  });
});

describe("promptul", () => {
  it("cere cifre doar din context și pune contextul ca date", () => {
    const prompt = videoPrompt(input, { brand: "Marina Park" });
    expect(prompt).toContain("Nu inventa");
    expect(prompt).toContain("<context>");
    expect(prompt).toContain("3 fotografii");
  });
});
