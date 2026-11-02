// Urmărirea mâinilor în timp real. Returnează puncte deja „oglindite"
// (x = 1 - x), ca să corespundă cu ce vede utilizatorul în preview-ul selfie.
//
//   const cam = useCamera();
//   const { hands } = useHands(cam.videoRef, {
//     enabled: cam.status === "ready",
//     onFrame: (hands) => { if (hands[0]?.gesture === "pinch") ... },
//   });

import { type RefObject, useEffect, useRef, useState } from "react";
import { classifyGesture, GestureDebouncer, type Gesture, LM, type Point3, Smoother, type Swipe, SwipeDetector } from "./gestures";
import { getHandLandmarker } from "./vision";

export interface TrackedHand {
  /** "Left" / "Right" din perspectiva utilizatorului */
  handedness: string;
  /** 21 de puncte normalizate 0..1, oglindite pentru selfie */
  landmarks: Point3[];
  gesture: Gesture;
  /** Vârful arătătorului, netezit — bun pe post de cursor */
  pointer: { x: number; y: number };
  /** Ultimul swipe detectat în cadrul ăsta (sau null) */
  swipe: Swipe | null;
}

interface Options {
  enabled?: boolean;
  numHands?: number;
  mirror?: boolean;
  /** Apelat la fiecare cadru — pune aici logica aplicației (fără setState la fiecare cadru!). */
  onFrame?: (hands: TrackedHand[], timestamp: number) => void;
  /** Cât de des se actualizează starea React `hands` (ms). Default 100. */
  stateIntervalMs?: number;
}

export function useHands(videoRef: RefObject<HTMLVideoElement | null>, options: Options = {}) {
  const { enabled = true, numHands = 2, mirror = true, stateIntervalMs = 100 } = options;
  const onFrameRef = useRef(options.onFrame);
  onFrameRef.current = options.onFrame;

  const [hands, setHands] = useState<TrackedHand[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const handsRef = useRef<TrackedHand[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let cancelled = false;
    const perHand = new Map<string, { debouncer: GestureDebouncer; smoother: Smoother; swipe: SwipeDetector }>();
    let lastVideoTime = -1;
    let lastStateUpdate = 0;
    let frames = 0;
    let fpsWindowStart = performance.now();

    setStatus("loading");
    getHandLandmarker(numHands)
      .then((landmarker) => {
        if (cancelled) return;
        setStatus("running");
        const loop = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const now = performance.now();
          if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const result = landmarker.detectForVideo(video, now);
            const tracked: TrackedHand[] = result.landmarks.map((raw, i) => {
              const label = result.handedness[i]?.[0]?.categoryName ?? `hand${i}`;
              // MediaPipe raportează mâna din perspectiva camerei; în oglindă e invers.
              const handedness = mirror ? (label === "Left" ? "Right" : label === "Right" ? "Left" : label) : label;
              const landmarks = raw.map((p) => ({ x: mirror ? 1 - p.x : p.x, y: p.y, z: p.z }));
              let state = perHand.get(handedness);
              if (!state) {
                state = { debouncer: new GestureDebouncer(3), smoother: new Smoother(0.4), swipe: new SwipeDetector() };
                perHand.set(handedness, state);
              }
              return {
                handedness,
                landmarks,
                gesture: state.debouncer.push(classifyGesture(landmarks)),
                pointer: state.smoother.push(landmarks[LM.INDEX_TIP]),
                swipe: state.swipe.push(landmarks[LM.WRIST], now),
              };
            });
            // resetează netezirea pentru mâinile care au ieșit din cadru
            for (const [key, s] of perHand) {
              if (!tracked.some((h) => h.handedness === key)) {
                s.smoother.reset();
                s.swipe.reset();
              }
            }
            handsRef.current = tracked;
            onFrameRef.current?.(tracked, now);

            frames += 1;
            if (now - fpsWindowStart >= 1000) {
              setFps(Math.round((frames * 1000) / (now - fpsWindowStart)));
              frames = 0;
              fpsWindowStart = now;
            }
            if (now - lastStateUpdate >= stateIntervalMs) {
              lastStateUpdate = now;
              setHands(tracked);
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[hands]", err);
        setError(`Nu am putut încărca modelul de mâini: ${(err as Error).message}`);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, numHands, mirror, stateIntervalMs, videoRef]);

  return { hands, handsRef, status, error, fps };
}
