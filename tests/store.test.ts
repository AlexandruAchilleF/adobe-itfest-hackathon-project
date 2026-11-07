import { describe, expect, test } from "vitest";
import { reloadWhenBack } from "../src/lib/store";

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
