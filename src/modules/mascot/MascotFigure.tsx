// Uli, uliul: mascota care arată, prin postură și privire, ce face AI-ul (ascultă, se gândește,
// a verificat, a găsit o problemă). Zboară spre privitor, întors puțin spre dreapta: aripile larg
// deschise, cu cele cinci pene primare desfăcute („degetele” după care recunoști un uliu), coada
// roșcată în evantai sub corp. Desen original, în SVG, doar cu forme pline (fără filtre și blur):
// bleumarinul, cremul și auriul din docs/DESIGN.md; coada ia culoarea din scenariu.
// Numele, culoarea și dacă apare deloc vin din scenariu (src/scenario/config.ts, `mascot`);
// VITE_MASCOT_NAME și VITE_MASCOT_COLOR din .env le suprascriu.

import { scenario } from "../../scenario/config";
import type { MascotMood } from "./mascot";

export const MASCOT_NAME = (import.meta.env.VITE_MASCOT_NAME as string | undefined) || scenario.mascot.name;
const COLOR = (import.meta.env.VITE_MASCOT_COLOR as string | undefined) || scenario.mascot.color;

const C = {
  ink: "#1b2350",
  dark: "#10153a",
  mid: "#2f3a78",
  rim: "#4f5ca6",
  cream: "#fbf4ea",
  creamShade: "#e9dccb",
  gold: "#e2a33b",
  goldDeep: "#b97f1f",
  beak: "#3a4272",
  beakDeep: "#151a42",
  beakLight: "#5d66a0",
  pupil: "#0b0f2b",
};

/** Culoarea coroanei mai închisă (banda din coadă), fără filtre: amestec cu negru. */
function darker(hex: string, k = 0.32) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return C.dark;
  const n = parseInt(m[1], 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) * (1 - k));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

const f = (n: number) => n.toFixed(2);

/** O pană primară: frunză îngustă de la bază la vârf, cu vârful puțin curbat. */
function feather(bx: number, by: number, tx: number, ty: number, w: number, curl = 1.4) {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const p = (t: number, s: number) => [bx + dx * t + nx * s + nx * curl * t * t, by + dy * t + ny * s + ny * curl * t * t];
  const [a, b, c1, c2, tip, c3, c4] = [p(0, w / 2), p(0, -w / 2), p(0.55, w * 0.5), p(0.9, w * 0.32), p(1, 0), p(0.9, -w * 0.28), p(0.55, -w * 0.5)];
  return `M${f(a[0])} ${f(a[1])} C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(tip[0])} ${f(tip[1])} C${f(c3[0])} ${f(c3[1])} ${f(c4[0])} ${f(c4[1])} ${f(b[0])} ${f(b[1])} Z`;
}

// aripa stângă, venind spre privitor: brațul urcă spre încheietură, mâna coboară spre vârf; umărul în (51,50)
const FINGERS = (
  [
    [22, 35.2, 2.4, 40.6, 5.2],
    [21, 39.4, 0.8, 46.4, 5.4],
    [20.4, 43.6, 2.0, 52.4, 5.4],
    [20.4, 47.6, 5.6, 57.2, 5.2],
    [21.2, 51.4, 10.8, 60.4, 5.0],
  ] as const
).map(([bx, by, tx, ty, w]) => feather(bx, by, tx, ty, w));
const WING_FLIGHT = "M52 46 C45 40 37 34.6 29 31.6 C26 30.6 23.4 31.2 21.6 32.8 L18.4 36.4 L18 53.6 C22 56.6 27.6 58.2 33 58.8 C36.6 60.8 40.6 60.4 43.4 62 C46.6 63.6 50 63.4 53 64.4 Z";
const WING_COVERTS = "M52.6 46.4 C45.6 40.6 37.8 35.4 29.8 32.4 C26.6 31.6 24 32.2 22.2 33.8 L19.6 37 L19.6 44.4 C22.6 45.6 25.2 44.6 27.6 46.6 C30.4 48.6 33.2 47.6 35.8 49.8 C38.4 51.8 41.4 51 43.8 53 C46.6 55 49.6 54.6 52.8 56 Z";
const WING_RIM = "M52 46 C45 40 37 34.6 29 31.6 C26 30.6 23.4 31.2 21.6 32.8 L18.4 36.4 L20.6 36.4 L22.8 34.4 C24.6 33.4 26.6 33.2 28.6 34 C36.2 37 43.8 42 52.6 48.6 Z";

function Wing({ shade }: { shade?: boolean }) {
  const flight = shade ? C.dark : C.ink;
  return (
    <>
      {FINGERS.map((d, i) => (
        <path key={i} d={d} fill={flight} />
      ))}
      <path d={WING_FLIGHT} fill={flight} />
      <path d={WING_COVERTS} fill={shade ? C.ink : C.mid} />
      <path d={WING_RIM} fill={shade ? C.mid : C.rim} />
    </>
  );
}

