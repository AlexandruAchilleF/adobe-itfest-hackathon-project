// Pagina de pe TELEFON (se deschide din QR). Ecranul mare decide ce controale apar.
import { useCallback, useState } from "react";
import { useSearch } from "wouter";
import { ActionButtons, Choices, DrawPad, Joystick, TextInput, TiltPad } from "../modules/controller/ControllerPads";
import { type ControllerInput, INPUT_EVENT, type ScreenState } from "../modules/controller/protocol";
import { useRoom } from "../modules/rooms/useRoom";

const COLORS = ["#f43f5e", "#f5a524", "#22c55e", "#38bdf8", "#a855f7", "#ec4899", "#14b8a6", "#eab308"];

export function ControllerPage() {
  const code = new URLSearchParams(useSearch()).get("code")?.toUpperCase() ?? null;
  const [name, setName] = useState("");
  const [joined, setJoined] = useState<string | null>(null);

  if (!code) return <p className="p-6 text-center text-slate-400">Lipsește codul camerei. Scanează QR-ul de pe ecran.</p>;
  if (!joined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Intri în camera {code}</h1>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Numele tău"
          className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-4 text-lg"
          maxLength={20}
        />
        <button onClick={() => setJoined(name.trim() || `Jucător ${Math.floor(Math.random() * 90 + 10)}`)} className="rounded-2xl bg-accent py-4 text-lg font-bold text-slate-950">
          Intră
        </button>
      </main>
    );
  }
  return <Controller code={code} name={joined} />;
}

function Controller({ code, name }: { code: string; name: string }) {
  const [color] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)]);
  const room = useRoom<ScreenState>(code, { name, meta: { role: "controller", color } });
  const send = useCallback((input: ControllerInput) => room.send(INPUT_EVENT, input), [room.send]);
  const screen = room.state;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md select-none flex-col items-center gap-6 px-5 py-6">
      <header className="flex w-full items-center justify-between text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: color }} /> {name}
        </span>
        <span>{room.connected ? `camera ${code}` : "se conectează…"}</span>
      </header>
      {screen?.prompt && <p className="text-center text-xl font-semibold">{screen.prompt}</p>}
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        {!screen && <p className="text-slate-400">Aștept ecranul…</p>}
        {screen?.layout === "gamepad" && (
          <>
            <Joystick send={send} />
            <ActionButtons send={send} />
          </>
        )}
        {screen?.layout === "tilt" && (
          <>
            <TiltPad send={send} />
            <ActionButtons send={send} />
          </>
        )}
        {screen?.layout === "draw" && <DrawPad send={send} color={color} />}
        {screen?.layout === "choices" && <Choices send={send} choices={screen.choices} />}
        {screen?.layout === "text" && <TextInput send={send} />}
      </div>
    </main>
  );
}
