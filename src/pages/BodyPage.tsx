// Fața și corpul ca input: control fără mâini (accesibilitate), jocuri cu tot corpul.
import { useEffect, useRef, useState } from "react";
import { Button, Card, Code, ErrorNote, PageHeader } from "../components/ui";
import { CameraView } from "../modules/camera/CameraView";
import type { FaceEvent } from "../modules/camera/face";
import { POSE_CONNECTIONS } from "../modules/camera/pose";
import { useCamera } from "../modules/camera/useCamera";
import { useFace } from "../modules/camera/useFace";
import { usePose } from "../modules/camera/usePose";

type Mode = "face" | "pose";

export function BodyPage() {
  const cam = useCamera();
  const [mode, setMode] = useState<Mode>("face");
  const [events, setEvents] = useState<string[]>([]);
  const cursor = useRef({ x: 0.5, y: 0.5 });
  const cursorEl = useRef<HTMLDivElement>(null);
  const [clicks, setClicks] = useState(0);

  const face = useFace(cam.videoRef, {
    enabled: cam.status === "ready" && mode === "face",
    onFrame: (f) => {
      if (!f) return;
      // capul ca joystick: înclinarea mută cursorul
      cursor.current.x = Math.max(0, Math.min(1, cursor.current.x + f.expressions.yaw * 0.012));
      cursor.current.y = Math.max(0, Math.min(1, cursor.current.y + f.expressions.pitch * 0.012));
      if (cursorEl.current) {
        cursorEl.current.style.left = `${cursor.current.x * 100}%`;
        cursorEl.current.style.top = `${cursor.current.y * 100}%`;
      }
    },
    onEvent: (e: FaceEvent) => {
      setEvents((l) => [e, ...l].slice(0, 6));
      if (e === "blink" || e === "mouth-open") setClicks((c) => c + 1);
    },
  });
  const pose = usePose(cam.videoRef, { enabled: cam.status === "ready" && mode === "pose" });

  // desenează scheletul corpului
  const overlay = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (mode !== "pose") return;
    let raf = 0;
    const draw = () => {
      const c = overlay.current;
      if (c) {
        const w = (c.width = c.clientWidth);
        const h = (c.height = c.clientHeight);
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        const lm = pose.landmarksRef.current;
        if (lm.length) {
          ctx.strokeStyle = "#22c55e";
          ctx.lineWidth = 4;
          for (const [a, b] of POSE_CONNECTIONS) {
            if (!lm[a] || !lm[b]) continue;
            ctx.beginPath();
            ctx.moveTo(lm[a].x * w, lm[a].y * h);
            ctx.lineTo(lm[b].x * w, lm[b].y * h);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mode, pose.landmarksRef]);

  const e = face.expressions;
  const meter = (label: string, v: number | undefined) => (
    <div key={label}>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{v === undefined ? "–" : v.toFixed(2)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.abs(v ?? 0) * 100}%` }} />
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Față + corp" description="Expresii și mișcarea capului ca input (control fără mâini), sau postura întregului corp pentru jocuri și fitness.">
        <div className="flex gap-2">
          <Button variant={mode === "face" ? "primary" : "secondary"} onClick={() => setMode("face")}>
            🙂 Față
          </Button>
          <Button variant={mode === "pose" ? "primary" : "secondary"} onClick={() => setMode("pose")}>
            🕺 Corp
          </Button>
        </div>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3">
          <CameraView videoRef={cam.videoRef} showSkeleton={false} className="w-full">
            {mode === "face" && <div ref={cursorEl} className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-accent/70" style={{ left: "50%", top: "50%" }} />}
            {mode === "pose" && <canvas ref={overlay} className="absolute inset-0 h-full w-full" />}
          </CameraView>
          <ErrorNote error={cam.error ?? face.error ?? pose.error} />
        </div>
        <div className="space-y-4">
          {mode === "face" ? (
            <>
              <Card title="Expresii">
                <div className="space-y-2">
                  {meter("zâmbet", e?.smile)}
                  {meter("clipit stânga", e?.blinkLeft)}
                  {meter("clipit dreapta", e?.blinkRight)}
                  {meter("gura deschisă", e?.mouthOpen)}
                  {meter("sprâncene ridicate", e?.browRaise)}
                  {meter("cap stânga/dreapta", e?.yaw)}
                  {meter("cap sus/jos", e?.pitch)}
                </div>
              </Card>
              <Card title={`Evenimente · ${clicks} „click”-uri`}>
                <p className="mb-2 text-xs text-slate-400">Clipește sau deschide gura = click. Înclină capul = mută cursorul.</p>
                <ul className="font-mono text-sm">{events.map((ev, i) => <li key={i}>{ev}</li>)}</ul>
              </Card>
            </>
          ) : (
            <Card title="Postură">
              <p className="text-2xl font-bold">{pose.pose}</p>
              <p className="mt-2 text-sm text-slate-400">Ridică o mână, ambele, sau fă T. Stai la 2 m de cameră ca să intri tot în cadru.</p>
              <p className="mt-2 text-xs text-slate-500">Model: {pose.status}</p>
            </Card>
          )}
          <p className="text-xs text-slate-500">
            În cod: <Code>useFace(videoRef, {"{ onEvent }"})</Code>, <Code>usePose(videoRef)</Code>. Totul rulează local, fără să trimită imagini.
          </p>
        </div>
      </div>
    </div>
  );
}
