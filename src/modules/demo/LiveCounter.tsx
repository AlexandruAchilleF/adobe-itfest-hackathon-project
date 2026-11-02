import { useEffect, useState } from "react";
import { countEvents } from "./stats";

/** Badge „🔥 N oameni au încercat azi" — se actualizează la câteva secunde. */
export function LiveCounter({ event = "session", label = "oameni au încercat azi", intervalMs = 5000 }: { event?: string; label?: string; intervalMs?: number }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => countEvents(event).then((c) => alive && setN(c));
    void load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [event, intervalMs]);
  if (n === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">
      🔥 {n} {label}
    </span>
  );
}
