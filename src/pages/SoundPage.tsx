// Microfonul ca senzor: bătăi din palme, notă cântată, volum, benzi de frecvență.
import { useEffect, useRef, useState } from "react";
import { Button, Card, Code, ErrorNote, PageHeader } from "../components/ui";
import { useMic } from "../modules/audio/useMic";
import { connectSerial, type SerialConnection, serialSupported } from "../modules/hardware/serial";

export function SoundPage() {
  const [claps, setClaps] = useState(0);
  const [flash, setFlash] = useState(false);
  const mic = useMic({
    onClap: () => {
      setClaps((c) => c + 1);
      setFlash(true);
      setTimeout(() => setFlash(false), 120);
    },
  });
  const viz = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (mic.status !== "running") return;
    let raf = 0;
    const draw = () => {
      const c = viz.current;
      const f = mic.frameRef.current;
      if (c && f) {
        const w = (c.width = c.clientWidth);
        const h = (c.height = c.clientHeight);
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, w, h);
        const bins = 64;
        const step = Math.floor(f.spectrum.length / 2 / bins);
        for (let i = 0; i < bins; i++) {
          const v = f.spectrum[i * step] / 255;
          ctx.fillStyle = `hsl(${30 + i * 3} 90% ${45 + v * 20}%)`;
          ctx.fillRect((i * w) / bins, h - v * h, w / bins - 2, v * h);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [mic.status, mic.frameRef]);

  const f = mic.frame;
  return (
    <div>
      <PageHeader title="Sunet + hardware" description="Bate din palme, fluieră sau cântă. Sunetul devine input: ritm, notă, volum. Plus puntea către Arduino/ESP32.">
        <Button variant={mic.status === "running" ? "danger" : "primary"} onClick={mic.status === "running" ? mic.stop : mic.start}>
          {mic.status === "running" ? "■ Oprește microfonul" : "🎙️ Pornește microfonul"}
        </Button>
      </PageHeader>
      <ErrorNote error={mic.error} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Bătăi din palme" className={flash ? "border-accent" : ""}>
          <p className="text-5xl font-black">{claps}</p>
        </Card>
        <Card title="Notă">
          <p className="text-5xl font-black">{f?.note?.name ?? "–"}</p>
          <p className="text-sm text-slate-400">{f?.pitch ? `${Math.round(f.pitch)} Hz · ${f.note!.cents > 0 ? "+" : ""}${f.note!.cents} cenți` : "cântă sau fluieră"}</p>
        </Card>
        <Card title="Volum">
          <div className="h-4 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-accent" style={{ width: `${Math.min(100, (f?.level ?? 0) * 400)}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            bass {(f?.bands.bass ?? 0).toFixed(2)} · mid {(f?.bands.mid ?? 0).toFixed(2)} · treble {(f?.bands.treble ?? 0).toFixed(2)}
          </p>
        </Card>
      </div>
      <canvas ref={viz} className="mt-4 h-40 w-full rounded-2xl bg-slate-900/60" />
      <p className="mt-2 text-xs text-slate-500">
        În cod: <Code>useMic({"{ onClap, onFrame }"})</Code> — <Code>frame.note</Code>, <Code>frame.level</Code>, <Code>frame.bands</Code>.
      </p>
      <SerialCard />
    </div>
  );
}

function SerialCard() {
  const [conn, setConn] = useState<SerialConnection | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [cmd, setCmd] = useState("LED 255 0 0");
  const [error, setError] = useState<string | null>(null);
  return (
    <Card title="Hardware (Web Serial)" className="mt-6">
      <p className="mb-3 text-sm text-slate-400">
        Conectează un Arduino/ESP32 pe USB. Trimiți linii de text, primești linii înapoi. Merge în Chrome/Edge pe desktop. În cod: <Code>connectSerial()</Code>.
      </p>
      {!serialSupported() ? (
        <p className="text-sm text-amber-300">Browserul ăsta nu are Web Serial.</p>
      ) : conn ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void conn.writeLine(cmd);
          }}
        >
          <input value={cmd} onChange={(e) => setCmd(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm" />
          <Button type="submit">Trimite</Button>
          <Button variant="ghost" onClick={() => void conn.close().then(() => setConn(null))}>
            Deconectează
          </Button>
        </form>
      ) : (
        <Button
          onClick={async () => {
            try {
              const c = await connectSerial(115200);
              c.onLine((l) => setLines((x) => [l, ...x].slice(0, 10)));
              setConn(c);
              setError(null);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          🔌 Conectează placa
        </Button>
      )}
      <ErrorNote error={error} />
      {lines.length > 0 && <pre className="mt-3 rounded-xl bg-slate-950 p-3 font-mono text-xs">{lines.join("\n")}</pre>}
    </Card>
  );
}
