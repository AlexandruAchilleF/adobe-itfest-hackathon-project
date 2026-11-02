// Protocolul dintre telefoane (controllere) și ecranul mare. Logică pură, testată.

export type ControllerLayout = "gamepad" | "tilt" | "draw" | "choices" | "text";

/** Ce trimite ecranul mare către telefoane (starea camerei). */
export interface ScreenState {
  layout: ControllerLayout;
  /** întrebare/instrucțiune afișată pe telefon */
  prompt: string;
  /** pentru layout = "choices" */
  choices: string[];
}

/** Ce trimit telefoanele către ecran. Toate coordonatele sunt normalizate. */
export type ControllerInput =
  | { kind: "joystick"; x: number; y: number }
  | { kind: "tilt"; x: number; y: number }
  | { kind: "button"; id: "a" | "b"; pressed: boolean }
  | { kind: "draw"; stroke: string; points: Array<{ x: number; y: number }>; end: boolean }
  | { kind: "choice"; index: number }
  | { kind: "text"; value: string };

export const INPUT_EVENT = "input";

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

/** Poziția degetului față de centrul joystick-ului → vector în cercul unitate. */
export function joystickVector(dx: number, dy: number, radius: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len < radius * 0.08) return { x: 0, y: 0 }; // zonă moartă
  const scale = len > radius ? radius / len : 1;
  return { x: round((dx * scale) / radius), y: round((dy * scale) / radius) };
}

/**
 * Orientarea telefonului (DeviceOrientationEvent) → x/y în -1..1.
 * Telefon ținut în mână, ușor înclinat spre tine (~35°) = poziția neutră.
 */
export function tiltVector(beta: number | null, gamma: number | null, neutralBeta = 35, range = 30): { x: number; y: number } {
  if (beta == null || gamma == null) return { x: 0, y: 0 };
  return { x: round(clamp(gamma / range)), y: round(clamp((beta - neutralBeta) / range)) };
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Limitează frecvența trimiterii (ex: 20/s), dar trimite mereu ultima valoare. */
export function throttle<T>(fn: (v: T) => void, intervalMs: number) {
  let last = 0;
  let pending: T | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (v: T, now = Date.now()) => {
    if (now - last >= intervalMs) {
      last = now;
      fn(v);
    } else {
      pending = v;
      if (!timer)
        timer = setTimeout(() => {
          timer = null;
          last = Date.now();
          if (pending !== null) fn(pending);
          pending = null;
        }, intervalMs - (now - last));
    }
  };
}

/** Starea agregată a unui controller, ținută de ecran. */
export interface ControllerSnapshot {
  joystick: { x: number; y: number };
  tilt: { x: number; y: number };
  buttons: { a: boolean; b: boolean };
  choice: number | null;
  text: string | null;
  lastSeen: number;
}

export function emptySnapshot(): ControllerSnapshot {
  return { joystick: { x: 0, y: 0 }, tilt: { x: 0, y: 0 }, buttons: { a: false, b: false }, choice: null, text: null, lastSeen: 0 };
}

export function applyInput(s: ControllerSnapshot, input: ControllerInput, now: number): ControllerSnapshot {
  const next = { ...s, lastSeen: now };
  switch (input.kind) {
    case "joystick":
      next.joystick = { x: input.x, y: input.y };
      break;
    case "tilt":
      next.tilt = { x: input.x, y: input.y };
      break;
    case "button":
      next.buttons = { ...s.buttons, [input.id]: input.pressed };
      break;
    case "choice":
      next.choice = input.index;
      break;
    case "text":
      next.text = input.value;
      break;
  }
  return next;
}

/** Voturile din snapshot-uri → numărătoare pe opțiuni. */
export function tally(snapshots: Iterable<ControllerSnapshot>, options: number): number[] {
  const counts = new Array(options).fill(0);
  for (const s of snapshots) if (s.choice != null && s.choice >= 0 && s.choice < options) counts[s.choice] += 1;
  return counts;
}
