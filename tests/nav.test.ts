import { expect, it } from "vitest";
import { mainNav } from "../src/scenario/nav";
import { spire } from "../src/scenario/scenarios/spire";

it("meniul Spire vine din scenariu", () => {
  expect(mainNav(spire).map((i) => i.href)).toEqual(["/nou", "/campanii", "/marca"]);
});
