import { describe, expect, test } from "vitest";
import { z } from "zod";
import { type Backend, createCollection, memoryBackend, reloadWhenBack } from "../src/lib/store";

describe("reloadWhenBack", () => {
  test("reîncarcă la focus și se oprește după dezabonare", () => {
    const target = new EventTarget();
    let calls = 0;
    const stop = reloadWhenBack(target, () => calls++);
    target.dispatchEvent(new Event("focus"));
    expect(calls).toBe(1);
    stop();
    target.dispatchEvent(new Event("focus"));
    expect(calls).toBe(1);
  });
});

describe("createCollection", () => {
  test("o cădere a bazei la pornire nu rămâne definitivă", async () => {
    const memory = memoryBackend();
    let down = true;
    const backend: Backend = {
      ...memory,
      list: async (name) => {
        if (down) throw new Error("Supabase: indisponibil");
        return memory.list(name);
      },
    };
    const collection = createCollection("probă", z.object({ n: z.number() }), [{ n: 1 }], backend);
    await expect(collection.list()).rejects.toThrow("indisponibil");
    down = false;
    expect((await collection.list()).map((r) => r.data.n)).toEqual([1]);
  });
});
