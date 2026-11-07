// Pozele uliului pentru extensia Chrome (chrome-extension/mascot-poses.js) se generează din
// MascotFigure.tsx, ca extensia să rămână fără build la încărcare. Testul verifică că fișierul e la zi;
// cu UPDATE_POSES=1 îl rescrie (npm run ext:poses).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const OUT = fileURLToPath(new URL("../chrome-extension/mascot-poses.js", import.meta.url));
const CMD = "npm run ext:poses";
const MOODS = ["idle", "searching", "thinking", "worried", "happy", "celebrate"] as const;
const POSES = ["flying", "perched"] as const;

type Poses = Record<string, Record<(typeof POSES)[number], string>>;

/** Rădăcina SVG pentru extensie: umple containerul, fără clasa de mișcare (o controlează extensia). */
function forExtension(svg: string) {
  return svg.replace(/^<svg([^>]*)>/, (_, attrs: string) => {
    const clean = attrs
      .replace(/\sclass="[^"]*"/, "")
      .replace(/\swidth="[^"]*"/, ' width="100%"')
      .replace(/\sheight="[^"]*"/, ' height="100%"');
    return `<svg xmlns="http://www.w3.org/2000/svg"${clean}>`;
  });
}

async function generate(): Promise<{ poses: Poses; source: string }> {
  // extensia e Spire: aceleași nume și culoare oricare ar fi .env-ul celui care rulează
  vi.stubEnv("VITE_SCENARIO", "spire");
  vi.stubEnv("VITE_MASCOT_NAME", "");
  vi.stubEnv("VITE_MASCOT_COLOR", "");
  const { MascotFigure } = await import("../src/modules/mascot/MascotFigure");
  const poses: Poses = {};
  for (const mood of MOODS) {
    poses[mood] = {
      flying: forExtension(renderToStaticMarkup(createElement(MascotFigure, { mood, pose: "flying" }))),
      perched: forExtension(renderToStaticMarkup(createElement(MascotFigure, { mood, pose: "perched" }))),
    };
  }
  const source =
    `// Generat din MascotFigure.tsx; nu-l edita de mână. Rulează: ${CMD}\n` +
    `// Pozele uliului pentru extensie: { stare: { flying, perched } }, ca SVG gata de pus în pagină.\n` +
    `globalThis.SPIRE_POSES = ${JSON.stringify(poses, null, 2)};\n`;
  return { poses, source };
}

describe("pozele uliului pentru extensie", () => {
  it("chrome-extension/mascot-poses.js e la zi cu MascotFigure.tsx", async () => {
    const { source } = await generate();
    if (process.env.UPDATE_POSES === "1") writeFileSync(OUT, source);
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
    expect(current, `chrome-extension/mascot-poses.js nu e la zi. Rulează: ${CMD}`).toBe(source);
  });

  it("fișierul e un script clasic care pune ambele poze pe globalThis.SPIRE_POSES", () => {
    expect(existsSync(OUT), `lipsește chrome-extension/mascot-poses.js. Rulează: ${CMD}`).toBe(true);
    const ctx: { SPIRE_POSES?: Poses } = {};
    runInNewContext(readFileSync(OUT, "utf8"), ctx);
    expect(Object.keys(ctx.SPIRE_POSES ?? {}).sort()).toEqual([...MOODS].sort());
    for (const mood of MOODS) {
      for (const pose of POSES) expect(ctx.SPIRE_POSES?.[mood][pose], `${mood}.${pose}`).toMatch(/^<svg[\s\S]*<\/svg>$/);
    }
  });

  it("zborul are aripile deschise animabile, așezarea are aripile strânse", async () => {
    const { poses } = await generate();
    for (const mood of MOODS) {
      const { flying, perched } = poses[mood];
      expect(flying, mood).toContain('class="mascot-wing"');
      expect(flying, mood).not.toContain("mascot-folded");
      expect(perched, mood).not.toContain("mascot-wing");
      expect(perched, mood).toContain('class="mascot-folded"');
    }
  });

  it("rădăcina SVG umple containerul și nu are clasă de mișcare", async () => {
    const { poses } = await generate();
    for (const mood of MOODS) {
      for (const pose of POSES) {
        const root = /^<svg[^>]*>/.exec(poses[mood][pose])?.[0] ?? "";
        expect(root).toContain('width="100%"');
        expect(root).toContain('height="100%"');
        expect(root).toContain('xmlns="http://www.w3.org/2000/svg"');
        expect(root).not.toMatch(/class=/);
      }
    }
  });
});
