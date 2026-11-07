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

// aripile strânse, când stă pe un element (extensia, poza „perched”): cad pe lângă corp, cu vârful
// remigelor spre coadă. Fiecare aripă: pana lungă, acoperitoarele, marginea luminată, festonul
// dintre ele și trei dungi pe remige.
const FOLDED_FAR = {
  flight: "M 72.2 43.4 C 77 45.6 79.4 51.6 79 58.2 C 78.4 66 74.4 74.4 67.8 81.2 C 67.2 74.6 66.2 66.4 66.4 58.2 C 66.6 52 67.6 47.4 69.2 44.8 Z",
  coverts: "M 72 44 C 76 46.2 78 51 77.8 56.4 C 75 58.4 70.6 58.2 66.8 56.6 C 67 51.6 67.8 47.4 69.4 45 Z",
  rim: "M 72.2 43.4 C 76.6 45.6 78.6 50.4 78.8 55.4 C 77.6 51.2 75.2 48 71.2 46.2 Z",
  scallop: "M 77.6 56.2 C 76.2 58.4 74.6 58.6 73.4 57.4 C 72 59 70.2 59 68.8 57.6 C 68 58.4 67.2 58.2 66.6 57.4",
  bars: ["M 76 61 C 74.6 67 72.2 72.6 68.6 78", "M 73.2 60.2 C 72 66 70.2 71.2 67.6 75.6", "M 70.2 59.6 C 69.4 64.6 68.2 69 66.8 72.6"],
};
const FOLDED_NEAR = {
  flight: "M51 43.4 C46.2 45.6 43.8 51.6 44.2 58.2 C44.8 66 48.8 74.4 55.4 81.2 C56 74.6 57 66.4 56.8 58.2 C56.6 52 55.6 47.4 54 44.8 Z",
  coverts: "M51.2 44 C47.2 46.2 45.2 51 45.4 56.4 C48.2 58.4 52.6 58.2 56.4 56.6 C56.2 51.6 55.4 47.4 53.8 45 Z",
  rim: "M51 43.4 C46.6 45.6 44.6 50.4 44.4 55.4 C45.6 51.2 48 48 52 46.2 Z",
  scallop: "M45.6 56.2 C47 58.4 48.6 58.6 49.8 57.4 C51.2 59 53 59 54.4 57.6 C55.2 58.4 56 58.2 56.6 57.4",
  bars: ["M47.2 61 C48.6 67 51 72.6 54.6 78", "M50 60.2 C51.2 66 53 71.2 55.6 75.6", "M53 59.6 C53.8 64.6 55 69 56.4 72.6"],
};

function FoldedWing({ d, shade }: { d: typeof FOLDED_NEAR; shade?: boolean }) {
  // aripa din spate e cu o treaptă mai închisă, ca la zbor
  const [flight, coverts, rim] = shade ? [C.dark, C.ink, C.mid] : [C.ink, C.mid, C.rim];
  return (
    <>
      <path d={d.flight} fill={flight} />
      <path d={d.coverts} fill={coverts} />
      <path d={d.rim} fill={rim} />
      <path d={d.scallop} fill="none" stroke={flight} strokeWidth="1.1" strokeLinecap="round" />
      {d.bars.map((bar) => (
        <path key={bar} d={bar} fill="none" stroke={rim} strokeWidth="0.9" strokeLinecap="round" />
      ))}
    </>
  );
}

