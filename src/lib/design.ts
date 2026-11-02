// Formatul comun pentru „rezultat editabil": AI-ul îl generează, canvas-ul îl
// afișează și îl editează, iar share/export îl serializează.
// Coordonatele sunt în pixeli, cu originea în colțul din stânga-sus.

import { z } from "zod";

const Color = z.string().describe("culoare CSS hex, ex: #1e293b");
const Id = z.string().describe("id unic scurt, ex: e1");

// ── Elementele pe care le poate genera AI-ul (toate câmpurile obligatorii,
//    ca schema să fie acceptată de structured outputs la Claude și Gemini) ──
export const RectEl = z.object({
  type: z.literal("rect"),
  id: Id,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fill: Color,
  radius: z.number().describe("colțuri rotunjite, 0 = drepte"),
});

export const CircleEl = z.object({
  type: z.literal("circle"),
  id: Id,
  x: z.number().describe("centrul cercului"),
  y: z.number().describe("centrul cercului"),
  radius: z.number(),
  fill: Color,
});

export const TextEl = z.object({
  type: z.literal("text"),
  id: Id,
  x: z.number(),
  y: z.number(),
  width: z.number().describe("lățimea casetei de text; textul se rupe pe rânduri"),
  text: z.string(),
  fontSize: z.number(),
  fill: Color,
  fontWeight: z.enum(["normal", "bold"]),
  align: z.enum(["left", "center", "right"]),
});

export const LineEl = z.object({
  type: z.literal("line"),
  id: Id,
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  stroke: Color,
  strokeWidth: z.number(),
});

// ── Elemente produse de utilizator (desen liber, imagini) ──
export const PathEl = z.object({
  type: z.literal("path"),
  id: Id,
  d: z.string().describe("SVG path data"),
  stroke: Color,
  strokeWidth: z.number(),
  fill: z.string().nullable(),
});

export const ImageEl = z.object({
  type: z.literal("image"),
  id: Id,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  src: z.string().describe("URL sau data URL"),
});

const Rotation = { rotation: z.number().optional() };

export const DesignElement = z.discriminatedUnion("type", [
  RectEl.extend(Rotation),
  CircleEl.extend(Rotation),
  TextEl.extend(Rotation),
  LineEl.extend(Rotation),
  PathEl.extend(Rotation),
  ImageEl.extend(Rotation),
]);
export type DesignElement = z.infer<typeof DesignElement>;

export const Design = z.object({
  title: z.string(),
  width: z.number(),
  height: z.number(),
  background: Color,
  elements: z.array(DesignElement),
});
export type Design = z.infer<typeof Design>;

/** Schema pe care o dai la ask() când vrei ca AI-ul să genereze un design. */
export const AiDesign = z.object({
  title: z.string(),
  width: z.number(),
  height: z.number(),
  background: Color,
  elements: z
    .array(z.discriminatedUnion("type", [RectEl, CircleEl, TextEl, LineEl]))
    .describe("ordinea contează: primele elemente sunt în spate"),
});
export type AiDesign = z.infer<typeof AiDesign>;

/** Instrucțiuni de sistem care cresc mult calitatea layout-urilor generate. */
export function designSystemPrompt(width: number, height: number): string {
  return [
    `Ești designer grafic. Generezi un layout pe o pânză de ${width}x${height}px.`,
    "Reguli: toate elementele încap în pânză; păstrează margini de minim 5% din lățime;",
    "ierarhie clară (un titlu mare, text secundar mai mic); maxim 3 culori plus neutre;",
    "contrast text/fundal de minim 4.5:1 (WCAG AA); textele scurte și concrete, în limba cererii.",
    "Pentru text, x/y este colțul stânga-sus al casetei, iar width e lățimea casetei.",
  ].join(" ");
}

export const exampleDesign: Design = {
  title: "Exemplu",
  width: 1080,
  height: 1350,
  background: "#0f172a",
  elements: [
    { type: "rect", id: "bg-card", x: 80, y: 80, width: 920, height: 1190, fill: "#1e293b", radius: 48 },
    { type: "circle", id: "dot", x: 860, y: 260, radius: 120, fill: "#f59e0b" },
    {
      type: "text",
      id: "title",
      x: 140,
      y: 420,
      width: 800,
      text: "Construiește. Colaborează. Inovează.",
      fontSize: 96,
      fill: "#f8fafc",
      fontWeight: "bold",
      align: "left",
    },
    {
      type: "text",
      id: "subtitle",
      x: 140,
      y: 900,
      width: 800,
      text: "Totul de pe pânza asta e editabil: dublu-click pe text, trage de colțuri.",
      fontSize: 44,
      fill: "#cbd5e1",
      fontWeight: "normal",
      align: "left",
    },
    { type: "line", id: "rule", x1: 140, y1: 860, x2: 500, y2: 860, stroke: "#f59e0b", strokeWidth: 10 },
  ],
};

/** Transformă o listă de puncte (ex: traseul degetului) într-un path SVG netezit. */
export function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${round(p.x)} ${round(p.y)}`).join(" ");
  }
  let d = `M ${round(points[0].x)} ${round(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    d += ` Q ${round(points[i].x)} ${round(points[i].y)} ${round(mid.x)} ${round(mid.y)}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${round(last.x)} ${round(last.y)}`;
}

const round = (n: number) => Math.round(n * 10) / 10;

let counter = 0;
export function newId(prefix = "e"): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}
