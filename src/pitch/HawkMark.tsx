// Uliul de pază, desenat ca un graf: noduri mici legate prin linii foarte fine. Stă pe o linie de rețea
// (în loc de creangă) care vine din afara slide-ului, cu câțiva „oameni” legați de ea: uliul veghează
// rețeaua. Capul de profil: sprânceana osoasă în V, ciocul-cârlig, ochiul auriu ca nod central;
// articulațiile au noduri mai mari, ca stelele dintr-o constelație. Pentru coperta deck-ului.
// Datele uliului: hawkGraph.ts (node scripts/hawk-graph/generate.cjs). Mascota cu personaj, pentru
// aplicație, e în src/modules/mascot/MascotFigure.tsx.

import { KINDS, NODES, STRONG, WEAK } from "./hawkGraph";

const INK = "#1b2350";
const CORAL = "#e0614a";
const GOLD = "#e2a33b";

const kind = (i: number) => KINDS[NODES[i][2]];
const isTail = (a: number, b: number) => kind(a) === "tail" && kind(b) === "tail";
const RADIUS: Record<string, number> = { joint: 1.25, key: 0.6, edge: 0.7, tail: 0.6, wing: 0.6, chest: 0.65, n: 0.45 };

/** linia de rețea: aceeași formulă ca în scripts/hawk-graph/build.browser.js (coada se ascunde sub ea) */
const perchY = (x: number) => 190 - ((x - 26) * 18) / 158;
const PERCH = [-70, -40, -12, 14, 40, 66, 92, 118, 144, 170, 196].map((x, i) => [x, perchY(x) + (i % 2 ? 0.8 : -0.4)] as const);
/** oamenii din rețea: [x, deplasarea față de linie, confirmat] */
const PEOPLE = [
  [-26, 15, false],
  [4, -13, true],
  [30, 12, false],
  [56, -11, false],
  [152, 13, false],
  [182, -12, true],
] as const;
const nearest = (x: number) =>
  PERCH.map((p, i) => [Math.abs(p[0] - x), i] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, 2)
    .map(([, i]) => PERCH[i]);

export function HawkMark({ width = 420, line = 0.18, className }: { width?: number; line?: number; className?: string }) {
  const seg = (a: readonly number[], b: readonly number[], color: string, w: number, opacity: number, key: string) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} opacity={opacity} />
  );
  const people = PEOPLE.map(([x, dy, ok]) => [x, perchY(x) + dy, ok] as const);
  const at = (i: number) => [people[i][0], people[i][1]] as const;
  return (
    <svg viewBox="0 0 200 240" width={width} height={width * 1.2} className={className} overflow="visible" aria-hidden>
      {/* rețeaua: linia pe care stă uliul și oamenii legați de ea */}
      <g strokeLinecap="round">
        {PERCH.slice(1).map((p, i) => seg(PERCH[i], p, INK, line * 1.6, 0.8, `p${i}`))}
        {people.flatMap(([x, y], i) => nearest(x).map((p, j) => seg([x, y], p, INK, line, 0.45, `q${i}-${j}`)))}
        {seg(at(0), at(1), INK, line, 0.3, "pp1")}
        {seg(at(4), at(5), INK, line, 0.3, "pp2")}
      </g>
      {PERCH.map(([x, y], i) => (
        <circle key={`n${i}`} cx={x} cy={y} r={0.8} fill={INK} opacity={0.8} />
      ))}
      {people.map(([x, y, ok], i) =>
        ok ? <circle key={`o${i}`} cx={x} cy={y} r={1.5} fill={CORAL} /> : <circle key={`o${i}`} cx={x} cy={y} r={1.4} fill="none" stroke={INK} strokeWidth={line * 1.6} />,
      )}

      {/* uliul */}
      <g strokeLinecap="round">
        {WEAK.map(([a, b], i) => seg(NODES[a], NODES[b], INK, line, 0.36, `w${i}`))}
        {STRONG.map(([a, b], i) => seg(NODES[a], NODES[b], isTail(a, b) ? CORAL : INK, line * (kind(a) === "key" && kind(b) === "key" ? 2 : 1.6), 0.95, `s${i}`))}
      </g>
      {NODES.map(([x, y], i) => {
        const k = kind(i);
        if (k === "eye")
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2.2} fill={GOLD} />
              <circle cx={x + 0.7} cy={y - 0.1} r={1.15} fill={INK} />
            </g>
          );
        return <circle key={i} cx={x} cy={y} r={RADIUS[k] ?? 0.5} fill={k === "tail" || (k === "joint" && y > 220) ? CORAL : INK} />;
      })}
    </svg>
  );
}
