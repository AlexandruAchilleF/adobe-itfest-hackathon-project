// Copiază fișierele WASM MediaPipe în public/ și descarcă modelele, ca demo-ul
// să meargă și când internetul din sală e slab. Dacă descărcarea eșuează,
// aplicația încarcă automat modelele de pe CDN la runtime.
import { cp, mkdir, writeFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const wasmSrc = `${root}node_modules/@mediapipe/tasks-vision/wasm`;
const outDir = `${root}public/mediapipe`;

const MODELS = {
  "hand_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  "face_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
};

if (!existsSync(wasmSrc)) {
  console.log("[mediapipe] pachetul nu e instalat încă, sar peste.");
  process.exit(0);
}

await mkdir(`${outDir}/models`, { recursive: true });
await cp(wasmSrc, `${outDir}/wasm`, { recursive: true });
console.log("[mediapipe] WASM copiat în public/mediapipe/wasm");

for (const [name, url] of Object.entries(MODELS)) {
  const dest = `${outDir}/models/${name}`;
  try {
    await access(dest);
    continue;
  } catch {}
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`[mediapipe] model descărcat: ${name}`);
  } catch (err) {
    console.warn(`[mediapipe] nu am putut descărca ${name} (${err.message}); se va folosi CDN-ul la runtime.`);
  }
}