// coada în evantai, văzută din față: se vede doar marginea în feste, de sub corp
const TAIL =
  "M45.07 59 L45.07 66.47 Q44.19 69.02 47.46 70.14 Q47.59 72.85 51.33 73.06 Q52.51 75.79 56.28 74.95 Q58.56 77.42 61.8 75.6 Q65.04 77.42 67.32 74.95 Q71.09 75.79 72.27 73.06 Q76.01 72.85 76.14 70.14 Q79.41 69.02 78.53 66.47 L78.53 59 Z";
const STREAKS = [
  [57.4, 57],
  [60.6, 58],
  [63.8, 57.6],
  [66.4, 56.2],
  [59, 61.4],
  [62.6, 61.6],
  [61, 64.8],
];

/** Cât de sus sunt aripile: bucuria le ridică, îngrijorarea le lasă în jos. */
const WING_ANGLE: Record<MascotMood, number> = { idle: 0, listening: 0, thinking: -2, happy: -8, worried: 12, celebrate: -20 };
/** Ochii spre lateral; stângul e mai mare, fiindcă e mai aproape. */
const EYES = [
  [54.8, 38.2, 2.9],
  [68.8, 38.4, 2.5],
] as const;

export function MascotFigure({ mood = "idle", size = 96, color = COLOR }: { mood?: MascotMood; size?: number; color?: string }) {
  const anim = mood === "worried" ? "mascot-shake" : mood === "celebrate" || mood === "happy" ? "mascot-jump" : "mascot-bob";
  const a = WING_ANGLE[mood];
  const look = mood === "thinking" ? [0.4, -0.9] : [0.35, 0.1];
  const glad = mood === "happy" || mood === "celebrate";
  const headTilt = mood === "listening" ? "rotate(-10 62 44)" : mood === "thinking" ? "rotate(6 62 44)" : undefined;
  const bank = mood === "worried" ? "rotate(3 60 60)" : "rotate(-5 60 60)";

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={anim} role="img" aria-label={`${MASCOT_NAME}, mascota`}>
      <g transform={`translate(-1 10) ${bank}`}>
        {/* coada, în spate */}
        <path d={TAIL} fill={darker(color)} />
        <path d={TAIL} fill={color} transform="translate(61.8 63) scale(0.9 0.84) translate(-61.8 -63)" />

        {/* aripa din dreapta: mai departe, oglindită și scurtată în perspectivă, în umbră */}
        <g transform="translate(73 1) scale(-0.74 0.96) translate(-51 0)">
          <g transform={`rotate(${a} 51 50)`}>
            <Wing shade />
          </g>
        </g>
        {/* aripa din stânga, cea apropiată */}
        <g transform={`rotate(${a} 51 50)`}>
          <Wing />
        </g>

        {/* corpul, scurtat în perspectivă: pieptul crem cu striații, ghearele strânse */}
        <path d="M50.6 46 C48.6 56 53.6 66.6 61.6 71.4 C69.6 66.6 74.6 56 72.6 46 Z" fill={C.ink} />
        <path d="M55 49 C54 56.4 57 63.6 61.6 67.6 C66.2 63.6 69.2 56.4 68.2 49 Z" fill={C.cream} />
        <path d="M55 49 C54 56.4 57 63.6 61.6 67.6 C59.2 62.6 58 56 58.6 49.6 Z" fill={C.creamShade} />
        {STREAKS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} c0.8 -0.6 1.8 -0.6 2.3 0.4 c-0.5 1.2 -1.6 1.8 -2.5 1.4 Z`} fill={C.ink} />
        ))}
        <path d="M57.4 68 C56.8 71.6 58 73.6 60 73.4 L60.6 69.4 Z M65.8 68 C66.4 71.6 65.2 73.6 63.2 73.4 L62.6 69.4 Z" fill={C.gold} />
        <path d="M57 72.4 l0.6 2 l1 -1.6 Z M59.4 73 l0.4 2 l1 -1.8 Z M63.8 73 l-0.4 2 l-1 -1.8 Z M66.2 72.4 l-0.6 2 l-1 -1.6 Z" fill={C.dark} />

        {/* capul: creștet turtit, gușa crem, ciocul încovoiat */}
        <g transform={headTilt}>
          <path d="M50 38.4 C49.8 31.6 54.6 28 62 28 C69.4 28 74.2 31.6 74 38.4 C73.6 43.4 71.2 46.8 67.6 48.8 L62 52.4 L56.4 48.8 C52.8 46.8 50.4 43.4 50 38.4 Z" fill={C.ink} />
          <path d="M51.6 34.4 C52.8 30.8 56.6 28.6 62 28.6 C58 30 55.2 32 53.8 35 Z" fill={C.rim} />
          <path d="M52.4 42.4 C55.4 41.6 58 42 60 43.6 L62 44 L64 43.6 C66 42 68.6 41.6 71.6 42.4 C71 45.6 68.8 48 66.4 49.4 L62 52.4 L57.6 49.4 C55.2 48 53 45.6 52.4 42.4 Z" fill={C.cream} />
          <path d="M52.4 42.4 C53 45.6 55.2 48 57.6 49.4 L62 52.4 L60.6 48.6 C57.6 47.4 54.8 45.4 52.4 42.4 Z" fill={C.creamShade} />

          {EYES.map(([x, y, r], i) =>
            glad ? (
              <g key={i}>
                <circle cx={x} cy={y} r={r} fill={C.gold} />
                <path d={`M${x - r * 0.72} ${y + 0.7} Q${x} ${y - r * 0.85} ${x + r * 0.72} ${y + 0.7}`} stroke={C.pupil} strokeWidth={1.35 - i * 0.2} fill="none" strokeLinecap="round" />
              </g>
            ) : (
              <g key={i} className="mascot-blink" style={{ transformOrigin: `${x}px ${y}px` }}>
                <circle cx={x} cy={y} r={r} fill={C.gold} />
                <circle cx={x + look[0]} cy={y + look[1]} r={r * (mood === "worried" ? 0.46 : 0.62)} fill={C.pupil} />
                <circle cx={x + look[0] + r * 0.28} cy={y + look[1] - r * 0.3} r={r * 0.22} fill="#fff" />
              </g>
            ),
          )}

          {/* sprâncenele osoase: coboară spre cioc (privirea de uliu); la îngrijorare se ridică */}
          {mood === "worried" ? (
            <path d="M50.6 34.8 L56.4 33 L59.6 35.6 L58.8 36.8 L56 35 L51 36.6 Z M73 35 L67.6 33.2 L64.8 35.6 L65.6 36.8 L68 35.2 L72.6 36.8 Z" fill={C.dark} />
          ) : (
            <path d="M50.2 34.4 C53.6 33.6 57 34.2 60 36.4 L59.4 37.6 C56.6 36.4 53.6 36 50.8 36.6 Z M73.4 34.6 C70.4 33.8 67.4 34.4 64.4 36.4 L65 37.6 C67.6 36.4 70.4 36.2 72.8 36.8 Z" fill={C.dark} />
          )}

          <path d="M59.8 37.6 C60.6 36.6 63.4 36.6 64.2 37.6 L64.4 40.8 L59.6 40.8 Z" fill={C.gold} />
          <path d="M59.4 40.2 L64.6 40.2 C65.4 43.4 64.4 46.8 62 49.6 C59.6 46.8 58.6 43.4 59.4 40.2 Z" fill={C.beak} />
          <path d="M62 49.6 C63.4 47.8 64.2 45.8 64.4 43.6 C64.9 46.2 64 48.8 62 50.6 Z" fill={C.beakDeep} />
          <path d="M60.2 41 C60 43.6 60.6 46 61.6 47.8 C60.2 46.6 59.4 44 59.8 41 Z" fill={C.beakLight} />
          <path d="M60.9 39.2 a0.5 0.4 0 1 0 0.1 0 M63 39.2 a0.5 0.4 0 1 0 0.1 0" fill={C.goldDeep} />
          {mood === "worried" && <path d="M58 28.6 L57 24.4 L60 27.2 L61.2 23.4 L62.6 28 Z" fill={C.ink} />}
        </g>

        {/* undele sunetului când ascultă */}
        {mood === "listening" && (
          <g stroke={C.mid} strokeWidth="1.6" fill="none" strokeLinecap="round" className="mascot-waves">
            <path d="M76 26 Q80 31 77 36" />
            <path d="M80 21 Q86.6 30 82 39" />
          </g>
        )}
        {/* bulele de gândire */}
        {mood === "thinking" && (
          <g fill={C.mid} className="mascot-dots">
            <circle cx="75" cy="25" r="1.7" />
            <circle cx="79.6" cy="19" r="2.3" />
            <circle cx="85" cy="12.4" r="2.9" />
          </g>
        )}
        {/* confetti, în culorile site-ului */}
        {mood === "celebrate" && (
          <g>
            <rect x="16" y="78" width="4" height="4" fill={C.gold} transform="rotate(20 18 80)" />
            <rect x="96" y="80" width="4" height="4" fill={color} transform="rotate(-15 98 82)" />
            <rect x="38" y="14" width="3.4" height="3.4" fill={color} />
            <rect x="84" y="12" width="3.4" height="3.4" fill={C.gold} transform="rotate(30 86 14)" />
          </g>
        )}
      </g>
    </svg>
  );
}
