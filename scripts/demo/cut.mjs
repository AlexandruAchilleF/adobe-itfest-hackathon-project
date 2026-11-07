// Montajul video-ului demo: citește docs/demo/demo-run.json și video-urile tab-urilor, accelerează așteptările
// lungi cu etichetă (×N calculat din durata reală) și lipește scenele, cu cross-fade sau cu cortina uliului.
// Scrie public/pitch/demo.mp4 și docs/demo/repere.md.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
// `DEMO_VARIANT=viteza-reala`: fișiere separate, fără nicio accelerare la montaj.
const REAL_SPEED = process.env.DEMO_VARIANT === "viteza-reala";
const SUFFIX = REAL_SPEED ? "-viteza-reala" : "";
const RUN = JSON.parse(readFileSync(join(ROOT, `docs/demo/demo-run${SUFFIX}.json`), "utf8"));
const OUT = join(ROOT, `public/pitch/demo${SUFFIX}.mp4`);
const WORK = join(ROOT, "test-results-demo/cut");
const FADE = 0.4;
const MAX_WAIT = 2;
const FPS = 30;

const VOICE = {
  0: "Marina Park, un camping din Vama Veche. Au site, n-au designer.",
  1: "Proprietarul pornește Spire chiar pe site-ul lui.",
  2: "Găsește problemele singur, zonă cu zonă.",
  3: "Cere rezolvarea și vede pagina refăcută: meniul, secțiunile, cardurile.",
  4: "Acum Spire citește pagina și extrage contextul. Nu scrie nimeni un prompt.",
  5: "Cere un clip direct din extensie și îl primește aici.",
  6: "Pe Google găsește un afiș care îi place.",
  7: "Îl selectează cu Inspire. Atât.",
  8: "Aceeași așezare. Marca lor. Pozele lor. (patru secunde de liniște)",
  9: "Tot ce a făcut îl găsește în dashboard, în campanii.",
  10: "Spire. De la o pagină la o campanie, pe marca ta.",
};
const ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// Verificările din specificație: secunda finală, calculată din reperele rulării.
const DEADLINES = [
  { mark: "ajustari", before: 32, label: "Ajustările se aplică" },
  { mark: "clip", before: 50, label: "Clipul apare" },
];

const ffmpeg = (...args) => execFileSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", ...args], { stdio: "inherit" });
const durationOf = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" }).trim());
const seconds = (ms) => (ms / 1000).toFixed(3);
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const speedLabel = (n) => `Accelerat ×${n >= 10 ? Math.round(n) : n.toFixed(1).replace(".", ",")}`;

/** ffmpeg-ul din brew nu are drawtext, deci eticheta e un PNG randat în Chromium, în același stil cu regia. */
async function renderLabels(labels) {
  if (!labels.size) return new Map();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 90 } });
  const files = new Map();
  let i = 0;
  for (const text of labels) {
    await page.setContent(`<body style="margin:0;background:transparent"><span id="t" style="display:inline-block;padding:9px 16px;border-radius:10px;background:rgb(20 20 24 / .88);color:#fff;font:600 22px -apple-system,'Helvetica Neue',Arial,sans-serif">${text}</span></body>`);
    const file = join(WORK, `tag-${i++}.png`);
    await page.locator("#t").screenshot({ path: file, omitBackground: true });
    files.set(text, file);
  }
  await browser.close();
  return files;
}

