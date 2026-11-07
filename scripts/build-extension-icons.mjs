// npm run ext:icons: iconițele extensiei, din public/landing/hawk-mark.svg, cu un canvas în Chromium.
// La 128 px, desenul are 96 × 96 și 16 px transparenți pe fiecare latură (cerința Chrome Web Store); la 48 px, aceeași
// proporție. La 16 și 32 px (bara de unelte), desenul ocupă tot pătratul, ca să rămână lizibil.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "public/landing/hawk-mark.svg"), "utf8");
const PADDING = { 16: 0, 32: 0, 48: 6, 128: 16 };
const outDir = join(root, "chrome-extension/icons");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [sizeText, pad] of Object.entries(PADDING)) {
    const size = Number(sizeText);
    const art = size - pad * 2;
    const sized = svg.replace("<svg ", `<svg width="${art}" height="${art}" `);
    const result = await page.evaluate(
      async ({ sized, size, pad, art }) => {
        const img = new Image();
        img.src = `data:image/svg+xml;base64,${btoa(sized)}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, pad, pad, art, art);
        const { data } = ctx.getImageData(0, 0, size, size);
        const box = { left: size, top: size, right: -1, bottom: -1 };
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++)
            if (data[(y * size + x) * 4 + 3] > 0) {
              box.left = Math.min(box.left, x);
              box.top = Math.min(box.top, y);
              box.right = Math.max(box.right, x);
              box.bottom = Math.max(box.bottom, y);
            }
        return { url: canvas.toDataURL("image/png"), box };
      },
      { sized, size, pad, art },
    );
    const { left, top, right, bottom } = result.box;
    if (left < pad || top < pad || right >= size - pad || bottom >= size - pad) throw new Error(`icon-${size}: desenul iese din margine (${JSON.stringify(result.box)}).`);
    writeFileSync(join(outDir, `icon-${size}.png`), Buffer.from(result.url.split(",")[1], "base64"));
    console.log(`icon-${size}.png: desenul pictat ${left},${top} → ${right},${bottom}`);
  }
} finally {
  await browser.close();
}
