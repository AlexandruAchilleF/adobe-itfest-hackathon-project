// Designul (src/lib/design.ts) desenat static, ca SVG: pentru landing page, unde nu e nevoie de canvas-ul editabil.
// Textul stă în foreignObject, ca să se rupă pe rânduri la fel ca în canvas.
// `rounded` rotunjește colțurile imaginilor (ilustrația ca o placă); `ring` încercuiește un strat (garda pe machetă).
import { useId } from "react";
import type { Design, DesignElement } from "../../lib/design";

const IMAGE_RADIUS = 40;

function Element({ el, rounded, uid }: { el: DesignElement; rounded: boolean; uid: string }) {
  const rotate = (x: number, y: number) => (el.rotation ? `rotate(${el.rotation} ${x} ${y})` : undefined);
  switch (el.type) {
    case "rect":
      return <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={el.radius} fill={el.fill} transform={rotate(el.x, el.y)} />;
    case "circle":
      return <circle cx={el.x} cy={el.y} r={el.radius} fill={el.fill} />;
    case "line":
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={el.stroke} strokeWidth={el.strokeWidth} />;
    case "path":
      return <path d={el.d} stroke={el.stroke} strokeWidth={el.strokeWidth} fill={el.fill ?? "none"} />;
    case "image":
      return (
        <g transform={rotate(el.x, el.y)}>
          {rounded && (
            <clipPath id={`${uid}-${el.id}`}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={IMAGE_RADIUS} />
            </clipPath>
          )}
          <image href={el.src} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio="xMidYMid slice" clipPath={rounded ? `url(#${uid}-${el.id})` : undefined} />
        </g>
      );
    case "text":
      return (
        <foreignObject x={el.x} y={el.y} width={el.width} height={el.fontSize * 4} transform={rotate(el.x, el.y)}>
          <div
            style={{
              color: el.fill,
              fontSize: el.fontSize,
              fontWeight: el.fontWeight === "bold" ? 700 : 400,
              textAlign: el.align,
              lineHeight: 1.15,
              fontFamily: el.fontFamily ? `"${el.fontFamily}", "${el.fontFamily} Variable", var(--font-sans)` : "var(--font-sans)",
            }}
          >
            {el.text}
          </div>
        </foreignObject>
      );
  }
}

export function DesignPreview({ design, className = "", rounded = false, ring }: { design: Design; className?: string; rounded?: boolean; ring?: { id: string; color: string } }) {
  // id-urile din SVG sunt globale în pagină: fiecare previzualizare are prefixul ei
  const uid = useId().replace(/:/g, "");
  const ringed = ring && design.elements.find((e) => e.id === ring.id);
  return (
    <svg viewBox={`0 0 ${design.width} ${design.height}`} className={className} role="img" aria-label={design.title}>
      <rect width={design.width} height={design.height} fill={design.background} />
      {design.elements.map((el) => (
        <Element key={el.id} el={el} rounded={rounded} uid={uid} />
      ))}
      {ring && ringed?.type === "rect" && <rect x={ringed.x - 14} y={ringed.y - 14} width={ringed.width + 28} height={ringed.height + 28} rx={ringed.radius + 12} fill="none" stroke={ring.color} strokeWidth={8} className="land-ring" />}
    </svg>
  );
}
