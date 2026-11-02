// Cursor desenat peste pagină + click prin menținere (dwell) + API de apăsare.
//
//   const pointer = usePointerCursor({ dwellMs: 1000 });
//   // în onFrame de la cap/mână:
//   pointer.moveTo(x, y);            // pixeli în viewport
//   pointer.press(); pointer.release();   // ex: ciupit = drag
//   return <>{pointer.cursor}</>;

import { useCallback, useMemo, useRef, useState } from "react";
import { DwellDetector } from "./dwell";
import { VirtualPointer } from "./virtualPointer";

export function usePointerCursor({ dwellMs = 1000, dwell = true, color = "#f5a524" } = {}) {
  const vp = useMemo(() => new VirtualPointer(), []);
  const detector = useMemo(() => new DwellDetector(28, dwellMs), [dwellMs]);
  const el = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [visible, setVisible] = useState(false);
  const dwellRef = useRef(dwell);
  dwellRef.current = dwell;

  const moveTo = useCallback(
    (x: number, y: number) => {
      if (!visible) setVisible(true);
      vp.move(x, y);
      if (el.current) el.current.style.transform = `translate(${x}px, ${y}px)`;
      if (dwellRef.current && !vp.isDown) {
        const { progress, fire } = detector.push(x, y, performance.now());
        if (ring.current) ring.current.style.strokeDashoffset = String(100 - progress * 100);
        if (fire) vp.click();
      }
    },
    [vp, detector, visible],
  );

  const cursor = visible ? (
    <div ref={el} className="pointer-events-none fixed left-0 top-0 z-[60]" style={{ willChange: "transform" }} aria-hidden>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-translate-x-1/2 -translate-y-1/2">
        <circle cx="22" cy="22" r="8" fill={color} fillOpacity="0.8" stroke="white" strokeWidth="2" />
        <circle
          ref={ring}
          cx="22"
          cy="22"
          r="16"
          fill="none"
          stroke={color}
          strokeWidth="4"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset="100"
          transform="rotate(-90 22 22)"
        />
      </svg>
    </div>
  ) : null;

  return {
    cursor,
    moveTo,
    press: () => vp.down(),
    release: () => vp.up(),
    click: () => vp.click(),
    pointer: vp,
    hide: () => {
      vp.up();
      detector.reset();
      setVisible(false);
    },
  };
}
