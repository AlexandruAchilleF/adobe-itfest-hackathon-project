// Lucrul cu imagini în browser: micșorare, conversie și amprenta folosită de gardă.
// Calculele stau în color.ts și similarity.ts; aici e doar citirea pixelilor.
import { dominantColors } from "./color";
import { dHash, grayGrid, hamming } from "./similarity";

const SIGNATURE_SIZE = 128;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imaginea nu s-a putut citi."));
    img.src = src;
  });
}

async function draw(src: string, width: (w: number, h: number) => [number, number], background: string | null): Promise<HTMLCanvasElement> {
  const img = await loadImage(src);
  const [w, h] = width(img.naturalWidth || 512, img.naturalHeight || 512);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browserul nu poate desena imaginea.");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Imaginea ca data URL, cu latura cea mai mare de cel mult `max` px (JPEG implicit, ca să încapă în browser). */
export async function toDataUrl(src: string, { max = 1080, type = "image/jpeg", quality = 0.85 }: { max?: number; type?: "image/jpeg" | "image/png"; quality?: number } = {}): Promise<string> {
  const canvas = await draw(
    src,
    (w, h) => {
      const scale = Math.min(1, max / Math.max(w, h));
      return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
    },
    type === "image/jpeg" ? "#ffffff" : null,
  );
  return canvas.toDataURL(type, quality);
}

export function readFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function pixels(src: string): Promise<Uint8ClampedArray> {
  const canvas = await draw(src, () => [SIGNATURE_SIZE, SIGNATURE_SIZE], "#ffffff");
  return canvas.getContext("2d")!.getImageData(0, 0, SIGNATURE_SIZE, SIGNATURE_SIZE).data;
}

/** Ce măsoară garda despre ilustrație: culorile ei și cât de departe e de referință. */
export async function illustrationSignature(illustration: string, reference: string): Promise<{ colors: string[]; hashDistance: number }> {
  const [own, ref] = await Promise.all([pixels(illustration), pixels(reference)]);
  return {
    colors: dominantColors(own, 5),
    hashDistance: hamming(dHash(grayGrid(own, SIGNATURE_SIZE, SIGNATURE_SIZE)), dHash(grayGrid(ref, SIGNATURE_SIZE, SIGNATURE_SIZE))),
  };
}
