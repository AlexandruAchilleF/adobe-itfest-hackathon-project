// Randarea videoclipului în browser: scenariul (videoPlan.ts) desenat pe canvas, cadru cu cadru,
// cu fotografiile paginii și culorile și fonturile mărcii, înregistrat cu MediaRecorder.
// Fără furnizor video și fără cost pe rulare. Textele le desenează codul, deci sunt exact cele verificate.
import { END_CARD_SECONDS, frameAt, totalSeconds, type VideoPlan, type VideoScene } from "./videoPlan";

export interface VideoLook {
  name: string;
  colors: { background: string; primary: string; accent: string; text: string };
  fonts: { heading: string; body: string };
  mandatory: string[];
  logo?: string | null;
}

export const VIDEO_SIZE = { width: 720, height: 1280 } as const;
const FPS = 30;
const FADE = 0.35;

/** Familia din marcă și varianta ei „Variable”, cum o încarcă aplicația (Fraunces Variable, Geist Variable). */
const family = (name: string, fallback: string) => `"${name}", "${name} Variable", ${fallback}`;

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("O fotografie nu s-a putut încărca."));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, scene: VideoScene, local: number) {
  const { width: W, height: H } = VIDEO_SIZE;
  const t = ease(local);
  const zoom = scene.motion === "zoom-in" ? 1.04 + 0.12 * t : scene.motion === "zoom-out" ? 1.16 - 0.12 * t : 1.14;
  const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight) * zoom;
  const w = img.naturalWidth * cover, h = img.naturalHeight * cover;
  const slack = w - W;
  const x = scene.motion === "pan-left" ? -slack * t : scene.motion === "pan-right" ? -slack * (1 - t) : -slack / 2;
  ctx.drawImage(img, x, (H - h) / 2, w, h);
}

function drawScene(ctx: CanvasRenderingContext2D, look: VideoLook, photos: HTMLImageElement[], scene: VideoScene, local: number, elapsed: number) {
  const { width: W, height: H } = VIDEO_SIZE;
  const img = scene.photo !== null ? photos[scene.photo] : undefined;
  ctx.fillStyle = img ? "#000" : look.colors.background;
  ctx.fillRect(0, 0, W, H);
  if (img) {
    drawPhoto(ctx, img, scene, local);
    const shade = ctx.createLinearGradient(0, H * 0.4, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
  }
  const ink = img ? "#ffffff" : look.colors.text;
  const appear = ease((elapsed - 0.15) / 0.6);
  ctx.save();
  ctx.globalAlpha = appear;
  ctx.translate(0, (1 - appear) * 40);
  ctx.font = `700 64px ${family(look.fonts.heading, "Georgia, serif")}`;
  const lines = wrap(ctx, scene.title, W - 112).slice(0, 4);
  let y = H - 150 - (lines.length - 1) * 74;
  if (scene.kicker) {
    ctx.font = `600 28px ${family(look.fonts.body, "system-ui, sans-serif")}`;
    ctx.fillStyle = img ? look.colors.accent : look.colors.primary;
    ctx.fillText(scene.kicker.toUpperCase(), 56, y - 82);
  }
  ctx.font = `700 64px ${family(look.fonts.heading, "Georgia, serif")}`;
  ctx.fillStyle = ink;
  for (const line of lines) { ctx.fillText(line, 56, y); y += 74; }
  ctx.restore();
}

function drawEnd(ctx: CanvasRenderingContext2D, look: VideoLook, cta: string, logo: HTMLImageElement | null, elapsed: number) {
  const { width: W, height: H } = VIDEO_SIZE;
  ctx.fillStyle = look.colors.background;
  ctx.fillRect(0, 0, W, H);
  const appear = ease(elapsed / 0.6);
  ctx.save();
  ctx.globalAlpha = appear;
  ctx.textAlign = "center";
  let y = H * 0.42;
  if (logo) {
    const size = 220, scale = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
    ctx.drawImage(logo, (W - logo.naturalWidth * scale) / 2, y - 280, logo.naturalWidth * scale, logo.naturalHeight * scale);
  }
  ctx.fillStyle = look.colors.text;
  ctx.font = `700 76px ${family(look.fonts.heading, "Georgia, serif")}`;
  for (const line of wrap(ctx, look.name, W - 120).slice(0, 2)) { ctx.fillText(line, W / 2, y); y += 86; }
  ctx.font = `700 40px ${family(look.fonts.body, "system-ui, sans-serif")}`;
  const pill = Math.min(W - 120, ctx.measureText(cta).width + 96);
  ctx.fillStyle = look.colors.primary;
  ctx.beginPath();
  ctx.roundRect((W - pill) / 2, y + 30, pill, 96, 48);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cta, W / 2, y + 92, pill - 48);
  ctx.fillStyle = look.colors.text;
  ctx.font = `400 24px ${family(look.fonts.body, "system-ui, sans-serif")}`;
  let m = H - 90 - (look.mandatory.length - 1) * 32;
  for (const note of look.mandatory.slice(0, 3)) { ctx.fillText(note, W / 2, m, W - 80); m += 32; }
  ctx.restore();
}

