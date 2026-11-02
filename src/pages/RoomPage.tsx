// Demo multiplayer: cameră cu cod + QR, listă de jucători, buzzer comun și reacții.
// Fără Supabase: deschide pagina în 2 tab-uri ca să testezi.

import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { Button, Card, Code, PageHeader, Pill } from "../components/ui";
import { QrPanel } from "../components/QrPanel";
import { randomRoomCode, roomJoinUrl, useRoom } from "../modules/rooms/useRoom";

interface GameState {
  round: number;
  buzzedBy: string | null;
  scores: Record<string, number>;
}

export function RoomPage() {
  const search = useSearch();
  const initialCode = new URLSearchParams(search).get("code")?.toUpperCase() ?? null;
  const [code, setCode] = useState<string | null>(initialCode);
  const [input, setInput] = useState("");
  const [name, setName] = useState(() => `Jucător-${Math.floor(Math.random() * 90 + 10)}`);

  if (!code) {
    return (
      <div>
        <PageHeader title="Multiplayer" description="Toată sala intră de pe telefon prin QR. Creează o cameră sau intră cu un cod." />
        <Card className="max-w-md">
          <label className="block text-sm text-slate-400">
            Numele tău
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" onClick={() => setCode(randomRoomCode())}>
              Creează cameră
            </Button>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="COD"
              maxLength={6}
              className="w-28 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono tracking-widest"
            />
            <Button onClick={() => input && setCode(input)}>Intră</Button>
          </div>
        </Card>
      </div>
    );
  }
  return <Room code={code} name={name} onLeave={() => setCode(null)} />;
}

function Room({ code, name, onLeave }: { code: string; name: string; onLeave: () => void }) {
  const room = useRoom<GameState>(code, { name, initialState: { round: 1, buzzedBy: null, scores: {} } });
  const [reactions, setReactions] = useState<Array<{ id: number; emoji: string; x: number }>>([]);

  useEffect(
    () =>
      room.on("react", (data) => {
        const id = Math.random();
        setReactions((r) => [...r, { id, emoji: String(data), x: Math.random() * 80 + 10 }]);
        setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2000);
      }),
    [room.on],
  );

  const state = room.state!;
  const buzzerName = room.players.find((p) => p.id === state.buzzedBy)?.name;

  function buzz() {
    if (state.buzzedBy) return;
    room.setState((s) => ({ ...s, buzzedBy: room.me.id, scores: { ...s.scores, [room.me.id]: (s.scores[room.me.id] ?? 0) + 1 } }));
  }
  function react(emoji: string) {
    room.send("react", emoji);
    const id = Math.random();
    setReactions((r) => [...r, { id, emoji, x: Math.random() * 80 + 10 }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2000);
  }

  return (
    <div className="relative">
      <PageHeader title={`Camera ${code}`} description="Primul intrat e host-ul. Starea (runda, buzzer, scor) e comună pentru toți.">
        <div className="flex items-center gap-2">
          <Pill ok={room.connected}>{room.connected ? "conectat" : "se conectează…"}</Pill>
          <Pill ok={room.transport === "supabase"}>{room.transport === "supabase" ? "Supabase Realtime" : "local (tab-uri)"}</Pill>
          <Button variant="ghost" onClick={onLeave}>
            Ieși
          </Button>
        </div>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card title={`Runda ${state.round}`}>
            <button
              onClick={buzz}
              disabled={Boolean(state.buzzedBy)}
              className={`h-40 w-full rounded-2xl text-2xl font-bold transition ${state.buzzedBy ? "bg-slate-800 text-slate-300" : "bg-rose-600 text-white hover:scale-[1.01] active:scale-95"}`}
            >
              {state.buzzedBy ? `🔔 ${buzzerName ?? "cineva"} a fost primul!` : "APASĂ!"}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {room.isHost && (
                <Button variant="primary" onClick={() => room.setState((s) => ({ ...s, round: s.round + 1, buzzedBy: null }))}>
                  Runda următoare (host)
                </Button>
              )}
              {["👏", "🔥", "😂", "🤯"].map((e) => (
                <Button key={e} onClick={() => react(e)}>
                  {e}
                </Button>
              ))}
            </div>
          </Card>
          <Card title={`Jucători (${room.players.length})`}>
            <ul className="space-y-1">
              {room.players.map((p, i) => (
                <li key={p.id} className="flex justify-between rounded-lg bg-slate-800/60 px-3 py-2 text-sm">
                  <span>
                    {p.name} {p.id === room.me.id && <span className="text-slate-500">(tu)</span>} {i === 0 && "👑"}
                  </span>
                  <span className="font-mono">{state.scores[p.id] ?? 0}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-slate-400">
              În cod: <Code>room.setState(...)</Code>, <Code>room.send("tip", date)</Code>, <Code>room.on("tip", fn)</Code>.
            </p>
          </Card>
        </div>
        <Card>
          <QrPanel url={roomJoinUrl(code)} label="Intră de pe telefon" />
          {room.transport === "local" && (
            <p className="mt-3 text-xs text-amber-300/80">Fără Supabase, doar tab-urile din acest browser se văd între ele.</p>
          )}
        </Card>
      </div>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {reactions.map((r) => (
          <span key={r.id} className="absolute bottom-0 animate-[float_2s_ease-out_forwards] text-5xl" style={{ left: `${r.x}%` }}>
            {r.emoji}
          </span>
        ))}
      </div>
      <style>{`@keyframes float { from { transform: translateY(0); opacity: 1 } to { transform: translateY(-70vh); opacity: 0 } }`}</style>
    </div>
  );
}
