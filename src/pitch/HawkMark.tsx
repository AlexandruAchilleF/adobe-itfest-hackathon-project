// Uliul de pază, desenat ca un graf: noduri mici legate prin linii foarte fine, cocoțat pe o creangă,
// cu capul de profil: sprânceana osoasă în V, ciocul-cârlig întredeschis, ochiul auriu ca nod central. Pentru coperta deck-ului: sobru, editorial și
// legat de ce face produsul (oameni conectați, cineva care veghează). Varianta cu personaj, pentru
// aplicație, e în src/modules/mascot/MascotFigure.tsx.

import { KINDS, NODES, STRONG, WEAK } from "./hawkGraph";

const INK = "#1b2350";
const CORAL = "#e0614a";
const GOLD = "#e2a33b";

const kind = (i: number) => KINDS[NODES[i][2]];
const isTail = (a: number, b: number) => kind(a) === "tail" && kind(b) === "tail";
const RADIUS: Record<string, number> = { key: 0.85, edge: 0.7, tail: 0.7, wing: 0.65, chest: 0.65, n: 0.45 };

// creanga: două lanțuri paralele, cu legături în diagonală
const TOP = Array.from({ length: 13 }, (_, i) => [26 + (i / 12) * 158, 190 - (i / 12) * 18] as const);
const BOTTOM = Array.from({ length: 13 }, (_, i) => [28 + (i / 12) * 156, 197 - (i / 12) * 17.6] as const);

export function HawkMark({ width = 420, line = 0.18, className }: { width?: number; line?: number; className?: string }) {
  const seg = (a: readonly number[], b: readonly number[], color: string, w: number, opacity: number, key: string) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} opacity={opacity} />
  );
  return (
    <svg viewBox="0 0 200 240" width={width} height={width * 1.2} className={className} aria-hidden>
      <g strokeLinecap="round">
        {TOP.slice(1).map((p, i) => [
          seg(TOP[i], p, INK, line * 1.5, 0.75, `t${i}`),
          seg(BOTTOM[i], BOTTOM[i + 1], INK, line * 1.5, 0.75, `b${i}`),
          seg(TOP[i], BOTTOM[i + 1], INK, line, 0.35, `x${i}`),
        ])}
        {WEAK.map(([a, b], i) => seg(NODES[a], NODES[b], isTail(a, b) ? CORAL : INK, line, 0.38, `w${i}`))}
        {STRONG.map(([a, b], i) => seg(NODES[a], NODES[b], isTail(a, b) ? CORAL : INK, line * (kind(a) === "key" && kind(b) === "key" ? 2.2 : 1.6), 0.95, `s${i}`))}
      </g>
      {[...TOP, ...BOTTOM].map(([x, y], i) => (
        <circle key={`c${i}`} cx={x} cy={y} r={0.55} fill={INK} opacity={0.75} />
      ))}
      {NODES.map(([x, y], i) => {
        const k = kind(i);
        if (k === "eye")
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2.2} fill={GOLD} />
              <circle cx={x + 0.7} cy={y - 0.1} r={1.15} fill={INK} />
            </g>
          );
        // pe față, nodurile sunt mai mici, ca ciocul și sprânceana să rămână curate
        const r = k === "key" && y < 60 && x > 92 ? 0.55 : (RADIUS[k] ?? 0.5);
        return <circle key={i} cx={x} cy={y} r={r} fill={k === "tail" ? CORAL : INK} />;
      })}
    </svg>
  );
}
