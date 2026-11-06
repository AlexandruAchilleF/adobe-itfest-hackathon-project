// Bucăți de UI comune paginilor scenariului: statusul cererii, cronologia, rama de rang.
import { describeEntry, type Request, stateOf, type Tone, transitionOf } from "../../lib/flow";
import { scenario } from "../config";
import type { Rank } from "../types";

// etichetele de stare: fundal pal, text închis, aceeași familie de culori ca punctul
const TONE_STYLE: Record<Tone, string> = {
  open: "bg-[#fbf0d9] text-[#8a5a0a]",
  progress: "bg-lilac text-lilac-ink",
  waiting: "bg-[#efeafd] text-[#5a3fb5]",
  returned: "bg-[#fde8d8] text-[#9a4a12]",
  done: "bg-sage text-sage-ink",
  failed: "bg-coral-tint text-coral-deep",
};
const TONE_DOT: Record<Tone, string> = {
  open: "#e0a83a",
  progress: "#7b6fe0",
  waiting: "#9b7be6",
  returned: "#e08a4a",
  done: "#58a65c",
  failed: "#d35f52",
};

export function StatusPill({ status }: { status: string }) {
  const st = stateOf(scenario.flow, status);
  return <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${TONE_STYLE[st.tone]}`}>{st.label}</span>;
}

/** Punctul de stare din fața unui rând (verde = încheiat, coral = n-a mers, muștar = așteaptă pe cineva). */
export function StatusDot({ status }: { status: string }) {
  const st = stateOf(scenario.flow, status);
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TONE_DOT[st.tone], boxShadow: `0 0 0 3px ${TONE_DOT[st.tone]}22` }} aria-hidden />;
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
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-paper-2 font-semibold text-ink"
      style={{ width: size, height: size, boxShadow: rank ? `0 0 0 3px ${rank.frame}` : undefined, fontSize: size / 2.8 }}
      title={rank?.name}
      aria-hidden
    >
      {initials}
    </span>
  );
}
