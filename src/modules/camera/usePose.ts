// Corpul întreg ca input: 33 de puncte + posturi simple (mâini sus, T-pose).
import { type RefObject, useEffect, useRef, useState } from "react";
import type { Point3 } from "./gestures";
import { classifyPose, type PoseName } from "./pose";
import { getPoseLandmarker } from "./vision";

export function usePose(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: { enabled?: boolean; mirror?: boolean; onFrame?: (landmarks: Point3[], pose: PoseName) => void } = {},
) {
  const { enabled = true, mirror = true } = options;
  const cb = useRef(options.onFrame);
  cb.current = options.onFrame;
  const landmarksRef = useRef<Point3[]>([]);
  const [pose, setPose] = useState<PoseName>("none");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let cancelled = false;
    let lastTime = -1;
    setStatus("loading");
    getPoseLandmarker()
      .then((landmarker) => {
        if (cancelled) return;
        setStatus("running");
        const loop = () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const res = landmarker.detectForVideo(video, performance.now());
            const raw = res.landmarks[0] ?? [];
            const lm = raw.map((p) => ({ x: mirror ? 1 - p.x : p.x, y: p.y, z: p.z }));
            landmarksRef.current = lm;
            const name = classifyPose(lm);
            setPose((prev) => (prev === name ? prev : name));
            cb.current?.(lm, name);
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(`Nu am putut încărca modelul de corp: ${err.message}`);
        setStatus("error");
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, mirror, videoRef]);

  return { pose, landmarksRef, status, error };
}