/** Aripile strânse pe lângă corp: întâi cea din spate (oglindită, în umbră), apoi cea apropiată. */
function FoldedWings() {
  return (
    <g className="mascot-folded">
      <FoldedWing d={FOLDED_FAR} shade />
      <FoldedWing d={FOLDED_NEAR} />
    </g>
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

/** Confetti în culorile site-ului: [x, y, latura, rotație, auriu]. */
const CONFETTI: Array<[number, number, number, number, boolean]> = [
  [16, 78, 4, 20, true],
  [96, 80, 4, -15, false],
  [38, 14, 3.4, 0, false],
  [84, 12, 3.4, 30, true],
  [22, 40, 3, 45, false],
  [98, 44, 3, -30, true],
];

/** Cât de sus sunt aripile: bucuria le ridică, îngrijorarea le lasă în jos. */
const WING_ANGLE: Record<MascotMood, number> = { idle: 0, listening: 0, thinking: -2, searching: -4, happy: -8, worried: 12, celebrate: -20 };
/** Ochii spre lateral; stângul e mai mare, fiindcă e mai aproape. */
const EYES = [
  [54.8, 38.2, 2.9],
  [68.8, 38.4, 2.5],
] as const;

/**
 * Poza: „flying” (implicit, ca în aplicație) cu aripile deschise, sau „perched”, așezat pe un element,
 * cu aripile strânse (extensia, când critică un element din pagină).
 */
export type MascotPose = "flying" | "perched";

export function MascotFigure({
  mood = "idle",
  size = 96,
  color = COLOR,
  pose = "flying",
}: {
  mood?: MascotMood;
  size?: number;
  color?: string;
  pose?: MascotPose;
}) {
  const anim = mood === "worried" ? "mascot-shake" : mood === "celebrate" || mood === "happy" ? "mascot-jump" : "mascot-bob";
  const a = WING_ANGLE[mood];
  const searching = mood === "searching";
  const look = mood === "thinking" ? [0.4, -0.9] : searching ? [0.2, 0.5] : [0.35, 0.1];
  const glad = mood === "happy" || mood === "celebrate";
  // la căutare, capul se apleacă puțin spre lupă
  const headTilt = mood === "listening" ? "rotate(-10 62 44)" : mood === "thinking" ? "rotate(6 62 44)" : searching ? "rotate(4 62 46)" : undefined;
  const bank = mood === "worried" ? "rotate(3 60 60)" : "rotate(-5 60 60)";

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`${anim} mascot-live`} role="img" aria-label={`${MASCOT_NAME}, mascota`}>
      <g transform={`translate(-1 10) ${bank}`}>
        {/* coada, în spate */}
        <g className="mascot-tail">
          <path d={TAIL} fill={darker(color)} />
          <path d={TAIL} fill={color} transform="translate(61.8 63) scale(0.9 0.84) translate(-61.8 -63)" />
        </g>

        {/* aripile deschise, doar în zbor. `mascot-wing` stă pe un <g> interior: o animație CSS pe
            `transform` ar înlocui atributul `transform` (unghiul din stare); fără animație nu face nimic */}
        {pose === "flying" && (
          <>
            {/* aripa din dreapta: mai departe, oglindită și scurtată în perspectivă, în umbră */}
            <g transform="translate(73 1) scale(-0.74 0.96) translate(-51 0)">
              <g transform={`rotate(${a} 51 50)`}>
                <g className="mascot-wing mascot-wing-far">
                  <Wing shade />
                </g>
              </g>
            </g>
            {/* aripa din stânga, cea apropiată */}
            <g transform={`rotate(${a} 51 50)`}>
              <g className="mascot-wing">
                <Wing />
              </g>
            </g>
          </>
        )}

        {/* corpul, scurtat în perspectivă: pieptul crem cu striații, ghearele strânse */}
        <path d="M50.6 46 C48.6 56 53.6 66.6 61.6 71.4 C69.6 66.6 74.6 56 72.6 46 Z" fill={C.ink} />
        <path d="M55 49 C54 56.4 57 63.6 61.6 67.6 C66.2 63.6 69.2 56.4 68.2 49 Z" fill={C.cream} />
        <path d="M55 49 C54 56.4 57 63.6 61.6 67.6 C59.2 62.6 58 56 58.6 49.6 Z" fill={C.creamShade} />
        {STREAKS.map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} c0.8 -0.6 1.8 -0.6 2.3 0.4 c-0.5 1.2 -1.6 1.8 -2.5 1.4 Z`} fill={C.ink} />
        ))}
        <path d="M57.4 68 C56.8 71.6 58 73.6 60 73.4 L60.6 69.4 Z M65.8 68 C66.4 71.6 65.2 73.6 63.2 73.4 L62.6 69.4 Z" fill={C.gold} />
        <path d="M57 72.4 l0.6 2 l1 -1.6 Z M59.4 73 l0.4 2 l1 -1.8 Z M63.8 73 l-0.4 2 l-1 -1.8 Z M66.2 72.4 l-0.6 2 l-1 -1.6 Z" fill={C.dark} />

        {/* așezat: aripile strânse, după gheare, peste corp și sub cap */}
        {pose === "perched" && <FoldedWings />}

        {/* capul: creștet turtit, gușa crem, ciocul încovoiat */}
        <g transform={headTilt}>
          {/* `mascot-head` pe un <g> interior: mișcarea din CSS nu înlocuiește înclinarea din stare */}
          <g className="mascot-head">
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
                {/* la căutare, pupilele urmăresc lupa */}
                <g className={searching ? "mascot-search-eye" : undefined}>
                  <circle cx={x + look[0]} cy={y + look[1]} r={r * (mood === "worried" ? 0.46 : 0.62)} fill={C.pupil} />
                  <circle cx={x + look[0] + r * 0.28} cy={y + look[1] - r * 0.3} r={r * 0.22} fill="#fff" />
                </g>
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
        </g>

        {/* lupa ținută în aripă: trece prin fața ochilor, stânga-dreapta (mascot-search în index.css) */}
        {searching && (
          <g className="mascot-search" data-testid="mascot-lupa">
            <path d="M56.6 45.2 L49.4 53.6" stroke={C.dark} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M56.6 45.2 L53.4 48.9" stroke={C.goldDeep} strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="61.4" cy="39.6" r="7.2" fill={C.cream} fillOpacity="0.3" />
            <circle cx="61.4" cy="39.6" r="7.2" fill="none" stroke={C.goldDeep} strokeWidth="2.2" />
            <circle cx="61.4" cy="39.6" r="6.1" fill="none" stroke={C.gold} strokeWidth="0.9" />
            <path d="M57.4 37 Q58.6 34.6 61.2 34" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          </g>
        )}
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
          <g className="mascot-confetti">
            {/* fiecare bucată pe un <g> propriu: explozia din CSS (.mascot-bit:nth-child) nu atinge rotația ei.
                Fără style inline: în extensie, CSP-ul unor site-uri l-ar bloca */}
            {CONFETTI.map(([x, y, w, rot, gold], i) => (
              <g key={i} className="mascot-bit">
                <rect x={x} y={y} width={w} height={w} rx={0.6} fill={gold ? C.gold : color} transform={`rotate(${rot} ${x + w / 2} ${y + w / 2})`} />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
