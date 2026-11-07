// Designul (src/lib/design.ts) desenat static, ca SVG: pentru landing page, unde nu e nevoie de canvas-ul editabil.
// Textul stă în foreignObject, ca să se rupă pe rânduri la fel ca în canvas.
import type { Design, DesignElement } from "../../lib/design";

function Element({ el }: { el: DesignElement }) {
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
      return <image href={el.src} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio="xMidYMid slice" transform={rotate(el.x, el.y)} />;
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

export function DesignPreview({ design, className = "" }: { design: Design; className?: string }) {
  return (
    <svg viewBox={`0 0 ${design.width} ${design.height}`} className={className} role="img" aria-label={design.title}>
      <rect width={design.width} height={design.height} fill={design.background} />
      {design.elements.map((el) => (
        <Element key={el.id} el={el} />
      ))}
    </svg>
  );
}
