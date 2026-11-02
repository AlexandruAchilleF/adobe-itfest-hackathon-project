// Mod kiosk pentru jurizarea la masă: ecran de start, iar după X secunde fără
// interacțiune aplicația revine la început. Fiecare „sesiune" nouă e numărată.
//
//   <Kiosk idleMs={45000} onReset={() => setState(initial)} title="Desenează în aer">…</Kiosk>

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { track } from "./stats";

interface Props {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** după cât timp fără activitate revine la ecranul de start */
  idleMs?: number;
  onReset?: () => void;
  /** dezactivează temporar (ex: în timpul dezvoltării) */
  enabled?: boolean;
}

export function Kiosk({ children, title, subtitle = "Atinge oriunde ca să începi", idleMs = 45_000, onReset, enabled = true }: Props) {
  const [attract, setAttract] = useState(enabled);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef(onReset);
  resetRef.current = onReset;

  const arm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      resetRef.current?.();
      setAttract(true);
    }, idleMs);
  }, [idleMs]);

  useEffect(() => {
    if (!enabled || attract) return;
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      events.forEach((e) => window.removeEventListener(e, arm));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, attract, arm]);

  return (
    <div className="relative">
      {children}
      {enabled && attract && (
        <button
          onClick={() => {
            setAttract(false);
            void track("session");
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/95 text-center"
        >
          <span className="text-5xl font-black tracking-tight sm:text-7xl">{title}</span>
          <span className="animate-pulse text-xl text-accent">{subtitle}</span>
        </button>
      )}
    </div>
  );
}
