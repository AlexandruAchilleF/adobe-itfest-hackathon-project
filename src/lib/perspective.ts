// Perspectivă: pune o imagine dreptunghiulară pe un patrulater oarecare dintr-o fotografie
// (perete, vitrină, stație de autobuz, ecran de laptop, copertă de carte...).
//
//   const quad = [stSus, drSus, drJos, stJos];        // 4 puncte atinse pe poză
//   drawImageToQuad(ctx, posterCanvas, quad);

export type Pt = { x: number; y: number };
/** Matrice 3x3, pe rânduri. */
export type Homography = number[];

/** Rezolvă un sistem liniar Ax = b (eliminare Gauss cu pivotare). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) throw new Error("Punctele sunt coliniare; alege 4 colțuri distincte.");
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/** Omografia care duce cele 4 puncte `src` în cele 4 puncte `dst`. */
export function homography(src: Pt[], dst: Pt[]): Homography {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  return [...solve(A, b), 1];
}

export function applyHomography(H: Homography, p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

/** Matrice CSS `matrix3d(...)` — pentru a pune un element DOM (ex: un video) în perspectivă. */
export function cssMatrix3d(H: Homography): string {
  const [a, b, c, d, e, f, g, h, i] = H;
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i].join(",")})`;
}

/** Desenează un triunghi din imagine, transformat afin în alt triunghi. */
function drawTriangle(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s: [Pt, Pt, Pt], d: [Pt, Pt, Pt]) {
  const [s0, s1, s2] = s;
  const [d0, d1, d2] = d;
  const den = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
  if (Math.abs(den) < 1e-9) return;
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / den;
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / den;
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / den;
  const dd = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / den;
  const e = d0.x - a * s0.x - c * s0.y;
  const f = d0.y - b * s0.x - dd * s0.y;
  // mărim puțin triunghiul de destinație ca să nu apară linii între bucăți
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const grow = (p: Pt) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * 1.2, y: p.y + (dy / len) * 1.2 };
  };
  ctx.save();
  ctx.beginPath();
  [d0, d1, d2].map(grow).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.transform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/**
 * Desenează `img` (dreptunghi w×h) pe patrulaterul `quad` [stânga-sus, dreapta-sus, dreapta-jos, stânga-jos].
 * Împarte imaginea într-o grilă de triunghiuri; `grid` mai mare = perspectivă mai exactă.
 */
export function drawImageToQuad(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, quad: Pt[], grid = 12) {
  const w = img.width;
  const h = img.height;
  const H = homography(
    [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ],
    quad,
  );
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const x0 = (w * i) / grid;
      const x1 = (w * (i + 1)) / grid;
      const y0 = (h * j) / grid;
      const y1 = (h * (j + 1)) / grid;
      const s = [
        { x: x0, y: y0 },
        { x: x1, y: y0 },
        { x: x1, y: y1 },
        { x: x0, y: y1 },
      ];
      const d = s.map((p) => applyHomography(H, p));
      drawTriangle(ctx, img, [s[0], s[1], s[2]], [d[0], d[1], d[2]]);
      drawTriangle(ctx, img, [s[0], s[2], s[3]], [d[0], d[2], d[3]]);
    }
  }
}

/** Ordonează 4 puncte atinse în orice ordine: stânga-sus, dreapta-sus, dreapta-jos, stânga-jos. */
export function orderQuad(points: Pt[]): Pt[] {
  const sum = (p: Pt) => p.x + p.y;
  const diff = (p: Pt) => p.x - p.y;
  const tl = points.reduce((a, b) => (sum(b) < sum(a) ? b : a));
  const br = points.reduce((a, b) => (sum(b) > sum(a) ? b : a));
  const tr = points.reduce((a, b) => (diff(b) > diff(a) ? b : a));
  const bl = points.reduce((a, b) => (diff(b) < diff(a) ? b : a));
  return [tl, tr, br, bl];
}
