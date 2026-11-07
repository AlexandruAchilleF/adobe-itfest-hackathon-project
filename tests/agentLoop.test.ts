import { describe, expect, it, vi } from "vitest";
import { runAgentLoop } from "../src/lib/agentLoop";
import type { Check } from "../src/lib/guard";

const pass: Check = { id: "text", ok: true, message: "ok", source: "cod", fixable: true };
const fail = (id: Check["id"], fixable = true): Check => ({ id, ok: false, message: "pică", source: "cod", fixable });
/** `plan[i]` = verificările încercării i. */
const looped = (plan: Check[][], maxRetries?: number) => {
  const generate = vi.fn(async (attempt: number, _failed: Check[]) => attempt);
  const check = vi.fn(async (value: number) => plan[value]);
  return { generate, result: runAgentLoop({ generate, check }, maxRetries) };
};

describe("runAgentLoop", () => {
  it("trece din prima: o singură încercare", async () => {
    const { result } = looped([[pass]]);
    const r = await result;
    expect(r.attempts).toHaveLength(1);
    expect(r.best.value).toBe(0);
    expect(r.error).toBeUndefined();
  });
  it("pică, pică, trece: trei încercări, cea mai bună e a treia", async () => {
    const r = await looped([[fail("text")], [fail("price")], [pass]]).result;
    expect(r.attempts).toHaveLength(3);
    expect(r.best.value).toBe(2);
  });
  it("pică de trei ori: nu face a patra încercare, alege cea cu cele mai puține picate", async () => {
    const { generate, result } = looped([[fail("text"), fail("price")], [fail("text")], [fail("text"), fail("cta")]]);
    const r = await result;
    expect(generate).toHaveBeenCalledTimes(3);
    expect(r.best.value).toBe(1);
  });
  it("a doua încercare primește verificările picate ale primei", async () => {
    const { generate, result } = looped([[fail("price"), pass], [pass]]);
    await result;
    expect(generate.mock.calls[0][1]).toEqual([]);
    expect(generate.mock.calls[1][1]).toEqual([fail("price")]);
  });
  it("o verificare picată, dar nereparabilă, nu mai consumă încercări", async () => {
    const { generate, result } = looped([[fail("cta", false)]]);
    await result;
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("respectă maxRetries", async () => {
    const { generate, result } = looped([[fail("text")], [fail("text")], [fail("text")]], 1);
    await result;
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("toate aruncă: întoarce eroarea, fără candidat", async () => {
    const generate = vi.fn(async () => {
      throw new Error("AI-ul nu răspunde");
    });
    const r = await runAgentLoop({ generate, check: async () => [pass] });
    expect(generate).toHaveBeenCalledTimes(3);
    expect(r.error).toBe("AI-ul nu răspunde");
    expect(r.attempts).toEqual([]);
  });
  it("o încercare care aruncă se numără, dar nu strică rezultatele celelalte", async () => {
    let calls = 0;
    const r = await runAgentLoop({
      generate: async () => {
        if (++calls === 1) throw new Error("timeout");
        return calls;
      },
      check: async () => [pass],
    });
    expect(calls).toBe(2);
    expect(r.best.value).toBe(2);
    expect(r.error).toBeUndefined();
  });
  it("o verificare care aruncă se tratează ca o încercare pierdută", async () => {
    const r = await runAgentLoop({
      generate: async () => 1,
      check: async () => {
        throw new Error("garda a picat");
      },
    });
    expect(r.error).toBe("garda a picat");
  });
});
