// Designul în lumea reală: pui designul pe o fotografie (perete, vitrină, stație),
// simulezi distanța și daltonismul și verifici automat contrastul și lizibilitatea.

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { auditDesign, COLOR_VISION_LABELS, type ColorVision, distanceBlurPx, simulateImageData } from "../lib/accessibility";
import { AiError, ask } from "../lib/ai";
import { type Design, exampleDesign } from "../lib/design";
import { drawImageToQuad, orderQuad, type Pt } from "../lib/perspective";
import { downloadDataUrl, loadLastDesign } from "../lib/share";
import { renderDesignToCanvas } from "../modules/canvas/fabricDesign";
import { useCamera } from "../modules/camera/useCamera";

const Critique = z.object({
  verdict: z.string().describe("o propoziție: funcționează afișul în locul ăsta?"),
  fixes: z.array(z.string()).describe("2-4 modificări concrete, cu valori (ex: mărește titlul la 140px)"),
});

/** Imagine demo: un „perete" generat, ca pagina să meargă și fără poză. */
function demoWall(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1280;
  c.height = 800;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 800);
  g.addColorStop(0, "#9ca3af");
  g.addColorStop(1, "#4b5563");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 800);
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  for (let y = 0; y < 800; y += 40) for (let x = (y / 40) % 2 ? 0 : 60; x < 1280; x += 120) ctx.strokeRect(x, y, 120, 40);
  return c;
}