/** O scenă devine bucăți: normal, accelerat (așteptările peste 2 s), normal. Nimic nu se taie. */
function sceneParts(scene) {
  const parts = [];
  let cursor = scene.start;
  for (const wait of [...scene.waits].sort((a, b) => a.start - b.start)) {
    const length = (wait.end - wait.start) / 1000;
    if (REAL_SPEED || length <= MAX_WAIT) continue;
    if (wait.start > cursor) parts.push({ from: cursor, to: wait.start, speed: 1 });
    parts.push({ from: wait.start, to: wait.end, speed: length / MAX_WAIT, wait });
    cursor = wait.end;
  }
  if (scene.end > cursor) parts.push({ from: cursor, to: scene.end, speed: 1 });
  return parts;
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(join(ROOT, "public/pitch"), { recursive: true });

const fileOf = new Map(RUN.tabs.map((t) => [t.id, t]));
for (const tab of RUN.tabs) if (!existsSync(tab.file)) throw new Error(`Lipsește video-ul tab-ului ${tab.id}: ${tab.file}. Rulează npm run demo:film.`);

const scenes = RUN.scenes.map((scene) => ({ ...scene, parts: sceneParts(scene) }));
const order = scenes.map((s) => s.id).join(",");
if (order !== ORDER.join(",")) throw new Error(`Scenele nu sunt în ordinea cerută: ${order}`);
const labels = new Set(scenes.flatMap((s) => s.parts.filter((p) => p.wait).map((p) => speedLabel(p.speed))));
const tags = await renderLabels(labels);

// Câte o bucată pe fișier, la 30 fps și 1920×1080, aproape fără pierderi.
const segments = [];
scenes.forEach((scene, sceneIndex) => {
  const next = scenes[sceneIndex + 1];
  const tabChanges = next && next.tab !== scene.tab;
  scene.parts.forEach((part, partIndex) => {
    const last = partIndex === scene.parts.length - 1;
    // ultima bucată dinaintea unui cross-fade mai ține cât el, ca scena să nu piardă nimic; cortina uliului se lipește direct
    const to = part.to + (last && tabChanges && !next.wipeIn ? FADE * 1000 : 0);
    const file = join(WORK, `seg-${String(segments.length).padStart(3, "0")}.mp4`);
    const source = fileOf.get(scene.tab).file;
    const base = `fps=${FPS},scale=1920:1080:flags=lanczos,setsar=1`;
    const encode = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-pix_fmt", "yuv420p", "-an", file];
    if (part.wait) {
      const label = tags.get(speedLabel(part.speed));
      ffmpeg("-ss", seconds(part.from), "-to", seconds(to), "-i", source, "-loop", "1", "-i", label, "-filter_complex", `[0:v]setpts=(PTS-STARTPTS)/${part.speed.toFixed(4)},${base}[v];[v][1:v]overlay=W-w-28:28:shortest=1[o]`, "-map", "[o]", "-r", String(FPS), ...encode);
    } else {
      ffmpeg("-ss", seconds(part.from), "-to", seconds(to), "-i", source, "-vf", `setpts=PTS-STARTPTS,${base}`, ...encode);
    }
    segments.push({ file, scene: scene.id, tab: scene.tab, wipeIn: scene.wipeIn === true, firstOfScene: partIndex === 0, duration: durationOf(file) });
  });
});

// Lanțul: concat în același tab și la cortina uliului, xfade la celelalte schimbări de tab. Calculăm și unde începe fiecare scenă.
const inputs = segments.flatMap((s) => ["-i", s.file]);
// același timebase peste tot, altfel xfade refuză ieșirea lui concat
const graph = segments.map((_, i) => `[${i}:v]settb=AVTB,setpts=PTS-STARTPTS[s${i}]`);
let label = "[s0]";
let timeline = 0;
const starts = new Map();
segments.forEach((segment, i) => {
  if (i === 0) {
    starts.set(segment.scene, 0);
    timeline = segment.duration;
    return;
  }
  const out = `[v${i}]`;
  const crossTab = segment.tab !== segments[i - 1].tab && !segment.wipeIn;
  if (crossTab) {
    const offset = Math.max(0, timeline - FADE);
    graph.push(`${label}[s${i}]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${out}`);
    timeline = offset + segment.duration;
    if (segment.firstOfScene) starts.set(segment.scene, offset + FADE);
  } else {
    graph.push(`${label}[s${i}]concat=n=2:v=1:a=0${out}`);
    if (segment.firstOfScene) starts.set(segment.scene, timeline);
    timeline += segment.duration;
  }
  label = out;
});

ffmpeg(...inputs, "-filter_complex", graph.join(";"), "-map", label, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart", "-an", OUT);

const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name,avg_frame_rate:format=duration,size", "-of", "json", OUT], { encoding: "utf8" }));
const stream = info.streams[0];
const total = Number(info.format.duration);
const megabytes = statSync(OUT).size / 1024 / 1024;
if (stream.width !== 1920 || stream.height !== 1080 || stream.codec_name !== "h264") throw new Error(`Format greșit: ${JSON.stringify(stream)}`);
if (megabytes >= 50) throw new Error(`Video-ul are ${megabytes.toFixed(1)} MB, limita e 50.`);

const rows = scenes.map((scene, i) => {
  const start = starts.get(scene.id);
  const end = i + 1 < scenes.length ? starts.get(scenes[i + 1].id) : total;
  const faster = scene.parts.filter((p) => p.wait).map((p) => `${p.wait.label}: ${(p.wait.end - p.wait.start) / 1000 | 0} s reale, ×${p.speed.toFixed(1)}`);
  return `| ${scene.id} | ${clock(start)} | ${(end - start).toFixed(1)} s | ${VOICE[scene.id]}${faster.length ? ` <br>_${faster.join("; ")}_` : ""} |`;
});
writeFileSync(
  join(ROOT, `docs/demo/repere${SUFFIX}.md`),
  `# Reperele video-ului demo

Din montajul de pe ${new Date().toISOString().slice(0, 10)}. Video-ul n-are sunet: echipa vorbește peste el, în sală. Durată: ${clock(total)} (${total.toFixed(1)} s). Rulare cu \`${RUN.provider}\`, ${RUN.aiCalls.length} apeluri AI.${RUN.provider === "mock" ? " **Critica și scanarea din film sunt simulate (mock); pe ecran scrie „Analiză simulată”.**" : ""}

| Scena | Începe la | Ține | Voce |
|---|---|---|---|
${rows.join("\n")}
`,
);

console.log(`${OUT}\n${total.toFixed(1)} s, ${stream.width}×${stream.height}, ${stream.avg_frame_rate} fps, ${megabytes.toFixed(1)} MB`);
// Secunda finală a unui reper: începutul scenei, plus bucățile dinaintea lui, la viteza lor.
const finalSecond = (scene, at) => {
  let t = starts.get(scene.id);
  for (const part of scene.parts) {
    if (at <= part.from) break;
    t += (Math.min(at, part.to) - part.from) / 1000 / part.speed;
  }
  return t;
};
// Banda gri de jos: la scări diferite, înregistrarea Playwright primește cadre tăiate și le completează cu gri.
// E un defect de filmare, deci rularea se refilmează.
const strip = execFileSync("ffmpeg", ["-hide_banner", "-v", "error", "-i", OUT, "-vf", "fps=5,crop=1920:6:0:1074,scale=8:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 16 * 1024 * 1024 });
const banded = [];
for (let frame = 0; frame * 24 < strip.length; frame++) {
  const row = strip.subarray(frame * 24, frame * 24 + 24);
  if (row.every((value, i) => Math.abs(value - 128) <= 4 && Math.abs(value - row[i - i % 3]) <= 2)) banded.push(frame / 5);
}
if (banded.length) {
  console.error(`DEFECT: bandă gri în ${banded.length} cadre, între ${banded[0].toFixed(1)} s și ${banded[banded.length - 1].toFixed(1)} s. Refilmează.`);
  process.exitCode = 1;
} else {
  console.log("Cadrele n-au bandă gri.");
}
let late = false;
for (const { mark, before, label } of REAL_SPEED ? [] : DEADLINES) {
  const scene = scenes.find((s) => s.marks?.[mark] !== undefined);
  if (!scene) throw new Error(`Lipsește reperul „${mark}” din demo-run.json.`);
  const t = finalSecond(scene, scene.marks[mark]);
  const ok = t < before;
  late ||= !ok;
  console.log(`${label} la ${t.toFixed(1)} s (cerut: înainte de ${before} s)${ok ? "" : " — PREA TÂRZIU"}.`);
}
if (late) process.exitCode = 1;
