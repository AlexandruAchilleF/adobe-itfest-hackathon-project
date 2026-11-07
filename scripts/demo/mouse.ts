// Mouse-ul virtual: mișcă mouse-ul real al paginii, ca hover-ul, focusul și clicurile să fie adevărate.
// Stratul de regie (director.js) desenează cursorul exact unde e mouse-ul. Totul e reproductibil (DEMO_SEED).
import type { Locator, Page } from "@playwright/test";

export type Rect = { x: number; y: number; width: number; height: number };
export type Target = Locator | Rect;

const STEP_MS = 16;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isRect = (t: Target): t is Rect => typeof (t as Rect).width === "number" && typeof (t as Rect).x === "number";

/** mulberry32: același seed, același drum. */
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DemoMouse {
  private page: Page;
  private x: number;
  private y: number;
  private random: () => number;

  constructor(page: Page, seed = Number(process.env.DEMO_SEED ?? 1107), start = { x: 960, y: 540 }) {
    this.page = page;
    this.random = generator(seed);
    this.x = start.x;
    this.y = start.y;
  }

  private between(min: number, max: number) {
    return min + (max - min) * this.random();
  }

  /** Noul tab pornește cu cursorul de unde a rămas. */
  async attach(page: Page) {
    this.page = page;
    await this.step(this.x, this.y);
  }

  private async step(x: number, y: number) {
    this.x = x;
    this.y = y;
    await Promise.all([
      this.page.mouse.move(x, y),
      this.page.evaluate(([cx, cy]) => (window as unknown as { __demo?: { cursorAt(a: number, b: number): void } }).__demo?.cursorAt(cx, cy), [x, y]),
    ]);
  }

  private async rectOf(target: Target): Promise<Rect> {
    if (isRect(target)) return target;
    await target.waitFor({ state: "visible", timeout: 30_000 });
    const box = await target.boundingBox();
    if (!box) throw new Error("Ținta mouse-ului nu are casetă.");
    return box;
  }

  private async curve(toX: number, toY: number, ms: number) {
    const fromX = this.x;
    const fromY = this.y;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.hypot(dx, dy);
    const bend = distance * this.between(0.05, 0.15) * (this.random() < 0.5 ? -1 : 1);
    const cx = (fromX + toX) / 2 - (dy / (distance || 1)) * bend;
    const cy = (fromY + toY) / 2 + (dx / (distance || 1)) * bend;
    const start = performance.now();
    for (;;) {
      const raw = Math.min(1, (performance.now() - start) / ms);
      const t = easeInOut(raw);
      const u = 1 - t;
      await this.step(u * u * fromX + 2 * u * t * cx + t * t * toX, u * u * fromY + 2 * u * t * cy + t * t * toY);
      if (raw >= 1) return;
      await sleep(STEP_MS);
    }
  }

  /** Legea lui Fitts: drum lung și țintă mică înseamnă mai mult timp. */
  private async travel(rect: Rect) {
    const toX = rect.x + rect.width * this.between(0.4, 0.6);
    const toY = rect.y + rect.height * this.between(0.4, 0.6);
    const distance = Math.hypot(toX - this.x, toY - this.y);
    if (distance < 2) return;
    const size = Math.max(8, Math.min(rect.width, rect.height));
    const ms = Math.min(1100, Math.max(350, 180 + 165 * Math.log2(distance / size + 1)));
    if (distance > 400) {
      const over = this.between(3, 6);
      await this.curve(toX + ((toX - this.x) / distance) * over, toY + ((toY - this.y) / distance) * over, ms);
      await this.curve(toX, toY, this.between(90, 140));
    } else {
      await this.curve(toX, toY, ms);
    }
  }

  private async setHint(target: Target) {
    let shape: string | null = null;
    if (!isRect(target)) {
      shape = await target.evaluate((el) => {
        const css = getComputedStyle(el).cursor;
        if (css === "pointer") return "pointer";
        if (css === "text" || el.matches('input:not([type="checkbox"],[type="radio"]),textarea')) return "text";
        return el.closest('a[href],button,[role="button"],summary') ? "pointer" : "arrow";
      });
    }
    await this.page.evaluate((s) => (window as unknown as { __demo?: { cursorHint(v: string | null): void } }).__demo?.cursorHint(s), shape);
  }

  /** Dacă ținta e în afara ecranului, mouse-ul derulează cu rotița până la ea. */
  private async ensureVisible(target: Target) {
    if (isRect(target)) return;
    const viewport = this.page.viewportSize()!;
    const rect = await this.rectOf(target);
    if (rect.y >= 0 && rect.y + rect.height <= viewport.height) return;
    await this.scrollTo(target);
  }

  async hover(target: Target) {
    await this.ensureVisible(target);
    await this.travel(await this.rectOf(target));
    await this.setHint(target);
  }

  async click(target: Target) {
    await this.hover(target);
    await sleep(this.between(120, 300));
    await this.page.evaluate(([x, y]) => (window as unknown as { __demo?: { ripple(a: number, b: number): void } }).__demo?.ripple(x, y), [this.x, this.y]);
    await this.page.mouse.down();
    await sleep(this.between(60, 110));
    await this.page.mouse.up();
  }

  /** Tragere reală, cu butonul ținut apăsat: chenarul selecției crește odată cu mișcarea mâinii. */
  async drag(from: { x: number; y: number }, to: { x: number; y: number }, ms = 900) {
    await this.travel({ x: from.x - 2, y: from.y - 2, width: 4, height: 4 });
    await sleep(120);
    await this.page.mouse.down();
    await sleep(70);
    await this.curve(to.x, to.y, ms);
    await sleep(120);
    await this.page.mouse.up();
  }

  /** Clic în câmp, apoi literă cu literă. */
  async type(target: Target, text: string, pace = 1) {
    await this.click(target);
    await this.keys(text, pace);
  }

  async keys(text: string, pace = 1) {
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await sleep(pace * (this.between(45, 110) + (ch === " " || ch === "," ? this.between(70, 160) : 0)));
    }
  }

  async press(key: string, times = 1) {
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press(key);
      await sleep(this.between(70, 140));
    }
  }

  /**
   * Rotița, în impulsuri de om. Cu locator: aduce ținta la `top` (px în fereastră).
   * Cu număr: derulează pagina la acel `scrollY`.
   */
  async scrollTo(target: Locator | number, { top = 160 }: { top?: number } = {}) {
    const remaining = async () => {
      if (typeof target === "number") return target - (await this.page.evaluate(() => window.scrollY));
      const box = await target.boundingBox();
      if (!box) throw new Error("Ținta derulării nu are casetă.");
      return box.y - top;
    };
    let left = await remaining();
    for (let guard = 0; Math.abs(left) > 30 && guard < 120; guard++) {
      const near = Math.abs(left) < 320;
      const size = Math.min(Math.abs(left), near ? this.between(40, 80) : this.between(80, 140));
      await this.page.mouse.wheel(0, Math.sign(left) * size);
      await sleep(near ? this.between(70, 110) : this.between(40, 70));
      const next = await remaining();
      if (Math.abs(next) >= Math.abs(left) && guard > 4) {
        await sleep(120);
        left = await remaining();
        if (Math.abs(left) >= Math.abs(next)) break;
        continue;
      }
      left = next;
    }
  }

  /** În pauzele de voce mouse-ul derivă foarte lent, fără să înghețe și fără să danseze. */
  async idle(ms: number) {
    const fromX = this.x;
    const fromY = this.y;
    const amplitude = this.between(2, 6);
    const phase = this.between(0, Math.PI * 2);
    const start = performance.now();
    for (;;) {
      const elapsed = performance.now() - start;
      if (elapsed >= ms) break;
      const t = elapsed / 2600;
      await this.step(fromX + Math.sin(t + phase) * amplitude - Math.sin(phase) * amplitude, fromY + Math.sin(t * 0.7 + phase) * amplitude * 0.6 - Math.sin(phase) * amplitude * 0.6);
      await sleep(50);
    }
  }
}
