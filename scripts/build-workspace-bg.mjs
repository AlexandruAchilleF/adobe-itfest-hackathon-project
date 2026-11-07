// npm run ui:bg: fundalul ecranelor de lucru (public/landing/workspace.webp), din cerul de pe landing.
// Imaginea iese mică și deja blurată, ca browserul să n-aibă de făcut un `filter: blur` pe tot ecranul:
// cerul blurat, un voal crem peste el, apoi o trecere spre `paper`, care ajunge plină pe ultimul rând.
// Scriptul oprește build-ul dacă textul `muted` ar coborî sub 4,5:1 pe vreun pixel sau dacă marginea de jos nu e `paper`.
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/index.css"), "utf8");
const token = (name) => {
  const found = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!found) throw new Error(`Nu găsesc tokenul ${name} în src/index.css.`);
  return found[1];
};

const WIDTH = 320;
const HEIGHT = 200;
const BLUR_PX = 18;
const VEIL = 0.78; // cât crem acoperă cerul
const MELT_FROM = 0.3; // de unde, pe înălțime, începe trecerea spre paper
const QUALITY = 1; // la 1, Chromium scrie webp fără pierderi; cu pierderi, blocurile se văd pe degradeul lent
const MIN_CONTRAST = 4.5;
const MAX_PAPER_DELTA = 1; // abaterea admisă pe rândul de jos

const sky = `data:image/webp;base64,${readFileSync(join(root, "public/landing/sky.webp")).toString("base64")}`;
const out = join(root, "public/landing/workspace.webp");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const result = await page.evaluate(
    async ({ sky, paper, cream, muted, WIDTH, HEIGHT, BLUR_PX, VEIL, MELT_FROM, QUALITY }) => {
      const load = async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return img;
      };
      const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
      const luminance = ([r, g, b]) => {
        const f = (v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };

      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const ctx = canvas.getContext("2d");
      // desenat mai mare decât pânza, ca blurul să nu lase margini transparente
      const image = await load(sky);
      const bleed = BLUR_PX * 3;
      ctx.filter = `blur(${BLUR_PX}px)`;
      ctx.drawImage(image, -bleed, -bleed, WIDTH + 2 * bleed, HEIGHT + 2 * bleed);
      ctx.filter = "none";
      ctx.globalAlpha = VEIL;
      ctx.fillStyle = cream;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.globalAlpha = 1;
      const [r, g, b] = rgb(paper);
      const melt = ctx.createLinearGradient(0, HEIGHT * MELT_FROM, 0, HEIGHT);
      melt.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
      melt.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`);
      ctx.fillStyle = melt;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const url = canvas.toDataURL("image/webp", QUALITY);

      // măsurăm imaginea decodată, așa cum o va desena browserul
      const decoded = await load(url);
      const check = document.createElement("canvas");
      check.width = WIDTH;
      check.height = HEIGHT;
      const checkCtx = check.getContext("2d");
      checkCtx.drawImage(decoded, 0, 0);
      const { data } = checkCtx.getImageData(0, 0, WIDTH, HEIGHT);
      const text = luminance(rgb(muted));
      let minContrast = 21;
      let bottomDelta = 0;
      const target = rgb(paper);
      for (let y = 0; y < HEIGHT; y++)
        for (let x = 0; x < WIDTH; x++) {
          const i = (y * WIDTH + x) * 4;
          const pixel = [data[i], data[i + 1], data[i + 2]];
          const contrast = (luminance(pixel) + 0.05) / (text + 0.05);
          if (contrast < minContrast) minContrast = contrast;
          if (y === HEIGHT - 1) bottomDelta = Math.max(bottomDelta, ...pixel.map((v, c) => Math.abs(v - target[c])));
        }
      return { url, minContrast, bottomDelta };
    },
    { sky, paper: token("paper"), cream: token("cream"), muted: token("muted"), WIDTH, HEIGHT, BLUR_PX, VEIL, MELT_FROM, QUALITY },
  );
  if (result.minContrast < MIN_CONTRAST) throw new Error(`Textul muted are doar ${result.minContrast.toFixed(2)}:1 pe fundal. Crește VEIL.`);
  if (result.bottomDelta > MAX_PAPER_DELTA) throw new Error(`Rândul de jos se abate cu ${result.bottomDelta} de la paper.`);
  writeFileSync(out, Buffer.from(result.url.split(",")[1], "base64"));
  console.log(`workspace.webp: ${WIDTH}×${HEIGHT}, ${(statSync(out).size / 1024).toFixed(1)} KB, contrast minim muted ${result.minContrast.toFixed(2)}:1, abatere jos ${result.bottomDelta}`);
} finally {
  await browser.close();
}
