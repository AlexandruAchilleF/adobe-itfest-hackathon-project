// Bucăți de UI comune paginilor scenariului: statusul cererii, cronologia, rama de rang.
import { describeEntry, type Request, stateOf, type Tone, transitionOf } from "../../lib/flow";
import { scenario } from "../config";
import type { Rank } from "../types";

// o stare = un punct de culoare + textul ei (culoarea nu e niciodată singurul semnal)
export const TONE_DOT: Record<Tone, string> = {
  open: "#d9a03a",
  progress: "#6f73c9",
  waiting: "#8f93b8",
  returned: "#d0705d",
  done: "#3f9d64",
  failed: "#b4372a",
};

/** Starea cererii: punct + text. */
export function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const st = stateOf(scenario.flow, status);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-[0.85rem] whitespace-nowrap text-ink-2 ${className}`}>
      <StatusDot status={status} />
      {st.label}
    </span>
  );
}

/** Doar punctul de stare (verde = încheiat, roșu = n-a mers, galben = așteaptă pe cineva). */
export function StatusDot({ status }: { status: string }) {
  const st = stateOf(scenario.flow, status);
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TONE_DOT[st.tone] }} aria-hidden />;
}

/** Cantitatea cu unitatea ei; banii cu două zecimale („86,50 lei”). */
export function formatQty(quantity: number, unit: string): string {
  const money = /^(lei|ron|eur|€)$/i.test(unit.trim());
  const n = money ? quantity.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : quantity.toLocaleString("ro-RO");
  return `${n} ${unit}`.trim();
}

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

export function Timeline({ r, nameOf }: { r: Request; nameOf: (h: string) => string }) {
  return (
    <ol className="space-y-1.5 border-l border-line pl-3 text-[0.8rem] text-ink-2" data-testid="timeline">
      {r.history.map((h, i) => (
        <li key={i} className={{ failed: "text-rose-300", done: "text-emerald-300", none: "" }[transitionOf(scenario.flow, h.event)?.outcome ?? "none"]}>
          <span className="tabular-nums text-muted">{timeOf(h.at)}</span> {describeEntry(scenario.flow, h, nameOf)}
          {h.note ? ` — ${h.note}` : ""}
        </li>
      ))}
    </ol>
  );
}

/** Inițialele într-un cerc cu rama rangului (rama crește odată cu scorul). */
export function Avatar({ name, rank, size = 40 }: { name: string; rank?: Rank; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#e4e5ee] font-semibold text-ink"
      style={{ width: size, height: size, boxShadow: rank ? `0 0 0 3px ${rank.frame}` : undefined, fontSize: size / 2.8 }}
      title={rank?.name}
      aria-hidden
    >
      {initials}
    </span>
  );
}
