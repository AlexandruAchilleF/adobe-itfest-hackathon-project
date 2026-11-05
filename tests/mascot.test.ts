import { describe, expect, it } from "vitest";
import { createMascot, moodForChecks } from "../src/modules/mascot/mascot";

describe("mascota", () => {
  it("stările de lucru rămân, cele de reacție revin la idle după timp", () => {
    let t = 0;
    const m = createMascot(() => t);
    m.set("thinking");
    t = 60_000;
    expect(m.tick()).toBe(false);
    expect(m.get().mood).toBe("thinking");
    m.set("happy");
    t += 3_000;
    expect(m.tick()).toBe(false);
    t += 2_000;
    expect(m.tick()).toBe(true);
    expect(m.get()).toMatchObject({ mood: "idle", message: null });
  });

  it("mesajele lungi stau mai mult pe ecran", () => {
    let t = 0;
    const m = createMascot(() => t);
    m.say("x".repeat(200), "idle");
    t = 5_000;
    m.tick();
    expect(m.get().message).not.toBeNull();
  });

  it("anunță abonații", () => {
    const m = createMascot();
    const seen: string[] = [];
    const off = m.subscribe((s) => seen.push(s.mood));
    m.set("listening");
    off();
    m.set("idle");
    expect(seen).toEqual(["listening"]);
  });

  it("reacția la verificări: totul trece → bucuros, altfel îngrijorat", () => {
    expect(moodForChecks(2, 2).mood).toBe("happy");
    expect(moodForChecks(1, 3)).toMatchObject({ mood: "worried", message: expect.stringContaining("2 din 3") });
    expect(moodForChecks(0, 0).mood).toBe("worried");
  });
});
