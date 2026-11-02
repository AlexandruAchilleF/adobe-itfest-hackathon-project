// Fața ca dispozitiv de input: expresii (0..1), direcția capului și evenimente.
//
//   const { expressions } = useFace(cam.videoRef, {
//     enabled: cam.status === "ready",
//     onEvent: (e) => { if (e === "blink") click(); },
//   });

import { type RefObject, useEffect, useRef, useState } from "react";
import { expressionsFrom, type FaceEvent, FaceEventDetector, type FaceExpressions } from "./face";
import type { Point3 } from "./gestures";
import { getFaceLandmarker } from "./vision";

interface Options {
  enabled?: boolean;
  mirror?: boolean;
  onFrame?: (face: { expressions: FaceExpressions; landmarks: Point3[] } | null) => void;
  onEvent?: (event: FaceEvent) => void;
}

export function useFace(videoRef: RefObject<HTMLVideoElement | null>, options: Options = {}) {
  const { enabled = true, mirror = true } = options;
  const cb = useRef(options);
  cb.current = options;
  const [expressions, setExpressions] = useState<FaceExpressions | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const landmarksRef = useRef<Point3[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let cancelled = false;
    let lastTime = -1;
    let lastState = 0;
    const detector = new FaceEventDetector();
    setStatus("loading");
    getFaceLandmarker()
      .then((landmarker) => {
        if (cancelled) return;
        setStatus("running");
        const loop = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const now = performance.now();
          if (video && video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const res = landmarker.detectForVideo(video, now);
            const raw = res.faceLandmarks[0];
            if (raw) {
              const landmarks = raw.map((p) => ({ x: mirror ? 1 - p.x : p.x, y: p.y, z: p.z }));
              // headPose lucrează pe coordonatele brute; oglindirea se aplică după
              const expr = expressionsFrom(res.faceBlendshapes[0]?.categories ?? [], raw, mirror);
              landmarksRef.current = landmarks;
              cb.current.onFrame?.({ expressions: expr, landmarks });
              detector.push(expr).forEach((e) => cb.current.onEvent?.(e));
              if (now - lastState > 100) {
                lastState = now;
                setExpressions(expr);
              }
            } else {
              landmarksRef.current = [];
              cb.current.onFrame?.(null);
              if (now - lastState > 100) {
                lastState = now;
                setExpressions(null);
              }
            }
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(`Nu am putut încărca modelul de față: ${err.message}`);
        setStatus("error");
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, mirror, videoRef]);

  return { expressions, landmarksRef, status, error };
}
