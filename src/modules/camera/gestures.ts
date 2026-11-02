// Logică pură (fără DOM) pentru gesturi din cele 21 de puncte MediaPipe ale mâinii.
// Indicii punctelor: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
//   0 încheietura · 4 vârf degetul mare · 8 vârf arătător · 12 mijlociu · 16 inelar · 20 mic

export interface Point3 {
  x: number;
  y: number;
  z?: number;
}

export type Gesture = "none" | "pinch" | "fist" | "open" | "point" | "victory";

export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const;

export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export const dist = (a: Point3, b: Point3) => Math.hypot(a.x - b.x, a.y - b.y);

/** Mărimea mâinii (încheietură → baza degetului mijlociu); face pragurile independente de distanța față de cameră. */
export const handSize = (lm: Point3[]) => dist(lm[LM.WRIST], lm[LM.MIDDLE_MCP]) || 1e-6;

/** Un deget e „întins" dacă vârful e mai departe de încheietură decât articulația PIP. */
export function fingerExtended(lm: Point3[], tip: number, pip: number): boolean {
  return dist(lm[tip], lm[LM.WRIST]) > dist(lm[pip], lm[LM.WRIST]) * 1.1;
}

/** Cât de apropiate sunt degetul mare și arătătorul (0 = lipite, ~1+ = depărtate). */
export function pinchRatio(lm: Point3[]): number {
  return dist(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) / handSize(lm);
}

export function classifyGesture(lm: Point3[]): Gesture {
  if (!lm || lm.length < 21) return "none";
  const index = fingerExtended(lm, LM.INDEX_TIP, LM.INDEX_PIP);
  const middle = fingerExtended(lm, LM.MIDDLE_TIP, LM.MIDDLE_PIP);
  const ring = fingerExtended(lm, LM.RING_TIP, LM.RING_PIP);
  const pinky = fingerExtended(lm, LM.PINKY_TIP, LM.PINKY_PIP);

  if (pinchRatio(lm) < 0.35) return "pinch";
  if (!index && !middle && !ring && !pinky) return "fist";
  if (index && middle && ring && pinky) return "open";
  if (index && middle && !ring && !pinky) return "victory";
  if (index && !middle && !ring && !pinky) return "point";
  return "none";
}

/**
 * Stabilizează gestul: îl schimbă doar după ce același gest apare N cadre la rând.
 * Elimină „pâlpâirea" între gesturi la marginea pragurilor.
 */
export class GestureDebouncer {
  private candidate: Gesture = "none";
  private count = 0;
  current: Gesture = "none";
  constructor(private frames = 3) {}
  push(g: Gesture): Gesture {
    if (g === this.candidate) this.count += 1;
    else {
      this.candidate = g;
      this.count = 1;
    }
    if (this.count >= this.frames) this.current = this.candidate;
    return this.current;
  }
}

/** Netezire exponențială pentru cursor (mai mic alpha = mai lin, dar cu întârziere). */
export class Smoother {
  private last: { x: number; y: number } | null = null;
  constructor(private alpha = 0.35) {}
  push(p: { x: number; y: number }) {
    this.last = this.last
      ? { x: this.last.x + this.alpha * (p.x - this.last.x), y: this.last.y + this.alpha * (p.y - this.last.y) }
      : { ...p };
    return this.last;
  }
  reset() {
    this.last = null;
  }
}

export type Swipe = "left" | "right" | "up" | "down";

/** Detectează swipe-uri din poziția încheieturii în timp (coordonate normalizate 0..1). */
export class SwipeDetector {
  private history: Array<{ x: number; y: number; t: number }> = [];
  private cooldownUntil = 0;
  constructor(
    private minDistance = 0.25,
    private windowMs = 350,
    private cooldownMs = 600,
  ) {}
  push(p: { x: number; y: number }, t: number): Swipe | null {
    this.history.push({ ...p, t });
    this.history = this.history.filter((h) => t - h.t <= this.windowMs);
    if (t < this.cooldownUntil || this.history.length < 3) return null;
    const first = this.history[0];
    const dx = p.x - first.x;
    const dy = p.y - first.y;
    let swipe: Swipe | null = null;
    if (Math.abs(dx) >= this.minDistance && Math.abs(dx) > Math.abs(dy) * 1.5) swipe = dx > 0 ? "right" : "left";
    else if (Math.abs(dy) >= this.minDistance && Math.abs(dy) > Math.abs(dx) * 1.5) swipe = dy > 0 ? "down" : "up";
    if (swipe) {
      this.cooldownUntil = t + this.cooldownMs;
      this.history = [];
    }
    return swipe;
  }
  reset() {
    this.history = [];
  }
}
