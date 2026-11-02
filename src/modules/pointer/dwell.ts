// „Dwell click": dacă cursorul stă nemișcat (într-o rază mică) un anumit timp, se face click.
// Standard în accesibilitate pentru utilizatorii care nu pot apăsa un buton.

export class DwellDetector {
  private anchor: { x: number; y: number; t: number } | null = null;
  private fired = false;
  constructor(
    /** raza în pixeli în care mișcarea e considerată „nemișcat" */
    private radius = 30,
    /** cât trebuie să stea cursorul pe loc, în ms */
    private dwellMs = 1000,
  ) {}

  /** Returnează progresul 0..1 și `fire: true` exact o dată, când se atinge timpul. */
  push(x: number, y: number, t: number): { progress: number; fire: boolean } {
    if (!this.anchor || Math.hypot(x - this.anchor.x, y - this.anchor.y) > this.radius) {
      this.anchor = { x, y, t };
      this.fired = false;
      return { progress: 0, fire: false };
    }
    if (this.fired) return { progress: 1, fire: false };
    const progress = Math.min(1, (t - this.anchor.t) / this.dwellMs);
    if (progress >= 1) {
      this.fired = true;
      return { progress: 1, fire: true };
    }
    return { progress, fire: false };
  }

  reset() {
    this.anchor = null;
    this.fired = false;
  }
}

/** Mapează un punct normalizat (0..1) dintr-o zonă de lucru mai mică pe tot ecranul. */
export function mapToViewport(p: { x: number; y: number }, width: number, height: number, margin = 0.15): { x: number; y: number } {
  const span = 1 - 2 * margin;
  const nx = Math.max(0, Math.min(1, (p.x - margin) / span));
  const ny = Math.max(0, Math.min(1, (p.y - margin) / span));
  return { x: nx * width, y: ny * height };
}
