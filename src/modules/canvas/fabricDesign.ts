// Conversie Design (JSON) ⇄ obiecte Fabric.js. Aici e „puntea" dintre ce generează
// AI-ul și ce poate edita utilizatorul cu mouse-ul / degetul.

import {
  Circle,
  FabricImage,
  type FabricObject,
  Line,
  Path,
  Rect,
  type StaticCanvas,
  Textbox,
  util,
} from "fabric";
import type { Design, DesignElement } from "../../lib/design";
import { newId } from "../../lib/design";

type Tagged = FabricObject & { designId?: string };

const topLeft = { originX: "left", originY: "top" } as const;

export async function elementToFabric(el: DesignElement): Promise<FabricObject> {
  const angle = el.rotation ?? 0;
  let obj: FabricObject;
  switch (el.type) {
    case "rect":
      obj = new Rect({ ...topLeft, left: el.x, top: el.y, width: el.width, height: el.height, fill: el.fill, rx: el.radius, ry: el.radius, angle });
      break;
    case "circle":
      obj = new Circle({ originX: "center", originY: "center", left: el.x, top: el.y, radius: el.radius, fill: el.fill, angle });
      break;
    case "text":
      obj = new Textbox(el.text, {
        ...topLeft,
        left: el.x,
        top: el.y,
        width: el.width,
        fontSize: el.fontSize,
        fill: el.fill,
        fontWeight: el.fontWeight,
        textAlign: el.align,
        fontFamily: "Inter, system-ui, sans-serif",
        angle,
      });
      break;
    case "line":
      obj = new Line([el.x1, el.y1, el.x2, el.y2], { stroke: el.stroke, strokeWidth: el.strokeWidth, strokeLineCap: "round" });
      break;
    case "path":
      obj = new Path(el.d, {
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        fill: el.fill ?? "",
        strokeLineCap: "round",
        strokeLineJoin: "round",
      });
      break;
    case "image": {
      const img = await FabricImage.fromURL(el.src, { crossOrigin: "anonymous" });
      img.set({ ...topLeft, left: el.x, top: el.y, angle });
      img.scaleX = el.width / (img.width || 1);
      img.scaleY = el.height / (img.height || 1);
      obj = img;
      break;
    }
  }
  (obj as Tagged).designId = el.id;
  return obj;
}

export async function loadDesign(canvas: StaticCanvas, design: Design): Promise<void> {
  const objects = await Promise.all(design.elements.map(elementToFabric));
  canvas.clear();
  canvas.backgroundColor = design.background;
  canvas.add(...objects);
  canvas.requestRenderAll();
}

const color = (v: unknown, fallback: string) => (typeof v === "string" && v ? v : fallback);
const r = (n: number) => Math.round(n * 10) / 10;

export function fabricToElement(obj: FabricObject): DesignElement | null {
  const id = (obj as Tagged).designId ?? newId();
  (obj as Tagged).designId = id;
  const rotation = obj.angle ? r(obj.angle) : undefined;
  const tl = obj.getPointByOrigin("left", "top");

  if (obj instanceof Textbox) {
    return {
      type: "text",
      id,
      x: r(tl.x),
      y: r(tl.y),
      width: r(obj.getScaledWidth()),
      text: obj.text,
      fontSize: r(obj.fontSize * (obj.scaleY ?? 1)),
      fill: color(obj.fill, "#000000"),
      fontWeight: String(obj.fontWeight) === "bold" || Number(obj.fontWeight) >= 600 ? "bold" : "normal",
      align: obj.textAlign === "center" || obj.textAlign === "right" ? obj.textAlign : "left",
      rotation,
    };
  }
  if (obj instanceof Rect) {
    return {
      type: "rect",
      id,
      x: r(tl.x),
      y: r(tl.y),
      width: r(obj.getScaledWidth() - obj.strokeWidth),
      height: r(obj.getScaledHeight() - obj.strokeWidth),
      fill: color(obj.fill, "#cccccc"),
      radius: r(obj.rx ?? 0),
      rotation,
    };
  }
  if (obj instanceof Circle) {
    const c = obj.getCenterPoint();
    return { type: "circle", id, x: r(c.x), y: r(c.y), radius: r(obj.getRadiusX()), fill: color(obj.fill, "#cccccc"), rotation };
  }
  if (obj instanceof Line) {
    const pts = obj.calcLinePoints();
    const m = obj.calcTransformMatrix();
    const p1 = util.transformPoint({ x: pts.x1, y: pts.y1 } as never, m);
    const p2 = util.transformPoint({ x: pts.x2, y: pts.y2 } as never, m);
    return {
      type: "line",
      id,
      x1: r(p1.x),
      y1: r(p1.y),
      x2: r(p2.x),
      y2: r(p2.y),
      stroke: color(obj.stroke, "#000000"),
      strokeWidth: obj.strokeWidth,
    };
  }
  if (obj instanceof Path) {
    // Aplicăm transformarea (mutare/scalare/rotire) direct în coordonatele path-ului.
    const abs = util.transformPath(obj.path, obj.calcTransformMatrix(), obj.pathOffset);
    return {
      type: "path",
      id,
      d: util.joinPath(abs, 1),
      stroke: color(obj.stroke, "#000000"),
      strokeWidth: obj.strokeWidth,
      fill: typeof obj.fill === "string" && obj.fill ? obj.fill : null,
    };
  }
  if (obj instanceof FabricImage) {
    const src = obj.getSrc();
    return {
      type: "image",
      id,
      x: r(tl.x),
      y: r(tl.y),
      width: r(obj.getScaledWidth()),
      height: r(obj.getScaledHeight()),
      src,
      rotation,
    };
  }
  return null;
}

export function canvasToDesign(canvas: StaticCanvas, base: Pick<Design, "title" | "width" | "height">): Design {
  return {
    ...base,
    background: color(canvas.backgroundColor, "#ffffff"),
    elements: canvas
      .getObjects()
      .map(fabricToElement)
      .filter((e): e is DesignElement => e !== null),
  };
}
