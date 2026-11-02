import { describe, expect, it } from "vitest";
import { classifyGesture, GestureDebouncer, type Point3, Smoother, SwipeDetector } from "../src/modules/camera/gestures";

// Construiește o mână sintetică: încheietura jos, degete în sus.
// `extended` = ce degete sunt întinse [index, middle, ring, pinky]; `pinch` lipește degetul mare de arătător.
function hand({ extended = [true, true, true, true], pinch = false } = {}): Point3[] {
  const lm: Point3[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.8 }));
  lm[0] = { x: 0.5, y: 0.9 }; // wrist
  const bases = [0.42, 0.48, 0.54, 0.6];
  const fingers = [
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
    [17, 18, 19, 20],
  ];
  fingers.forEach(([mcp, pip, dip, tip], i) => {
    const x = bases[i];
    lm[mcp] = { x, y: 0.7 };
    lm[pip] = { x, y: 0.6 };
    if (extended[i]) {
      lm[dip] = { x, y: 0.5 };
      lm[tip] = { x, y: 0.42 };
    } else {
      lm[dip] = { x, y: 0.68 };
      lm[tip] = { x, y: 0.78 }; // vârful îndoit spre palmă
    }
  });
  lm[1] = { x: 0.4, y: 0.85 };
  lm[2] = { x: 0.34, y: 0.78 };
  lm[3] = { x: 0.3, y: 0.72 };
  lm[4] = pinch ? { x: lm[8].x + 0.01, y: lm[8].y + 0.01 } : { x: 0.25, y: 0.66 };
  return lm;
}

describe("classifyGesture", () => {
  it("recunoaște palma deschisă", () => expect(classifyGesture(hand())).toBe("open"));
  it("recunoaște pumnul", () => expect(classifyGesture(hand({ extended: [false, false, false, false] }))).toBe("fist"));
  it("recunoaște arătătorul", () => expect(classifyGesture(hand({ extended: [true, false, false, false] }))).toBe("point"));
  it("recunoaște semnul V", () => expect(classifyGesture(hand({ extended: [true, true, false, false] }))).toBe("victory"));
  it("recunoaște ciupitul", () => expect(classifyGesture(hand({ pinch: true }))).toBe("pinch"));
  it("întoarce none pentru date incomplete", () => expect(classifyGesture([])).toBe("none"));
});

describe("GestureDebouncer", () => {
  it("schimbă gestul doar după N cadre consecutive", () => {
    const d = new GestureDebouncer(3);
    expect(d.push("fist")).toBe("none");
    expect(d.push("fist")).toBe("none");
    expect(d.push("fist")).toBe("fist");
    expect(d.push("open")).toBe("fist");
  });
});

describe("Smoother", () => {
  it("se apropie treptat de țintă", () => {
    const s = new Smoother(0.5);
    s.push({ x: 0, y: 0 });
    expect(s.push({ x: 1, y: 1 })).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("SwipeDetector", () => {
  it("detectează swipe la dreapta și apoi intră în cooldown", () => {
    const sd = new SwipeDetector(0.25, 350, 600);
    expect(sd.push({ x: 0.2, y: 0.5 }, 0)).toBeNull();
    expect(sd.push({ x: 0.35, y: 0.5 }, 100)).toBeNull();
    expect(sd.push({ x: 0.5, y: 0.5 }, 200)).toBe("right");
    expect(sd.push({ x: 0.9, y: 0.5 }, 300)).toBeNull();
  });
  it("ignoră mișcările lente", () => {
    const sd = new SwipeDetector(0.25, 350);
    expect(sd.push({ x: 0.2, y: 0.5 }, 0)).toBeNull();
    expect(sd.push({ x: 0.3, y: 0.5 }, 400)).toBeNull();
    expect(sd.push({ x: 0.4, y: 0.5 }, 800)).toBeNull();
  });
});
