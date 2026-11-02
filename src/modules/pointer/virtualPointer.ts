// Cursor virtual: transformă orice sursă (cap, mână, joystick de pe telefon) în evenimente
// reale de mouse/pointer pe pagină. Așa, butoanele, pânza Fabric, slider-ele etc. merg
// fără să le rescrii. Coordonatele sunt în pixeli față de viewport (clientX/clientY).
//
//   const vp = new VirtualPointer();
//   vp.move(x, y);  vp.down();  vp.move(x2, y2);  vp.up();   // drag
//   vp.click();                                               // click la poziția curentă

const OPTS = { bubbles: true, cancelable: true, composed: true } as const;

export class VirtualPointer {
  x = 0;
  y = 0;
  isDown = false;
  private downTarget: Element | null = null;

  /** elementul de sub cursor (cursorul desenat trebuie să aibă pointer-events: none) */
  target(): Element | null {
    return document.elementFromPoint(this.x, this.y);
  }

  private fire(type: string, el: Element | null, buttons: number) {
    if (!el) return;
    const init = { ...OPTS, clientX: this.x, clientY: this.y, screenX: this.x, screenY: this.y, button: 0, buttons, view: window };
    if (type.startsWith("pointer")) {
      el.dispatchEvent(new PointerEvent(type, { ...init, pointerId: 99, pointerType: "mouse", isPrimary: true }));
    } else {
      el.dispatchEvent(new MouseEvent(type, init));
    }
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
    const el = this.target();
    const buttons = this.isDown ? 1 : 0;
    this.fire("pointermove", el, buttons);
    this.fire("mousemove", el, buttons);
    // în timpul unui drag, unele biblioteci ascultă pe document
    if (this.isDown && el !== document.documentElement) {
      document.dispatchEvent(new MouseEvent("mousemove", { ...OPTS, clientX: x, clientY: y, buttons: 1 }));
    }
  }

  down() {
    if (this.isDown) return;
    this.isDown = true;
    this.downTarget = this.target();
    this.fire("pointerdown", this.downTarget, 1);
    this.fire("mousedown", this.downTarget, 1);
    if (this.downTarget instanceof HTMLElement && typeof this.downTarget.focus === "function") this.downTarget.focus({ preventScroll: true });
  }

  up() {
    if (!this.isDown) return;
    this.isDown = false;
    const el = this.target();
    this.fire("pointerup", el, 0);
    this.fire("mouseup", el, 0);
    document.dispatchEvent(new MouseEvent("mouseup", { ...OPTS, clientX: this.x, clientY: this.y }));
    // click doar dacă apăsarea și eliberarea au fost pe același element (ca în browser)
    if (el && this.downTarget && (el === this.downTarget || this.downTarget.contains(el))) this.fire("click", el, 0);
    this.downTarget = null;
  }

  click() {
    this.down();
    this.up();
  }
}
