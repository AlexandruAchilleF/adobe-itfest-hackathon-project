// Testul de generare cu cheia reală (nu face parte din `npm run check`).
//   node scripts/spire-image-test.mjs <referinta.png> [mascota.svg] [--stil "descrierea stilului"] [--n 10]
// Rulează de N ori și salvează în tmp-spire/, cu timpul fiecărei rulări în rezultate.json.
// Folosește același cod ca aplicația (server/image.ts, src/lib/mascotPrompt.ts).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { createServer, loadEnv } from "vite";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const style = flag("--stil");
const runs = Number(flag("--n") ?? 10);
const [referencePath, mascotPath = "public/samples/spire/pip.svg"] = args;
if (!referencePath) {
  console.error('Folosire: node scripts/spire-image-test.mjs <referinta.png> [mascota.svg] [--stil "..."] [--n 10]');
  process.exit(1);
}

for (const [key, value] of Object.entries(loadEnv("development", process.cwd(), ""))) process.env[key] ??= value;
if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
  console.error("Lipsesc CLOUDFLARE_ACCOUNT_ID sau CLOUDFLARE_API_TOKEN: pune-le în .env (fișierul nu intră în git).");
  process.exit(1);
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

/** Orice imagine devine un PNG de cel mult 512 px, cu Chromium-ul din Playwright (SVG-ul nu e primit de model). */
async function attachment(path) {
  const mime = MIME[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Format necunoscut: ${path}. Folosește PNG, JPEG, WEBP sau SVG.`);
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  const src = `data:${mime};base64,${readFileSync(path).toString("base64")}`;
  await page.setContent(`<!doctype html><body style="margin:0"><img src="${src}" style="width:512px;height:512px;object-fit:contain;display:block"></body>`);
  await page.waitForFunction(() => document.images[0].complete);
  const png = await page.screenshot();
  await browser.close();
  return { mimeType: "image/png", data: png.toString("base64") };
}

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { generateImage, imageModel } = await vite.ssrLoadModule("/server/image.ts");
  const { mascotInstruction } = await vite.ssrLoadModule("/src/lib/mascotPrompt.ts");
  const { sampleAnatomy } = await vite.ssrLoadModule("/src/lib/anatomy.ts");
  const { demoBrand } = await vite.ssrLoadModule("/src/lib/brand.ts");

  const anatomy = { ...sampleAnatomy, illustration: style ? { style, subject: "" } : null };
  const instruction = mascotInstruction(anatomy, demoBrand);
  const [styleImage, subjectImage] = await Promise.all([attachment(referencePath), attachment(mascotPath)]);
  console.log(`Model: ${imageModel()}\n\n${instruction}\n`);

  mkdirSync("tmp-spire", { recursive: true });
  const results = [];
  for (let i = 1; i <= runs; i++) {
    const started = Date.now();
    const name = String(i).padStart(2, "0");
    try {
      const image = await generateImage(styleImage, subjectImage, instruction);
      const [, mime, data] = image.match(/^data:image\/(\w+);base64,(.+)$/s);
      const file = `tmp-spire/${name}.${mime === "jpeg" ? "jpg" : mime}`;
      writeFileSync(file, Buffer.from(data, "base64"));
      results.push({ run: i, file, ms: Date.now() - started });
      console.log(`${name}: ${file}, ${((Date.now() - started) / 1000).toFixed(1)} s`);
    } catch (err) {
      results.push({ run: i, error: err.message, ms: Date.now() - started });
      console.log(`${name}: EȘEC, ${err.message}`);
    }
  }

  const ok = results.filter((r) => r.file);
  const avg = ok.length ? ok.reduce((sum, r) => sum + r.ms, 0) / ok.length / 1000 : 0;
  writeFileSync("tmp-spire/rezultate.json", JSON.stringify({ model: imageModel(), instruction, results }, null, 2));
  console.log(`\nImagini: ${ok.length}/${runs}, timp mediu ${avg.toFixed(1)} s. Notează fiecare imagine: stilul ținut, pinguinul recognoscibil, fără text, fundal uniform.`);
} finally {
  await vite.close();
}
