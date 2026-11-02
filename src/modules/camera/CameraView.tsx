// Video selfie (oglindit) + overlay cu scheletul mâinilor. Pune children peste el
// (ex: un cursor) folosind coordonate procentuale: left = x*100%, top = y*100%.

import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { HAND_CONNECTIONS } from "./gestures";
import type { TrackedHand } from "./useHands";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  hands?: TrackedHand[];
  /** referință live (actualizată la fiecare cadru) — desen mai fluid decât `hands` */
  handsRef?: RefObject<TrackedHand[]>;
  mirror?: boolean;
  showSkeleton?: boolean;
  className?: string;
  children?: ReactNode;
}

export function CameraView({ videoRef, hands, handsRef, mirror = true, showSkeleton = true, className = "", children }: Props) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  // Containerul ia exact proporția video-ului, ca punctele normalizate (0..1)
  // să cadă fix peste imagine.
  const [aspect, setAspect] = useState(4 / 3);

  useEffect(() => {
    if (!showSkeleton) return;
    let raf = 0;
    const draw = () => {
      const canvas = overlayRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
        const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
        const ctx = canvas.getContext("2d");
        const list = handsRef?.current ?? hands ?? [];
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          for (const hand of list) {
            ctx.strokeStyle = hand.handedness === "Left" ? "#38bdf8" : "#f59e0b";
            ctx.lineWidth = 3 * devicePixelRatio;
            for (const [a, b] of HAND_CONNECTIONS) {
              ctx.beginPath();
              ctx.moveTo(hand.landmarks[a].x * w, hand.landmarks[a].y * h);
              ctx.lineTo(hand.landmarks[b].x * w, hand.landmarks[b].y * h);
              ctx.stroke();
            }
            ctx.fillStyle = "#f8fafc";
            for (const p of hand.landmarks) {
              ctx.beginPath();
              ctx.arc(p.x * w, p.y * h, 3 * devicePixelRatio, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hands, handsRef, showSkeleton, videoRef]);

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-black ${className}`} style={{ aspectRatio: aspect }}>
      <video
        ref={videoRef}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
        }}
        className="block h-full w-full object-cover"
        style={{ transform: mirror ? "scaleX(-1)" : undefined }}
        playsInline
        muted
      />
      {showSkeleton && <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />}
      <div className="pointer-events-none absolute inset-0">{children}</div>
    </div>
  );
}
