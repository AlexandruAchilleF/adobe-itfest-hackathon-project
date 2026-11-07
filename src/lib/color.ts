// Culori: conversie în Lab, distanța percepută și culorile dominante din pixeli. Logică pură.

const channels = (hex: string): [number, number, number] => {
  const v = parseInt(hex.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

const toHex = (rgb: readonly number[]): string => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Distanța CIE76: sub ~2 ochiul abia o vede, peste ~25 sunt alte culori. */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a);
  const [l2, a2, b2] = hexToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function nearest(hex: string, palette: string[]): { hex: string; distance: number } {
  let best = { hex: palette[0], distance: Infinity };
  for (const candidate of palette) {
    const distance = deltaE(hex, candidate);
    if (distance < best.distance) best = { hex: candidate, distance };
  }
  return best;
}

const ITERATIONS = 12;

/** K-means determinist: centrele inițiale sunt culorile cele mai frecvente după cuantizare la 4 biți. */
export function dominantColors(rgba: Uint8ClampedArray, k = 5): string[] {
  // pixelii identici se grupează, ca o imagine mare să rămână ieftină
  const counts = new Map<number, number>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const colors = [...counts].map(([key, n]) => ({ rgb: [(key >> 16) & 255, (key >> 8) & 255, key & 255], n }));

  const buckets = new Map<number, { sum: number[]; n: number }>();
  for (const { rgb, n } of colors) {
    const key = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4);
    const bucket = buckets.get(key) ?? { sum: [0, 0, 0], n: 0 };
    rgb.forEach((c, i) => (bucket.sum[i] += c * n));
    bucket.n += n;
    buckets.set(key, bucket);
  }
  let centers = [...buckets.entries()]
    .sort(([ka, a], [kb, b]) => b.n - a.n || ka - kb)
    .slice(0, k)
    .map(([, b]) => b.sum.map((s) => s / b.n));

  let sizes: number[] = [];
  for (let iter = 0; iter < ITERATIONS; iter++) {
    const sums = centers.map(() => [0, 0, 0]);
    sizes = centers.map(() => 0);
    for (const { rgb, n } of colors) {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((c, i) => {
        const d = (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      rgb.forEach((v, i) => (sums[best][i] += v * n));
      sizes[best] += n;
    }
    centers = centers.map((c, i) => (sizes[i] ? sums[i].map((s) => s / sizes[i]) : c));
  }
  return centers
    .map((c, i) => ({ hex: toHex(c), n: sizes[i] }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((c) => c.hex);
}