export function MockupPage() {
  const [design] = useState<Design>(() => loadLastDesign() ?? exampleDesign);
  const [photo, setPhoto] = useState<HTMLCanvasElement | HTMLImageElement>(() => demoWall());
  const [points, setPoints] = useState<Pt[]>([
    { x: 480, y: 120 },
    { x: 830, y: 160 },
    { x: 820, y: 640 },
    { x: 470, y: 690 },
  ]);
  const [distance, setDistance] = useState(3);
  const [widthCm, setWidthCm] = useState(50);
  const [vision, setVision] = useState<ColorVision>("normal");
  const [poster, setPoster] = useState<HTMLCanvasElement | null>(null);
  const [critique, setCritique] = useState<z.infer<typeof Critique> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);
  const outRef = useRef<HTMLCanvasElement>(null);
  const cam = useCamera({ autoStart: false, facingMode: "environment" });

  useEffect(() => {
    void renderDesignToCanvas(design).then(setPoster);
  }, [design]);

  // compune imaginea: poză + design în perspectivă, cu blur de distanță și filtru de culoare
  useEffect(() => {
    const out = outRef.current;
    if (!out || !poster) return;
    out.width = photo.width;
    out.height = photo.height;
    const ctx = out.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(photo, 0, 0);
    if (points.length === 4) {
      const blur = distanceBlurPx(design.width, widthCm, distance);
      const src = document.createElement("canvas");
      src.width = poster.width;
      src.height = poster.height;
      const sctx = src.getContext("2d")!;
      sctx.filter = blur > 0.3 ? `blur(${blur}px)` : "none";
      sctx.drawImage(poster, 0, 0);
      drawImageToQuad(ctx, src, orderQuad(points));
    }
    if (vision !== "normal") ctx.putImageData(simulateImageData(ctx.getImageData(0, 0, out.width, out.height), vision), 0, 0);
    ctx.fillStyle = "#f5a524";
    if (points.length < 4) points.forEach((p) => ctx.fillRect(p.x - 6, p.y - 6, 12, 12));
  }, [photo, poster, points, distance, widthCm, vision, design.width]);

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: ((e.clientX - r.left) / r.width) * photo.width, y: ((e.clientY - r.top) / r.height) * photo.height };
    setPoints((pts) => (pts.length >= 4 ? [p] : [...pts, p]));
  }

  function loadFile(file: File) {
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      setPoints([]);
    };
    img.src = URL.createObjectURL(file);
  }

  async function capture() {
    const url = cam.capture(1600, 0.9);
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      setPhoto(img);
      setPoints([]);
      cam.stop();
    };
    img.src = url;
  }

  async function aiCritique() {
    if (!outRef.current) return;
    setBusy(true);
    setError(null);
    try {
      const issues = audit
        .map((a) => `„${a.text.slice(0, 40)}”: contrast ${a.contrast} (${a.level}), se citește de la ${a.readableFromM} m`)
        .join("\n");
      const { data } = await ask({
        system: "Ești expert în design de afișe și signalistică. Răspunzi concis, în română, cu valori concrete.",
        prompt: `Afișul (${widthCm} cm lățime) e pus în locul din imagine și privit de la ${distance} m.\nAudit automat:\n${issues}`,
        schema: Critique,
        files: [outRef.current.toDataURL("image/jpeg", 0.8)],
        mock: { verdict: "(demo) Titlul se citește, dar textul secundar se pierde de la distanța asta.", fixes: ["Mărește subtitlul la cel puțin 64px", "Scurtează textul secundar la 6-8 cuvinte"] },
      });
      setCritique(data);
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  const audit = auditDesign(design, widthCm);
  return (
    <div>
      <PageHeader
        title="Mockup în lumea reală"
        description="Pune designul pe o poză reală (atinge 4 colțuri), apoi vezi cum arată de la distanță și pentru un daltonist. Auditul de contrast și lizibilitate e calculat, nu ghicit."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm">
              📁 Încarcă poză
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </label>
            {cam.status === "ready" ? (
              <Button variant="primary" onClick={capture}>
                📸 Fă poza
              </Button>
            ) : (
              <Button onClick={() => void cam.start()}>📷 Cameră</Button>
            )}
            <Button variant="ghost" onClick={() => setPoints([])}>
              Resetează colțurile
            </Button>
            <Button variant="ghost" onClick={() => outRef.current && downloadDataUrl(outRef.current.toDataURL("image/png"), "mockup.png")}>
              Descarcă
            </Button>
          </div>
          <video ref={cam.videoRef} className={cam.status === "ready" ? "max-h-64 rounded-xl" : "hidden"} playsInline muted />
          <ErrorNote error={cam.error} />
          <canvas ref={outRef} onClick={onCanvasClick} className="w-full cursor-crosshair rounded-2xl" data-testid="mockup" />
          <p className="text-xs text-slate-500">
            {points.length < 4 ? `Atinge colțurile zonei unde stă afișul (${points.length}/4), în orice ordine.` : "Click oriunde ca să alegi alte colțuri."}
          </p>
        </div>
        <div className="space-y-4">
          <Card title="Simulare">
            <label className="block text-sm">
              Distanța: <b>{distance} m</b>
              <input type="range" min={0.5} max={20} step={0.5} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="w-full" />
            </label>
            <label className="mt-3 block text-sm">
              Lățimea reală a afișului (cm)
              <input type="number" min={5} max={1000} value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value) || 50)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5" />
            </label>
            <label className="mt-3 block text-sm">
              Vedere
              <select value={vision} onChange={(e) => setVision(e.target.value as ColorVision)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5">
                {Object.entries(COLOR_VISION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </Card>
          <Card title="Audit texte">
            <ul className="space-y-2 text-sm">
              {audit.map((a) => {
                const tooFar = a.readableFromM < distance;
                return (
                  <li key={a.id} className="rounded-xl bg-slate-800/60 p-2">
                    <p className="truncate font-medium">„{a.text}”</p>
                    <p className={a.level === "fail" ? "text-rose-300" : "text-emerald-300"}>
                      contrast {a.contrast}:1 · {a.level === "fail" ? "nu trece WCAG" : `WCAG ${a.level}`}
                    </p>
                    <p className={tooFar ? "text-rose-300" : "text-emerald-300"}>
                      se citește până la {a.readableFromM} m {tooFar ? `(nu de la ${distance} m)` : "✓"}
                    </p>
                  </li>
                );
              })}
            </ul>
            <Button variant="primary" className="mt-3" onClick={aiCritique} disabled={busy}>
              {busy && <Spinner />} Părerea AI
            </Button>
            <ErrorNote error={error?.msg} hint={error?.hint} />
            {critique && (
              <div className="mt-3 text-sm">
                <p className="font-medium">{critique.verdict}</p>
                <ul className="mt-1 list-disc pl-5 text-slate-300">
                  {critique.fixes.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
          <p className="text-xs text-slate-500">
            În cod: <Code>drawImageToQuad()</Code>, <Code>auditDesign()</Code>, <Code>simulateImageData()</Code>, <Code>distanceBlurPx()</Code>. Designul vine din ultima pânză editată.
          </p>
        </div>
      </div>
    </div>
  );
}
