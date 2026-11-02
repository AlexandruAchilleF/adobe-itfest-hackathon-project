// Demo: urmărirea mâinilor + desen în aer (ciupește ca să desenezi) + AI ghicește desenul.

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { AiError, ask } from "../lib/ai";
import { CameraView } from "../modules/camera/CameraView";
import { useCamera } from "../modules/camera/useCamera";
import { useHands } from "../modules/camera/useHands";
import { mapToViewport } from "../modules/pointer/dwell";
import { usePointerCursor } from "../modules/pointer/PointerCursor";

type Stroke = Array<{ x: number; y: number }>;

const Guess = z.object({
  guess: z.string().describe("ce crezi că reprezintă desenul, 1-3 cuvinte în română"),
  confidence: z.number().describe("între 0 și 1"),
  comment: z.string().describe("o replică scurtă și amuzantă"),
});

export function CameraPage() {
  const cam = useCamera();
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const [swipes, setSwipes] = useState<string[]>([]);
  const [guess, setGuess] = useState<z.infer<typeof Guess> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  // „Mouse cu mâna": arătătorul mișcă un cursor real pe pagină; ciupit = apasă (drag)
  const [handMouse, setHandMouse] = useState(false);
  const handMouseRef = useRef(false);
  handMouseRef.current = handMouse;
  const pointer = usePointerCursor({ dwell: false });

  const { hands, handsRef, status, error: handsError, fps } = useHands(cam.videoRef, {
    enabled: cam.status === "ready",
    onFrame: (list) => {
      const hand = list[0];
      if (handMouseRef.current) {
        if (!hand) return pointer.release();
        const p = mapToViewport(hand.pointer, innerWidth, innerHeight);
        pointer.moveTo(p.x, p.y);
        if (hand.gesture === "pinch") pointer.press();
        else pointer.release();
        return;
      }
      if (hand?.swipe) setSwipes((s) => [`${hand.handedness}: ${hand.swipe}`, ...s].slice(0, 5));
      // ciupit = creion pe hârtie
      if (hand?.gesture === "pinch") {
        if (!drawingRef.current) strokesRef.current.push([]);
        drawingRef.current = true;
        strokesRef.current[strokesRef.current.length - 1].push(hand.pointer);
      } else {
        drawingRef.current = false;
      }
      // pumn = șterge tot
      if (hand?.gesture === "fist" && strokesRef.current.length) strokesRef.current = [];
    },
  });

  // desenează traseele peste video
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = trailRef.current;
      if (c) {
        const w = (c.width = c.clientWidth * devicePixelRatio);
        const h = (c.height = c.clientHeight * devicePixelRatio);
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        renderStrokes(ctx, strokesRef.current, w, h, "#f43f5e", 6 * devicePixelRatio);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  async function guessDrawing() {
    if (!strokesRef.current.length) return;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 384;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    renderStrokes(ctx, strokesRef.current, c.width, c.height, "#111", 8);
    setBusy(true);
    setError(null);
    try {
      const { data } = await ask({
        prompt: "Utilizatorul a desenat ceva în aer cu degetul. Ghicește ce reprezintă desenul.",
        schema: Guess,
        files: [c.toDataURL("image/png")],
        mock: { guess: "o pisică", confidence: 0.42, comment: "Sau poate un nor cu urechi?" },
      });
      setGuess(data);
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  const hand = hands[0];
  return (
    <div>
      {pointer.cursor}
      <PageHeader
        title="Cameră + gesturi"
        description="Ciupește (degetul mare + arătător) ca să desenezi în aer. Pumnul șterge. Mișcă mâna rapid stânga/dreapta pentru swipe."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          <CameraView videoRef={cam.videoRef} handsRef={handsRef} className="w-full">
            <canvas ref={trailRef} className="absolute inset-0 h-full w-full" />
            {hand && (
              <div
                className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500/70"
                style={{ left: `${hand.pointer.x * 100}%`, top: `${hand.pointer.y * 100}%` }}
              />
            )}
          </CameraView>
          <ErrorNote error={cam.error ?? handsError} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={guessDrawing} disabled={busy}>
              {busy && <Spinner />} Ce am desenat?
            </Button>
            <Button onClick={() => (strokesRef.current = [])}>Șterge</Button>
            <Button
              variant={handMouse ? "danger" : "secondary"}
              onClick={() => {
                if (handMouse) pointer.hide();
                setHandMouse(!handMouse);
              }}
            >
              {handMouse ? "■ Oprește mouse-ul cu mâna" : "🖱️ Mouse cu mâna"}
            </Button>
          </div>
          <ErrorNote error={error?.msg} hint={error?.hint} />
          {guess && (
            <Card>
              <p className="text-lg font-semibold">
                „{guess.guess}” <span className="text-sm text-slate-400">({Math.round(guess.confidence * 100)}%)</span>
              </p>
              <p className="text-slate-300">{guess.comment}</p>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card title="Live">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-400">Model</dt>
              <dd>{status}</dd>
              <dt className="text-slate-400">FPS</dt>
              <dd>{fps}</dd>
              <dt className="text-slate-400">Mâini</dt>
              <dd>{hands.length}</dd>
              {hands.map((h) => (
                <div key={h.handedness} className="contents">
                  <dt className="text-slate-400">{h.handedness}</dt>
                  <dd className="font-mono">{h.gesture}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Swipe-uri">
            <ul className="space-y-1 font-mono text-sm text-slate-300">
              {swipes.length ? swipes.map((s, i) => <li key={i}>{s}</li>) : <li className="text-slate-500">—</li>}
            </ul>
          </Card>
          <Card title="În cod">
            <p className="text-sm text-slate-400">
              <Code>useHands(videoRef, {"{ onFrame }"})</Code> îți dă la fiecare cadru gestul, cursorul netezit și swipe-ul. Pentru față
              (zâmbet, clipit): <Code>getFaceLandmarker()</Code> din <Code>vision.ts</Code>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function renderStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number, color: string, width: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (s.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(s[0].x * w, s[0].y * h);
    for (const p of s.slice(1)) ctx.lineTo(p.x * w, p.y * h);
    ctx.stroke();
  }
}
