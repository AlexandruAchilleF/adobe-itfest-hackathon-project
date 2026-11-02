// Logică pură pentru postura corpului (33 de puncte PoseLandmarker).
import type { Point3 } from "./gestures";

export const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
} as const;

export const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
];

export type PoseName = "none" | "both-arms-up" | "left-arm-up" | "right-arm-up" | "t-pose";

/** Clasificare simplă. LEFT_* din MediaPipe Pose = partea stângă a corpului persoanei. */
export function classifyPose(lm: Point3[]): PoseName {
  if (!lm || lm.length < 17) return "none";
  const ls = lm[POSE.LEFT_SHOULDER];
  const rs = lm[POSE.RIGHT_SHOULDER];
  const lw = lm[POSE.LEFT_WRIST];
  const rw = lm[POSE.RIGHT_WRIST];
  const shoulderWidth = Math.abs(rs.x - ls.x) || 1e-6;
  const leftUp = lw.y < ls.y - shoulderWidth * 0.5;
  const rightUp = rw.y < rs.y - shoulderWidth * 0.5;
  if (leftUp && rightUp) return "both-arms-up";
  const tPose =
    Math.abs(lw.y - ls.y) < shoulderWidth * 0.35 &&
    Math.abs(rw.y - rs.y) < shoulderWidth * 0.35 &&
    Math.abs(rw.x - lw.x) > shoulderWidth * 2.2;
  if (tPose) return "t-pose";
  if (leftUp) return "left-arm-up";
  if (rightUp) return "right-arm-up";
  return "none";
}
