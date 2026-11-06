// Regenerează src/pitch/hawkGraph.ts din silueta și lanțurile din build.browser.js.
//   node scripts/hawk-graph/generate.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const src = fs.readFileSync(path.join(__dirname, "build.browser.js"), "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<body></body>");
  await page.addScriptTag({ content: src });
  const g = await page.evaluate(() => buildHawkGraph());
  await browser.close();
  const kinds = [...new Set(g.nodes.map((n) => n[2]))].sort();
  const code = Object.fromEntries(kinds.map((k, i) => [k, i]));
  const list = (a) => a.map((x) => `[${x.join(",")}]`).join(",");
  const out = `// Datele grafului „uliul de pază” (generate o dată din silueta lui, cu triangulare și lanțuri pe
// anatomie: sprânceana, ciocul, muchia aripii, rândurile de pene, remigele, penele cozii, degetele).
// Coordonate în viewBox 0 0 200 240. Desenul e în HawkMark.tsx. Se regenerează cu
// node scripts/hawk-graph/generate.cjs, nu se editează de mână.

/** felul nodului: ${kinds.map((k, i) => `${i} = ${k}`).join(", ")} */
export const KINDS = ${JSON.stringify(kinds)} as const;
export type Kind = (typeof KINDS)[number];

/** [x, y, felul] */
export const NODES: ReadonlyArray<readonly [number, number, number]> = [${list(g.nodes.map(([x, y, k]) => [x, y, code[k]]))}];
/** muchiile de structură (contur, anatomie), desenate mai apăsat */
export const STRONG: ReadonlyArray<readonly [number, number]> = [${list(g.strong)}];
/** muchiile de umplere (triangularea), foarte fine */
export const WEAK: ReadonlyArray<readonly [number, number]> = [${list(g.weak)}];
`;
  fs.writeFileSync(path.join(__dirname, "../../src/pitch/hawkGraph.ts"), out);
  console.log(`${g.nodes.length} noduri, ${g.strong.length + g.weak.length} muchii → src/pitch/hawkGraph.ts`);
})();