/** Desenează cadrul de la secunda t, cu trecere prin negru între scene. */
export function drawFrame(ctx: CanvasRenderingContext2D, plan: VideoPlan, look: VideoLook, photos: HTMLImageElement[], logo: HTMLImageElement | null, t: number) {
  const frame = frameAt(plan, t);
  if (frame.kind === "end") drawEnd(ctx, look, plan.cta, logo, frame.elapsed);
  else drawScene(ctx, look, photos, frame.scene, frame.local, frame.elapsed);
  const sceneLength = frame.kind === "end" ? END_CARD_SECONDS : frame.scene.seconds;
  const fade = Math.max(0, 1 - frame.elapsed / FADE, frame.kind === "end" ? 0 : 1 - (sceneLength - frame.elapsed) / FADE);
  if (fade > 0 && t > 0.01) { ctx.fillStyle = `rgba(0,0,0,${fade * 0.9})`; ctx.fillRect(0, 0, VIDEO_SIZE.width, VIDEO_SIZE.height); }
}

function pickMime(): string {
  for (const type of ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"]) if (MediaRecorder.isTypeSupported(type)) return type;
  return "";
}

/** Randează clipul în timp real (atât cât durează) și întoarce fișierul. */
export async function renderVideo(plan: VideoPlan, look: VideoLook, photoSources: string[], onProgress?: (p: number) => void, signal?: AbortSignal): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") throw new Error("Browserul nu poate înregistra video. Folosește Chrome.");
  const photos = await Promise.all(photoSources.map(loadImage));
  const logo = look.logo ? await loadImage(look.logo).catch(() => null) : null;
  await Promise.all([look.fonts.heading, look.fonts.body].map((f) => document.fonts.load(`700 40px ${family(f, "serif")}`).catch(() => [])));
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_SIZE.width; canvas.height = VIDEO_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasul nu e disponibil.");
  drawFrame(ctx, plan, look, photos, logo, 0);

  const mimeType = pickMime();
  const recorder = new MediaRecorder(canvas.captureStream(FPS), { mimeType: mimeType || undefined, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((done) => { recorder.onstop = () => done(); });
  const duration = totalSeconds(plan);
  recorder.start(250);
  const started = performance.now();
  await new Promise<void>((done, fail) => {
    const tick = () => {
      if (signal?.aborted) { fail(new Error("Randarea a fost oprită.")); return; }
      const t = (performance.now() - started) / 1000;
      drawFrame(ctx, plan, look, photos, logo, Math.min(t, duration));
      onProgress?.(Math.min(1, t / duration));
      if (t >= duration) done(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }).finally(() => recorder.stop());
  await stopped;
  return new Blob(chunks, { type: (mimeType || "video/webm").split(";")[0] });
}
