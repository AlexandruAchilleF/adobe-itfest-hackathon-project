import { describe, expect, it } from "vitest";
import { detectPitch, frequencyBands, noteFromFrequency, OnsetDetector, rms } from "../src/modules/audio/analysis";
import { FaceEventDetector, type FaceExpressions, headPose } from "../src/modules/camera/face";
import { classifyPose } from "../src/modules/camera/pose";
import { applyInput, emptySnapshot, joystickVector, tally, throttle, tiltVector } from "../src/modules/controller/protocol";
import { LineSplitter } from "../src/modules/hardware/serial";

const sine = (hz: number, sampleRate = 44100, n = 2048, amp = 0.5) =>
  Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / sampleRate));

describe("audio", () => {
  it("rms al unei sinusoide ≈ amplitudine/√2", () => expect(rms(sine(440))).toBeCloseTo(0.5 / Math.SQRT2, 2));
  it("detectează 440 Hz", () => expect(detectPitch(sine(440), 44100)!).toBeCloseTo(440, -0.5));
  it("detectează 196 Hz (G3)", () => expect(detectPitch(sine(196), 44100)!).toBeCloseTo(196, -0.5));
  it("liniștea nu are notă", () => expect(detectPitch(new Float32Array(2048), 44100)).toBeNull());
  it("440 Hz = A4", () => expect(noteFromFrequency(440)).toEqual({ name: "A4", midi: 69, cents: 0 }));
  it("261.63 Hz = C4", () => expect(noteFromFrequency(261.63).name).toBe("C4"));
  it("detectează bătaia din palme și ignoră zgomotul constant", () => {
    const d = new OnsetDetector(3, 0.08, 150);
    let t = 0;
    for (let i = 0; i < 60; i++) expect(d.push(0.02, (t += 16))).toBe(false);
    expect(d.push(0.4, (t += 16))).toBe(true);
    expect(d.push(0.4, (t += 16))).toBe(false); // cooldown
  });
  it("benzile de frecvență sunt între 0 și 1", () => {
    const b = frequencyBands(new Uint8Array(1024).fill(255), 44100);
    expect(b.bass).toBeCloseTo(1);
    expect(b.treble).toBeCloseTo(1);
  });
});

describe("față", () => {
  const faceLm = (noseX: number) => {
    const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    lm[234] = { x: 0.3, y: 0.5 };
    lm[454] = { x: 0.7, y: 0.5 };
    lm[10] = { x: 0.5, y: 0.2 };
    lm[152] = { x: 0.5, y: 0.8 };
    lm[1] = { x: noseX, y: 0.53 };
    return lm;
  };
  it("capul drept → yaw ≈ 0", () => expect(headPose(faceLm(0.5)).yaw).toBeCloseTo(0));
  it("nasul spre dreapta imaginii → yaw pozitiv", () => expect(headPose(faceLm(0.6)).yaw).toBeGreaterThan(0.5));

  const expr = (p: Partial<FaceExpressions>): FaceExpressions => ({ smile: 0, blinkLeft: 0, blinkRight: 0, mouthOpen: 0, browRaise: 0, yaw: 0, pitch: 0, ...p });
  it("un zâmbet ținut declanșează un singur eveniment", () => {
    const d = new FaceEventDetector();
    expect(d.push(expr({ smile: 0.8 }))).toEqual(["smile"]);
    expect(d.push(expr({ smile: 0.8 }))).toEqual([]);
    expect(d.push(expr({ smile: 0.1 }))).toEqual([]);
    expect(d.push(expr({ smile: 0.8 }))).toEqual(["smile"]);
  });
  it("clipitul cu un ochi e wink, cu ambii e blink", () => {
    expect(new FaceEventDetector().push(expr({ blinkLeft: 0.9, blinkRight: 0.9 }))).toContain("blink");
    expect(new FaceEventDetector().push(expr({ blinkLeft: 0.9, blinkRight: 0.1 }))).toEqual(["wink-left"]);
  });
});

describe("corp", () => {
  const body = (lwY: number, rwY: number, spread = 0.1) => {
    const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.6 }));
    lm[11] = { x: 0.6, y: 0.4 }; // umăr stâng (al persoanei)
    lm[12] = { x: 0.4, y: 0.4 };
    lm[15] = { x: 0.6 + spread, y: lwY };
    lm[16] = { x: 0.4 - spread, y: rwY };
    return lm;
  };
  it("ambele mâini sus", () => expect(classifyPose(body(0.1, 0.1))).toBe("both-arms-up"));
  it("mâna stângă sus", () => expect(classifyPose(body(0.1, 0.7))).toBe("left-arm-up"));
  it("T-pose", () => expect(classifyPose(body(0.4, 0.4, 0.3))).toBe("t-pose"));
  it("nimic", () => expect(classifyPose(body(0.7, 0.7))).toBe("none"));
});

describe("controller", () => {
  it("joystick: zonă moartă și limitare la cerc", () => {
    expect(joystickVector(2, 2, 100)).toEqual({ x: 0, y: 0 });
    expect(joystickVector(200, 0, 100)).toEqual({ x: 1, y: 0 });
    expect(joystickVector(50, 0, 100)).toEqual({ x: 0.5, y: 0 });
  });
  it("tilt: poziția neutră e 0", () => {
    expect(tiltVector(35, 0)).toEqual({ x: 0, y: 0 });
    expect(tiltVector(95, 60)).toEqual({ x: 1, y: 1 });
    expect(tiltVector(null, null)).toEqual({ x: 0, y: 0 });
  });
  it("aplică input-urile și numără voturile", () => {
    let a = emptySnapshot();
    a = applyInput(a, { kind: "button", id: "a", pressed: true }, 1);
    a = applyInput(a, { kind: "choice", index: 1 }, 2);
    const b = applyInput(emptySnapshot(), { kind: "choice", index: 1 }, 3);
    const c = applyInput(emptySnapshot(), { kind: "choice", index: 0 }, 3);
    expect(a.buttons.a).toBe(true);
    expect(tally([a, b, c, emptySnapshot()], 3)).toEqual([1, 2, 0]);
  });
  it("throttle trimite imediat, apoi ultima valoare", async () => {
    const sent: number[] = [];
    const t = throttle<number>((v) => sent.push(v), 30);
    t(1, Date.now());
    t(2, Date.now());
    t(3, Date.now());
    await new Promise((r) => setTimeout(r, 60));
    expect(sent).toEqual([1, 3]);
  });
});

describe("serial", () => {
  it("împarte fluxul în linii complete", () => {
    const s = new LineSplitter();
    expect(s.push("OK\r\nTEMP 2")).toEqual(["OK"]);
    expect(s.push("3.5\nBTN 1\n")).toEqual(["TEMP 23.5", "BTN 1"]);
  });
});
