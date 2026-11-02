// Logică pură pentru expresii faciale și direcția capului, din rezultatul FaceLandmarker.
// Blendshapes (0..1): https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

import type { Point3 } from "./gestures";

export interface FaceExpressions {
  smile: number;
  blinkLeft: number;
  blinkRight: number;
  mouthOpen: number;
  browRaise: number;
  /** -1 (stânga) … 1 (dreapta), din perspectiva utilizatorului */
  yaw: number;
  /** -1 (sus) … 1 (jos) */
  pitch: number;
}

export type FaceEvent = "smile" | "blink" | "wink-left" | "wink-right" | "mouth-open" | "brow-raise";

/** Indici utili din cele 478 de puncte ale feței. */
export const FACE = { NOSE_TIP: 1, FOREHEAD: 10, CHIN: 152, LEFT_EDGE: 234, RIGHT_EDGE: 454 } as const;

export function expressionsFrom(
  blendshapes: Array<{ categoryName: string; score: number }>,
  landmarks: Point3[],
  mirror = true,
): FaceExpressions {
  const b = (name: string) => blendshapes.find((c) => c.categoryName === name)?.score ?? 0;
  const pose = headPose(landmarks);
  // în oglindă, ochiul „stâng" al modelului e ochiul drept pe ecran
  const blinkL = b("eyeBlinkLeft");
  const blinkR = b("eyeBlinkRight");
  return {
    smile: (b("mouthSmileLeft") + b("mouthSmileRight")) / 2,
    blinkLeft: mirror ? blinkR : blinkL,
    blinkRight: mirror ? blinkL : blinkR,
    mouthOpen: b("jawOpen"),
    browRaise: b("browInnerUp"),
    yaw: mirror ? -pose.yaw : pose.yaw,
    pitch: pose.pitch,
  };
}

/** Direcția capului din poziția nasului față de marginile feței. */
export function headPose(lm: Point3[]): { yaw: number; pitch: number } {
  if (!lm || lm.length < 455) return { yaw: 0, pitch: 0 };
  const nose = lm[FACE.NOSE_TIP];
  const left = lm[FACE.LEFT_EDGE];
  const right = lm[FACE.RIGHT_EDGE];
  const top = lm[FACE.FOREHEAD];
  const bottom = lm[FACE.CHIN];
  const width = right.x - left.x || 1e-6;
  const height = bottom.y - top.y || 1e-6;
  // nasul la mijloc = 0; normalizat ca ±0.25 din lățime să fie ±1
  const yaw = clamp(((nose.x - left.x) / width - 0.5) * 4);
  const pitch = clamp(((nose.y - top.y) / height - 0.55) * 5);
  return { yaw, pitch };
}

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

/**
 * Transformă valorile continue în evenimente (cu histerezis), ca un zâmbet ținut
 * să declanșeze un singur „smile", nu 30 pe secundă.
 */
export class FaceEventDetector {
  private active = new Set<FaceEvent>();
  constructor(
    private on = { smile: 0.6, blink: 0.55, mouth: 0.5, brow: 0.6 },
    private offRatio = 0.6,
  ) {}

  push(e: FaceExpressions): FaceEvent[] {
    const fired: FaceEvent[] = [];
    const both = Math.min(e.blinkLeft, e.blinkRight);
    const check = (ev: FaceEvent, value: number, threshold: number) => {
      if (!this.active.has(ev) && value >= threshold) {
        this.active.add(ev);
        fired.push(ev);
      } else if (this.active.has(ev) && value < threshold * this.offRatio) {
        this.active.delete(ev);
      }
    };
    check("smile", e.smile, this.on.smile);
    check("blink", both, this.on.blink);
    // wink = un ochi închis, celălalt deschis
    check("wink-left", e.blinkLeft - e.blinkRight, this.on.blink);
    check("wink-right", e.blinkRight - e.blinkLeft, this.on.blink);
    check("mouth-open", e.mouthOpen, this.on.mouth);
    check("brow-raise", e.browRaise, this.on.brow);
    return fired;
  }
}
