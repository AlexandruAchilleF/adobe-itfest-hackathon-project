// Urmele domeniului exemplu: după ce schimbați scenariul, numele și titlurile din scenariile
// inactive nu au voie să mai apară în cod (pagini, mock-uri, index.html). Un jurat le vede imediat.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scenario } from "../src/scenario/config";
import type { Scenario } from "../src/scenario/types";

const modules = import.meta.glob<Record<string, Scenario>>("../src/scenario/scenarios/*.ts", { eager: true });
const inactive = Object.values(modules)
  .flatMap((m) => Object.values(m))
  .filter((s) => s && typeof s === "object" && "id" in s && s.id !== scenario.id);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return p.includes(join("scenario", "scenarios")) ? [] : files(p);
    return /\.(ts|tsx|html)$/.test(f) ? [p] : [];
  });
}

describe("urmele scenariilor inactive", () => {
  const code = [...files("src"), "index.html"].map((p) => ({ p, text: readFileSync(p, "utf8") }));
  for (const s of inactive) {
    const needles = [s.app.name, ...s.seed.people.map((p) => p.name), ...s.seed.requests.map((r) => r.title)].filter((n) => n.length > 5);
    it(`nimic din „${s.app.name}” în cod`, () => {
      const hits = code.flatMap(({ p, text }) => needles.filter((n) => text.includes(n)).map((n) => `${p}: ${n}`));
      expect(hits).toEqual([]);
    });
  }
  it("scenariul activ are alt id decât cele inactive (datele vechi nu se amestecă)", () => {
    expect(inactive.map((s) => s.id)).not.toContain(scenario.id);
  });
});
