// Pânză editabilă: afișează un Design, îl lasă editat (selectare, mutare,
// redimensionare, dublu-click pe text, desen liber) și îl exportă PNG/SVG/JSON.
//
//   const ref = useRef<DesignCanvasHandle>(null);
//   <DesignCanvas ref={ref} design={design} onChange={setDesign} />
//   ref.current?.exportPNG()

import { Canvas, Circle, type FabricObject, PencilBrush, Rect, Textbox } from "fabric";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { Design } from "../../lib/design";
import { canvasToDesign, elementToFabric, loadDesign } from "./fabricDesign";

export interface DesignCanvasHandle {
  getDesign(): Design;
  exportPNG(multiplier?: number): string;
  exportPNGBlob(multiplier?: number): Promise<Blob>;
  exportSVG(): string;
  addText(text?: string): void;
  addRect(fill?: string): void;
  addCircle(fill?: string): void;
  addPath(d: string, stroke?: string, strokeWidth?: number): Promise<void>;
  deleteSelected(): void;
  setFillOfSelected(fill: string): void;
  setDrawingMode(on: boolean, color?: string, width?: number): void;
  canvas(): Canvas | null;
}

interface Props {
  design: Design;
  /** Apelat (debounced) după fiecare modificare făcută de utilizator. */
  onChange?: (design: Design) => void;
  className?: string;
}

export const DesignCanvas = forwardRef<DesignCanvasHandle, Props>(function DesignCanvas(
  { design, onChange, className },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const designRef = useRef(design);
  const onChangeRef = useRef(onChange);
  const loadingRef = useRef(false);
  onChangeRef.current = onChange;

  // Creare / distrugere canvas
  useEffect(() => {
    if (!elRef.current) return;
    const canvas = new Canvas(elRef.current, { preserveObjectStacking: true });
    canvasRef.current = canvas;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const emit = () => {
      if (loadingRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = canvasToDesign(canvas, designRef.current);
        designRef.current = next;
        onChangeRef.current?.(next);
      }, 150);
    };
    canvas.on("object:modified", emit);
    canvas.on("object:added", emit);
    canvas.on("object:removed", emit);
    canvas.on("text:changed", emit);

    return () => {
      clearTimeout(timer);
      canvasRef.current = null;
      void canvas.dispose();
    };
  }, []);

  // Încarcă designul când se schimbă din afară (ex: AI-ul a generat altul)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (design === designRef.current && canvas.getObjects().length > 0) return;
    designRef.current = design;
    canvas.setDimensions({ width: design.width, height: design.height });
    fit();
    loadingRef.current = true;
    loadDesign(canvas, design)
      .catch((err) => console.error("[canvas] nu am putut încărca designul", err))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [design]);

  // Scalează pânza (doar CSS) ca să încapă în container
  function fit() {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const { width, height } = designRef.current;
    const maxW = wrap.clientWidth || width;
    const scale = Math.min(1, maxW / width);
    canvas.setDimensions({ width: `${width * scale}px`, height: `${height * scale}px` }, { cssOnly: true });
  }
  useEffect(() => {
    const ro = new ResizeObserver(() => fit());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  function add(obj: FabricObject) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }

  useImperativeHandle(ref, () => ({
    getDesign: () => (canvasRef.current ? canvasToDesign(canvasRef.current, designRef.current) : designRef.current),
    exportPNG: (multiplier = 1) => canvasRef.current?.toDataURL({ format: "png", multiplier }) ?? "",
    exportPNGBlob: async (multiplier = 1) => {
      const url = canvasRef.current?.toDataURL({ format: "png", multiplier }) ?? "";
      return (await fetch(url)).blob();
    },
    exportSVG: () => canvasRef.current?.toSVG() ?? "",
    addText: (text = "Text nou") => {
      const { width, height } = designRef.current;
      add(new Textbox(text, { originX: "left", originY: "top", left: width * 0.1, top: height * 0.4, width: width * 0.6, fontSize: Math.round(width / 16), fill: "#111827", fontFamily: "Inter, system-ui, sans-serif" }));
    },
    addRect: (fill = "#f59e0b") => {
      const { width, height } = designRef.current;
      add(new Rect({ originX: "left", originY: "top", left: width * 0.3, top: height * 0.3, width: width * 0.3, height: width * 0.2, fill, rx: 16, ry: 16 }));
    },
    addCircle: (fill = "#38bdf8") => {
      const { width, height } = designRef.current;
      add(new Circle({ originX: "center", originY: "center", left: width / 2, top: height / 2, radius: width * 0.1, fill }));
    },
    addPath: async (d, stroke = "#f43f5e", strokeWidth = 8) => {
      add(await elementToFabric({ type: "path", id: crypto.randomUUID().slice(0, 8), d, stroke, strokeWidth, fill: null }));
    },
    deleteSelected: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getActiveObjects().forEach((o) => canvas.remove(o));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    },
    setFillOfSelected: (fill) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.getActiveObjects().forEach((o) => o.set(o.type === "line" || o.type === "path" ? { stroke: fill } : { fill }));
      canvas.requestRenderAll();
      canvas.fire("object:modified", {} as never);
    },
    setDrawingMode: (on, colorValue = "#f43f5e", width = 8) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.isDrawingMode = on;
      if (on) {
        const brush = new PencilBrush(canvas);
        brush.color = colorValue;
        brush.width = width;
        canvas.freeDrawingBrush = brush;
      }
    },
    canvas: () => canvasRef.current,
  }));

  return (
    <div ref={wrapRef} className={`w-full min-w-0 ${className ?? ""}`}>
      <canvas ref={elRef} />
    </div>
  );
});
