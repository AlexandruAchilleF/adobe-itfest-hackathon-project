// Analiză audio pură (fără DOM): volum, notă muzicală, bătăi din palme, benzi de frecvență.

/** Volumul (RMS) unui buffer de eșantioane -1..1. */
export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / (buf.length || 1));
}

/**
 * Frecvența fundamentală prin autocorelație (merge bine pentru voce cântată, fluierat, instrumente).
 * Returnează null pentru liniște sau zgomot fără înălțime clară.
 */
export function detectPitch(buf: Float32Array, sampleRate: number, minHz = 70, maxHz = 1500): number | null {
  if (rms(buf) < 0.01) return null;
  const size = buf.length;
  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(Math.floor(sampleRate / minHz), size - 1);
  let best = -1;
  let bestCorr = 0;
  const corr = new Float32Array(maxLag + 2);
  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    let c = 0;
    let e1 = 0;
    let e2 = 0;
    for (let i = 0; i < size - lag; i++) {
      c += buf[i] * buf[i + lag];
      e1 += buf[i] * buf[i];
      e2 += buf[i + lag] * buf[i + lag];
    }
    corr[lag] = c / (Math.sqrt(e1 * e2) || 1);
  }
  // primul vârf peste prag (evită erorile de octavă), apoi maximul local
  for (let lag = minLag + 1; lag <= maxLag; lag++) {
    if (corr[lag] > 0.9 && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      best = lag;
      bestCorr = corr[lag];
      break;
    }
    if (corr[lag] > bestCorr) {
      bestCorr = corr[lag];
      best = lag;
    }
  }
  if (best < 0 || bestCorr < 0.8) return null;
  // interpolare parabolică pentru precizie sub-eșantion
  const a = corr[best - 1] ?? corr[best];
  const b = corr[best];
  const c = corr[best + 1] ?? corr[best];
  const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
  return sampleRate / (best + (Number.isFinite(shift) ? shift : 0));
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 440 Hz → { name: "A4", midi: 69, cents: 0 } */
export function noteFromFrequency(freq: number): { name: string; midi: number; cents: number } {
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const name = `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  return { name, midi, cents };
}

/**
 * Detectează sunete scurte și puternice (bătăi din palme, lovituri pe masă).
 * Compară volumul curent cu media recentă; are cooldown ca să nu dubleze.
 */
export class OnsetDetector {
  private avg = 0;
  private lastOnset = -Infinity;
  constructor(
    private ratio = 3,
    private minLevel = 0.08,
    private cooldownMs = 150,
    private smoothing = 0.95,
  ) {}
  push(level: number, timeMs: number): boolean {
    const isOnset = level > this.minLevel && level > this.avg * this.ratio && timeMs - this.lastOnset > this.cooldownMs;
    this.avg = this.avg * this.smoothing + level * (1 - this.smoothing);
    if (isOnset) this.lastOnset = timeMs;
    return isOnset;
  }
}

/** Energia (0..1) pe benzi, din datele getByteFrequencyData. */
export function frequencyBands(freq: Uint8Array, sampleRate: number): { bass: number; mid: number; treble: number } {
  const binHz = sampleRate / 2 / freq.length;
  const band = (lo: number, hi: number) => {
    const a = Math.max(0, Math.floor(lo / binHz));
    const b = Math.min(freq.length - 1, Math.ceil(hi / binHz));
    let sum = 0;
    for (let i = a; i <= b; i++) sum += freq[i];
    return sum / ((b - a + 1) * 255);
  };
  return { bass: band(20, 250), mid: band(250, 2000), treble: band(2000, 8000) };
}
