// Controalele de pe telefon. Fiecare trimite ControllerInput prin `send`.
import { useEffect, useRef, useState } from "react";
import { type ControllerInput, joystickVector, throttle, tiltVector } from "./protocol";

type Send = (input: ControllerInput) => void;

const vibrate = (ms = 15) => navigator.vibrate?.(ms);

export function Joystick({ send }: { send: Send }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const sendThrottled = useRef(throttle<{ x: number; y: number }>((v) => send({ kind: "joystick", ...v }), 50)).current;

  function move(e: React.PointerEvent) {
    const rect = baseRef.current!.getBoundingClientRect();
    const radius = rect.width / 2;
    const v = joystickVector(e.clientX - rect.left - radius, e.clientY - rect.top - radius, radius);
    setKnob(v);
    sendThrottled(v);
  }
  function release() {
    setKnob({ x: 0, y: 0 });
    send({ kind: "joystick", x: 0, y: 0 });
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={release}
      onPointerCancel={release}
      className="relative aspect-square w-56 touch-none rounded-full border-4 border-slate-700 bg-slate-800/80"
    >
      <div
        className="absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-lg"
        style={{ left: `${50 + knob.x * 50}%`, top: `${50 + knob.y * 50}%` }}
      />
    </div>
  );
}

export function ActionButtons({ send }: { send: Send }) {
  const btn = (id: "a" | "b", label: string, color: string) => (
    <button
      onPointerDown={() => {
        vibrate();
        send({ kind: "button", id, pressed: true });
      }}
      onPointerUp={() => send({ kind: "button", id, pressed: false })}
      onPointerCancel={() => send({ kind: "button", id, pressed: false })}
      className={`h-24 w-24 touch-none select-none rounded-full text-3xl font-black text-white shadow-lg active:scale-90 ${color}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex gap-4">
      {btn("a", "A", "bg-rose-600")}
      {btn("b", "B", "bg-sky-600")}
    </div>
  );
}

type OrientationCtor = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

export function TiltPad({ send }: { send: Send }) {
  const [enabled, setEnabled] = useState(false);
  const [vec, setVec] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const sendThrottled = throttle<{ x: number; y: number }>((v) => send({ kind: "tilt", ...v }), 50);
    const handler = (e: DeviceOrientationEvent) => {
      const v = tiltVector(e.beta, e.gamma);
      setVec(v);
      sendThrottled(v);
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [enabled, send]);

  async function enable() {
    try {
      const Ctor = window.DeviceOrientationEvent as OrientationCtor | undefined;
      if (!Ctor) throw new Error("Telefonul nu are senzor de orientare.");
      // iOS cere permisiune explicită, după o atingere, și doar pe HTTPS
      if (typeof Ctor.requestPermission === "function" && (await Ctor.requestPermission()) !== "granted") {
        throw new Error("Permisiunea pentru senzori a fost refuzată.");
      }
      setEnabled(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!enabled) {
    return (
      <div className="text-center">
        <button onClick={enable} className="rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-slate-950">
          Activează înclinarea
        </button>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>
    );
  }
  return (
    <div className="relative aspect-square w-56 rounded-full border-4 border-slate-700 bg-slate-800/80">
      <div className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${50 + vec.x * 45}%`, top: `${50 + vec.y * 45}%` }} />
      <p className="absolute inset-x-0 -bottom-8 text-center text-sm text-slate-400">Înclină telefonul</p>
    </div>
  );
}

export function DrawPad({ send, color = "#f43f5e" }: { send: Send; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<{ id: string; buffer: Array<{ x: number; y: number }>; last: { x: number; y: number } | null } | null>(null);

  useEffect(() => {
    const c = canvasRef.current!;
    c.width = c.clientWidth * devicePixelRatio;
    c.height = c.clientHeight * devicePixelRatio;
  }, []);

  const flush = (end: boolean) => {
    const s = stroke.current;
    if (!s || (!s.buffer.length && !end)) return;
    send({ kind: "draw", stroke: s.id, points: s.buffer, end });
    s.buffer = [];
  };
  useEffect(() => {
    const t = setInterval(() => flush(false), 60);
    return () => clearInterval(t);
  });

  function point(e: React.PointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function draw(p: { x: number; y: number }) {
    const s = stroke.current!;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { width, height } = canvasRef.current!;
    if (s.last) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6 * devicePixelRatio;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.last.x * width, s.last.y * height);
      ctx.lineTo(p.x * width, p.y * height);
      ctx.stroke();
    }
    s.last = p;
    s.buffer.push({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          stroke.current = { id: crypto.randomUUID().slice(0, 8), buffer: [], last: null };
          draw(point(e));
        }}
        onPointerMove={(e) => stroke.current && e.buttons && draw(point(e))}
        onPointerUp={() => {
          flush(true);
          stroke.current = null;
        }}
        className="aspect-[4/3] w-full touch-none rounded-2xl bg-white"
      />
      <button
        onClick={() => {
          const c = canvasRef.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        }}
        className="mt-2 text-sm text-slate-400 underline"
      >
        Șterge
      </button>
    </div>
  );
}

export function Choices({ send, choices }: { send: Send; choices: string[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [choices]);
  return (
    <div className="grid w-full gap-3">
      {choices.map((c, i) => (
        <button
          key={i}
          onClick={() => {
            vibrate(30);
            setPicked(i);
            send({ kind: "choice", index: i });
          }}
          className={`rounded-2xl px-5 py-5 text-left text-lg font-semibold transition ${picked === i ? "bg-accent text-slate-950" : "bg-slate-800 text-slate-100"}`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export function TextInput({ send }: { send: Send }) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        send({ kind: "text", value: value.trim().slice(0, 280) });
        setValue("");
        setSent(true);
        setTimeout(() => setSent(false), 1500);
      }}
    >
      <textarea value={value} onChange={(e) => setValue(e.target.value)} className="h-32 w-full rounded-2xl border border-slate-700 bg-slate-900 p-4 text-lg" placeholder="Scrie aici…" />
      <button className="mt-3 w-full rounded-2xl bg-accent py-4 text-lg font-bold text-slate-950">{sent ? "Trimis ✓" : "Trimite"}</button>
    </form>
  );
}
