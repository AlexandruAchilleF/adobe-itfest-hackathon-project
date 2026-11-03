import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { auditDesign, autoFixDesign } from "../src/lib/accessibility";
import { defineAction, mockPlan, runAgent } from "../src/lib/agent";
import type { Design } from "../src/lib/design";
import { createCollection, memoryBackend } from "../src/lib/store";
import { distanceKm } from "../src/modules/map/geo";
import { baselineScore, Need, seedNeeds } from "../src/recipes/needs";

describe("store (CRUD cu seed)", () => {
  const Item = z.object({ name: z.string(), n: z.number() });

  it("pune datele de seed o singură dată și validează", async () => {
    const backend = memoryBackend();
    const c = createCollection("test", Item, [{ name: "a", n: 1 }], backend);
    expect((await c.list()).map((r) => r.data.name)).toEqual(["a"]);
    await c.add({ name: "b", n: 2 });
    expect(await c.list()).toHaveLength(2);
    await expect(c.add({ name: "c" } as never)).rejects.toThrow();
  });

  it("update, remove și reset", async () => {
    const c = createCollection("t2", Item, [{ name: "a", n: 1 }], memoryBackend());
    const [first] = await c.list();
    await c.update(first.id, { name: "a2", n: 5 });
    expect((await c.list())[0].data).toEqual({ name: "a2", n: 5 });
    await c.remove(first.id);
    expect(await c.list()).toHaveLength(0);
    await c.reset();
    expect((await c.list())[0].data.name).toBe("a");
  });

  it("ignoră rândurile care nu mai respectă schema (nu crapă UI-ul)", async () => {
    const backend = memoryBackend();
    await backend.insert("t3", { name: "bun", n: 1 });
    await backend.insert("t3", { vechi: true });
    const c = createCollection("t3", Item, [], backend);
    expect((await c.list()).map((r) => r.data.name)).toEqual(["bun"]);
  });

  it("persistă în storage dacă e dat", async () => {
    const mem: Record<string, string> = {};
    const storage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => void (mem[k] = v) };
    await createCollection("t4", Item, [], memoryBackend(storage)).add({ name: "x", n: 1 });
    const again = createCollection("t4", Item, [], memoryBackend(storage));
    expect((await again.list())[0].data.name).toBe("x");
  });
});

describe("domeniul exemplu: nevoi + potrivire", () => {
  it("datele de seed respectă schema", () => seedNeeds.forEach((n) => expect(Need.safeParse(n).success).toBe(true)));
  it("distanța București Nord–Titan e plauzibilă", () => expect(distanceKm({ lat: 44.4466, lng: 26.0731 }, { lat: 44.416, lng: 26.173 })).toBeGreaterThan(7));
  it("scorul favorizează urgența și apropierea, iar rezolvatele au 0", () => {
    const origin = { lat: 44.416, lng: 26.173 };
    const near = { ...seedNeeds[3], urgency: 5, lat: 44.417, lng: 26.172 };
    const far = { ...near, lat: 44.5, lng: 25.9 };
    expect(baselineScore(near, origin)).toBeGreaterThan(baselineScore(far, origin));
    expect(baselineScore({ ...near, status: "rezolvat" }, origin)).toBe(0);
  });
});

describe("agent cu confirmare umană", () => {
  const log: string[] = [];
  const actions = [
    defineAction({ name: "show", kind: "read", description: "Arată lista", args: z.object({}), run: () => void log.push("show"), examples: ["arată"], mockArgs: {} }),
    defineAction({ name: "close", description: "Închide o cerere", args: z.object({ id: z.string() }), run: ({ id }) => void log.push(`close:${id}`), examples: ["închide"], mockArgs: (input: string) => ({ id: input.split(" ").pop() ?? "" }) }),
  ];
  const plan = (calls: unknown[]) =>
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ provider: "mock", model: "mock", text: "", ms: 1, data: { say: "ok", actions: calls } })));
  afterEach(() => {
    log.length = 0;
    vi.unstubAllGlobals();
  });

  it("citirile rulează direct, scrierile doar după aprobare", async () => {
    plan([{ name: "show", args: {} }, { name: "close", args: { id: "1" } }, { name: "close", args: { id: "2" } }]);
    const confirm = vi.fn(async () => [true, false]);
    const turn = await runAgent({ input: "x", actions, confirm });
    expect(confirm).toHaveBeenCalledWith([
      { name: "close", description: "Închide o cerere", args: { id: "1" } },
      { name: "close", description: "Închide o cerere", args: { id: "2" } },
    ]);
    expect(log).toEqual(["show", "close:1"]);
    expect(turn.actions.map((a) => a.error ?? "ok")).toEqual(["ok", "ok", "respinsă de utilizator"]);
  });

  it("acțiunile invalide nu ajung la confirmare", async () => {
    plan([{ name: "close", args: {} }]);
    const confirm = vi.fn(async () => []);
    const turn = await runAgent({ input: "x", actions, confirm });
    expect(confirm).not.toHaveBeenCalled();
    expect(turn.actions[0].ok).toBe(false);
  });

  it("mockArgs poate fi o funcție de cerere", () => {
    expect(mockPlan("închide cererea 42", actions).actions[0]).toEqual({ name: "close", args: { id: "42" } });
  });
});

describe("reparare automată a designului", () => {
  const design: Design = {
    title: "t",
    width: 1240,
    height: 1754,
    background: "#ffffff",
    elements: [{ type: "text", id: "body", x: 100, y: 100, width: 1000, text: "Apa caldă se oprește joi", fontSize: 20, fill: "#cccccc", fontWeight: "normal", align: "left" }],
  };

  it("mărește fontul și repară contrastul până trece auditul", () => {
    const before = auditDesign(design, 21)[0];
    expect(before.level).toBe("fail");
    expect(before.readableFromM).toBeLessThan(2);
    const { design: fixed, changes } = autoFixDesign(design, { physicalWidthCm: 21, distanceM: 2 });
    const after = auditDesign(fixed, 21)[0];
    expect(after.level).not.toBe("fail");
    expect(after.readableFromM).toBeGreaterThanOrEqual(2);
    expect(changes).toHaveLength(2);
  });

  it("nu schimbă nimic dacă designul e deja bun", () => {
    const good = { ...design, elements: [{ ...design.elements[0], fontSize: 160, fill: "#000000" }] } as Design;
    expect(autoFixDesign(good, { physicalWidthCm: 21, distanceM: 2 }).changes).toEqual([]);
  });
});
