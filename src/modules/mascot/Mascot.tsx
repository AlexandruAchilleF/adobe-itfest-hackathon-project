// Țepi, ariciul: mascota care arată, prin expresie, ce face AI-ul (ascultă, se gândește,
// a verificat sursa, a găsit o problemă). Personaj original, desenat în SVG.
// Numele și culoarea se schimbă din .env: VITE_MASCOT_NAME, VITE_MASCOT_COLOR.

import { useMemo } from "react";
import type { MascotMood } from "./mascot";

export const MASCOT_NAME = (import.meta.env.VITE_MASCOT_NAME as string | undefined) || "Țepi";
const COLOR = (import.meta.env.VITE_MASCOT_COLOR as string | undefined) || "#8b5e3c";

/** Țepii: zigzag pe spatele ariciului (de la ceafă, peste creștet, până jos la spate). */
function spikesPath(cx: number, cy: number, inner: number, outer: number, from: number, to: number, count: number) {
  const pts: string[] = [];
  for (let i = 0; i <= count * 2; i++) {
    const a = ((from + ((to - from) * i) / (count * 2)) * Math.PI) / 180;
    const r = i % 2 ? outer : inner;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r * 0.85).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
}

const MOUTHS: Record<MascotMood, string> = {
  idle: "M77 86 Q81 89 85 86",
  listening: "M78 86 Q81 88 84 86",
  thinking: "M80 87 a2 2 0 1 0 0.1 0",
  happy: "M75 84 Q81 92 87 84",
  worried: "M76 89 Q81 84 86 89",
  celebrate: "M74 83 Q81 95 88 83 Z",
};

export function MascotFigure({ mood = "idle", size = 96, color = COLOR }: { mood?: MascotMood; size?: number; color?: string }) {
  const spikes = useMemo(() => spikesPath(56, 70, 32, 47, 150, 345, 9), []);
  const anim = mood === "worried" ? "mascot-shake" : mood === "celebrate" || mood === "happy" ? "mascot-jump" : "mascot-bob";
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={anim} role="img" aria-label={`${MASCOT_NAME}, mascota`}>
      {/* umbra */}
      <ellipse cx="60" cy="108" rx="32" ry="5" fill="#000" opacity="0.18" />
      {/* țepi */}
      <path d={spikes} fill={color} style={{ filter: "brightness(0.7)" }} />
      {/* lăbuțe ridicate (în spatele corpului) */}
      {mood === "celebrate" && (
        <>
          <path d="M40 80 L22 60" stroke={color} strokeWidth="6" strokeLinecap="round" />
          <path d="M76 58 L84 34" stroke={color} strokeWidth="6" strokeLinecap="round" />
        </>
      )}
      {/* corp */}
      <ellipse cx="60" cy="74" rx="36" ry="29" fill={color} />
      {/* burtă + față */}
      <ellipse cx="72" cy="80" rx="24" ry="20" fill="#f3e3cf" />
      {/* bot și nas */}
      <ellipse cx="90" cy="80" rx="11" ry="7.5" fill="#f3e3cf" />
      <circle cx="100" cy="78" r="3.6" fill="#2b1d14" />
      {/* ureche */}
      <ellipse cx="64" cy="56" rx="5" ry="6" fill="#e8cfb3" stroke={color} strokeWidth="1.5" className={mood === "listening" ? "mascot-ear" : undefined} />
      {/* ochi */}
      <g className="mascot-blink">
        <circle cx="76" cy="71" r={mood === "worried" ? 3.2 : 3.6} fill="#2b1d14" />
        <circle cx="86" cy="69" r={mood === "worried" ? 2.8 : 3.2} fill="#2b1d14" />
        <circle cx="77.2" cy="69.8" r="1.1" fill="#fff" />
        <circle cx="87" cy="67.9" r="1" fill="#fff" />
      </g>
      {/* sprâncene la îngrijorare */}
      {mood === "worried" && <path d="M72 64 L79 66 M84 64 L90 63" stroke="#2b1d14" strokeWidth="1.6" strokeLinecap="round" />}
      {/* obraji */}
      <circle cx="78" cy="82" r="3.6" fill="#f28b82" opacity={mood === "happy" || mood === "celebrate" ? 0.7 : 0.35} />
      {/* gură */}
      <path d={MOUTHS[mood]} stroke="#2b1d14" strokeWidth="1.8" fill={mood === "celebrate" ? "#7a2e2e" : "none"} strokeLinecap="round" />
      {/* lăbuțe */}
      <ellipse cx="68" cy="99" rx="7" ry="4" fill={color} style={{ filter: "brightness(0.85)" }} />
      <ellipse cx="86" cy="99" rx="7" ry="4" fill={color} style={{ filter: "brightness(0.85)" }} />
      {/* undele sunetului când ascultă */}
      {mood === "listening" && (
        <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" className="mascot-waves">
          <path d="M50 46 Q44 52 50 58" />
          <path d="M44 41 Q35 52 44 63" />
        </g>
      )}
      {/* bulele de gândire */}
      {mood === "thinking" && (
        <g fill="#cbd5e1" className="mascot-dots">
          <circle cx="98" cy="50" r="3" />
          <circle cx="106" cy="40" r="4" />
          <circle cx="112" cy="27" r="5" />
        </g>
      )}
      {/* confetti */}
      {mood === "celebrate" && (
        <g className="mascot-confetti">
          <rect x="30" y="20" width="5" height="5" fill="#f5a524" transform="rotate(20 32 22)" />
          <rect x="92" y="14" width="5" height="5" fill="#38bdf8" transform="rotate(-15 94 16)" />
          <rect x="62" y="8" width="4" height="4" fill="#22c55e" />
          <rect x="105" y="34" width="4" height="4" fill="#ec4899" />
        </g>
      )}
    </svg>
  );
}
