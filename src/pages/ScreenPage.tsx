// Ecranul mare: QR pentru telefoane + arenă unde fiecare telefon e un punct colorat.
// Schimbă layout-ul și toate telefoanele se transformă instant (joystick, înclinare, desen, vot, text).

import { useEffect, useRef, useState } from "react";
import { Button, Card, Code, PageHeader, Pill } from "../components/ui";
import { QrPanel } from "../components/QrPanel";
import { type ControllerLayout, type ScreenState, tally } from "../modules/controller/protocol";
import { useControllers } from "../modules/controller/useControllers";
import { randomRoomCode, roomJoinUrl } from "../modules/rooms/useRoom";

const LAYOUTS: Array<{ layout: ControllerLayout; label: string; prompt: string; choices?: string[] }> = [
  { layout: "gamepad", label: "🎮 Joystick", prompt: "Mișcă-ți punctul. A = puls" },
  { layout: "tilt", label: "📱 Înclinare", prompt: "Înclină telefonul" },
  { layout: "draw", label: "✏️ Desen", prompt: "Desenează ceva pe ecranul mare" },
  { layout: "choices", label: "🗳️ Vot", prompt: "Care idee vă place?", choices: ["Afișul vocal", "Joc cu gesturi", "Lentila de accesibilitate"] },
  { layout: "text", label: "💬 Text", prompt: "Trimite o întrebare pentru juriu" },
];

interface Dot {
  x: number;
  y: number;
  pulse: number;
}

export function ScreenPage() {
  const [code] = useState(() => randomRoomCode());
  const strokes = useRef(new Map<string, { color: string; points: Array<{ x: number; y: number }> }>());
  const [messages, setMessages] = useState<Array<{ from: string; text: string }>>([]);
  const ctl = useControllers(
    code,
    { layout: "gamepad", prompt: LAYOUTS[0].prompt, choices: [] },
    {
      onInput: (input, from) => {
        if (input.kind === "draw") {
          const color = String(ctl.room.players.find((p) => p.id === from)?.meta?.color ?? "#fff");
          const s = strokes.current.get(input.stroke) ?? { color, points: [] };
          s.points.push(...input.points);
          strokes.current.set(input.stroke, s);
        } else if (input.kind === "text") {
          const name = ctl.room.players.find((p) => p.id === from)?.name ?? "?";
          setMessages((m) => [{ from: name, text: input.value }, ...m].slice(0, 8));
        }
      },
    },
  );
  const arenaRef = useRef<HTMLCanvasElement>(null);
  const dots = useRef(new Map<string, Dot>());
  const playersRef = useRef(ctl.controllers);
  playersRef.current = ctl.controllers;
  const [, force] = useState(0);

  // bucla de joc: citește snapshot-urile și mișcă punctele
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const c = arenaRef.current;
      if (c) {
        const w = (c.width = c.clientWidth * devicePixelRatio);
        const h = (c.height = c.clientHeight * devicePixelRatio);
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, 0, w, h);
        for (const s of strokes.current.values()) {
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 5 * devicePixelRatio;
          ctx.lineCap = "round";
          ctx.beginPath();
          s.points.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)));
          ctx.stroke();
        }
        for (const p of playersRef.current) {
          const snap = ctl.snapshots.current.get(p.id);
          const d = dots.current.get(p.id) ?? { x: 0.5, y: 0.5, pulse: 0 };
          if (snap) {
            const v = { x: snap.joystick.x + snap.tilt.x, y: snap.joystick.y + snap.tilt.y };
            d.x = Math.max(0.03, Math.min(0.97, d.x + v.x * dt * 0.5));
            d.y = Math.max(0.03, Math.min(0.97, d.y + v.y * dt * 0.5));
            d.pulse = snap.buttons.a ? Math.min(1, d.pulse + dt * 6) : Math.max(0, d.pulse - dt * 3);
          }
          dots.current.set(p.id, d);
          const r = (18 + d.pulse * 30) * devicePixelRatio;
          ctx.fillStyle = String(p.meta?.color ?? "#fff");
          ctx.beginPath();
          ctx.arc(d.x * w, d.y * h, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#e2e8f0";
          ctx.font = `${13 * devicePixelRatio}px system-ui`;
          ctx.textAlign = "center";
          ctx.fillText(p.name, d.x * w, d.y * h + r + 16 * devicePixelRatio);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const t = setInterval(() => force((n) => n + 1), 500); // reîmprospătează voturile
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, [ctl.snapshots]);

  const screen = ctl.screen;
  const votes = screen.layout === "choices" ? tally(ctl.snapshots.current.values(), screen.choices.length) : [];
  const totalVotes = votes.reduce((a, b) => a + b, 0);

  function choose(l: (typeof LAYOUTS)[number]) {
    const next: ScreenState = { layout: l.layout, prompt: l.prompt, choices: l.choices ?? [] };
    if (l.layout === "draw") strokes.current.clear();
    ctl.setScreen(next);
  }

  return (
    <div>
      <PageHeader title="Telefonul ca controller" description="Juriul și publicul scanează QR-ul. Telefonul lor devine joystick, volan, pad de desen, buton de vot sau tastatură.">
        <div className="flex gap-2">
          <Pill ok={ctl.room.connected}>{ctl.controllers.length} telefoane</Pill>
          <Pill ok={ctl.room.transport === "supabase"}>{ctl.room.transport === "supabase" ? "Supabase" : "local (tab-uri)"}</Pill>
        </div>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        {LAYOUTS.map((l) => (
          <Button key={l.layout} variant={screen.layout === l.layout ? "primary" : "secondary"} onClick={() => choose(l)}>
            {l.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-4">
          <canvas ref={arenaRef} className="aspect-video w-full rounded-2xl" data-testid="arena" />
          {screen.layout === "choices" && (
            <Card title={screen.prompt}>
              <div className="space-y-2">
                {screen.choices.map((c, i) => (
                  <div key={c}>
                    <div className="flex justify-between text-sm">
                      <span>{c}</span>
                      <span className="font-mono">{votes[i]}</span>
                    </div>
                    <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-accent transition-all" style={{ width: `${totalVotes ? (votes[i] / totalVotes) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {screen.layout === "text" && (
            <Card title="Mesaje">
              <ul className="space-y-2">
                {messages.map((m, i) => (
                  <li key={i} className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm">
                    <b>{m.from}:</b> {m.text}
                  </li>
                ))}
                {!messages.length && <li className="text-sm text-slate-500">Niciun mesaj încă.</li>}
              </ul>
            </Card>
          )}
        </div>
        <Card>
          <QrPanel url={roomJoinUrl(code, "/controller")} label="Scanează ca să joci" />
          <p className="mt-3 text-xs text-slate-400">
            Telefoanele au nevoie de Supabase (sau deschide linkul în alt tab ca să testezi). Înclinarea pe iPhone cere HTTPS. În cod: <Code>useControllers()</Code>.
          </p>
        </Card>
      </div>
    </div>
  );
}
