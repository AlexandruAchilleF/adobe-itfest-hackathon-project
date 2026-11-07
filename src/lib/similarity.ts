// Amprenta perceptuală a unei imagini (dHash): imaginile aproape identice au distanță mică. Logică pură.

const COLS = 9;
const ROWS = 8;

/** Media luminozității pe o grilă de 9×8 blocuri. */
export function grayGrid(rgba: Uint8ClampedArray, w: number, h: number): number[] {
  const sums = new Array<number>(COLS * ROWS).fill(0);
  const counts = new Array<number>(COLS * ROWS).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const gray = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      // o imagine mai mică decât grila își umple toate blocurile pe care le acoperă
      for (let row = Math.floor((y * ROWS) / h); row < Math.max(Math.floor((y * ROWS) / h) + 1, Math.ceil(((y + 1) * ROWS) / h)); row++) {
        for (let col = Math.floor((x * COLS) / w); col < Math.max(Math.floor((x * COLS) / w) + 1, Math.ceil(((x + 1) * COLS) / w)); col++) {
          sums[row * COLS + col] += gray;
          counts[row * COLS + col]++;
        }
      }
    }
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
}

/** 64 de biți, în hex: fiecare bit spune dacă blocul din stânga e mai luminos decât vecinul lui. */
export function dHash(grid: number[]): string {
  let hash = "";
  let nibble = 0;
  let bits = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS - 1; col++) {
      nibble = (nibble << 1) | (grid[row * COLS + col] > grid[row * COLS + col + 1] ? 1 : 0);
      if (++bits === 4) {
        hash += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hash;
}

export function hamming(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    let diff = parseInt(a[i] ?? "0", 16) ^ parseInt(b[i] ?? "0", 16);
    for (; diff; diff &= diff - 1) distance++;
  }
  return distance;
}
