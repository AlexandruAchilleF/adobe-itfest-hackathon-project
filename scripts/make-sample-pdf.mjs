// Transformă un fișier HTML într-un PDF exemplu (pentru demo și teste), cu Chromium din Playwright.
//   node scripts/make-sample-pdf.mjs                          → toate fișierele din samples-src/
//   node scripts/make-sample-pdf.mjs samples-src/lectie.html  → doar unul
// Rezultatul ajunge în public/samples/<nume>.pdf. Titlurile se fac cu <h1>/<h2>/<h3> (mărimi diferite),
// ca detectarea automată a cuprinsului să le găsească.
import { readdir, readFile } from "node:fs/promises";
import { basename } from "node:path";
import { chromium } from "@playwright/test";

const root = new URL("..", import.meta.url).pathname;
const inputs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (await readdir(`${root}samples-src`)).filter((f) => f.endsWith(".html")).map((f) => `samples-src/${f}`);

const browser = await chromium.launch();
const page = await browser.newPage();
for (const input of inputs) {
  await page.setContent(await readFile(input.startsWith("/") ? input : `${root}${input}`, "utf8"));
  const out = `${root}public/samples/${basename(input, ".html")}.pdf`;
  await page.pdf({ path: out, format: "A4", margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" } });
  console.log(`PDF generat: public/samples/${basename(out)}`);
}
await browser.close();
