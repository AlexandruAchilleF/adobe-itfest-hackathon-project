// Bucăți de UI comune paginilor scenariului: statusul cererii, cronologia, rama de rang.
import type { Request, State } from "../../lib/lifecycle";
import { describeEntry } from "../../lib/lifecycle";
import type { Rank } from "../types";

const STATUS_STYLE: Record<State, string> = {
  deschis: "bg-amber-500/20 text-amber-200",
  acceptat: "bg-sky-500/20 text-sky-200",
  livrat: "bg-violet-500/20 text-violet-200",
  confirmat: "bg-emerald-500/20 text-emerald-200",
  contestat: "bg-rose-500/25 text-rose-200",
};

export function StatusPill({ status }: { status: State }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{status}</span>;
}

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

export function Timeline({ r, nameOf }: { r: Request; nameOf: (h: string) => string }) {
  return (
    <ol className="space-y-1 border-l border-slate-700 pl-3 text-xs text-slate-400" data-testid="timeline">
      {r.history.map((h, i) => (
        <li key={i} className={h.event === "dispute" ? "text-rose-300" : h.event === "confirm" ? "text-emerald-300" : ""}>
          <span className="font-mono text-slate-500">{timeOf(h.at)}</span> {describeEntry(h, nameOf)}
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
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-800 font-semibold text-slate-100"
      style={{ width: size, height: size, boxShadow: rank ? `0 0 0 3px ${rank.frame}` : undefined, fontSize: size / 2.8 }}
      title={rank?.name}
      aria-hidden
    >
      {initials}
    </span>
  );
}
