// Două implementări cu aceeași interfață:
//  - Supabase Realtime (telefoane diferite, prin internet)
//  - BroadcastChannel (fallback: tab-uri din același browser — perfect pentru testat fără cont)

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

export interface Player {
  id: string;
  name: string;
  joinedAt: number;
  /** câmpuri extra (avatar, echipă, scor...) */
  meta?: Record<string, unknown>;
}

export interface Envelope {
  type: string;
  data: unknown;
  from: string;
}

export interface Transport {
  kind: "supabase" | "local";
  send(msg: Envelope): void;
  onMessage(cb: (msg: Envelope) => void): void;
  onPresence(cb: (players: Player[]) => void): void;
  onStatus(cb: (connected: boolean) => void): void;
  updatePresence(me: Player): void;
  close(): void;
}

export function createTransport(room: string, me: Player): Transport {
  return supabase ? supabaseTransport(room, me) : localTransport(room, me);
}

function supabaseTransport(room: string, me: Player): Transport {
  const client = supabase!;
  let msgCb: (m: Envelope) => void = () => {};
  let presenceCb: (p: Player[]) => void = () => {};
  let statusCb: (c: boolean) => void = () => {};
  let current = me;

  const channel: RealtimeChannel = client.channel(`room:${room}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: me.id } },
  });
  channel
    .on("broadcast", { event: "msg" }, ({ payload }) => msgCb(payload as Envelope))
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Player>();
      const players = Object.values(state)
        .map((entries) => entries[0])
        .filter(Boolean)
        .map(({ id, name, joinedAt, meta }) => ({ id, name, joinedAt, meta }));
      presenceCb(players);
    })
    .subscribe((status) => {
      const ok = status === "SUBSCRIBED";
      statusCb(ok);
      if (ok) void channel.track(current);
    });

  return {
    kind: "supabase",
    send: (msg) => void channel.send({ type: "broadcast", event: "msg", payload: msg }),
    onMessage: (cb) => (msgCb = cb),
    onPresence: (cb) => (presenceCb = cb),
    onStatus: (cb) => (statusCb = cb),
    updatePresence: (p) => {
      current = p;
      void channel.track(p);
    },
    close: () => void client.removeChannel(channel),
  };
}

const HEARTBEAT_MS = 1500;
const TIMEOUT_MS = 4500;

function localTransport(room: string, me: Player): Transport {
  const bc = new BroadcastChannel(`room:${room}`);
  const seen = new Map<string, { player: Player; at: number }>();
  let current = me;
  let msgCb: (m: Envelope) => void = () => {};
  let presenceCb: (p: Player[]) => void = () => {};

  const emitPresence = () =>
    presenceCb([current, ...[...seen.values()].map((s) => s.player)].sort((a, b) => a.joinedAt - b.joinedAt));

  bc.onmessage = (e: MessageEvent) => {
    const m = e.data as { kind: string; player?: Player; msg?: Envelope };
    if (m.kind === "hello" && m.player) {
      const isNew = !seen.has(m.player.id);
      seen.set(m.player.id, { player: m.player, at: Date.now() });
      if (isNew) {
        bc.postMessage({ kind: "hello", player: current });
        emitPresence();
      }
    } else if (m.kind === "bye" && m.player) {
      seen.delete(m.player.id);
      emitPresence();
    } else if (m.kind === "msg" && m.msg) {
      msgCb(m.msg);
    }
  };

  const beat = setInterval(() => {
    bc.postMessage({ kind: "hello", player: current });
    const now = Date.now();
    let changed = false;
    for (const [id, s] of seen) {
      if (now - s.at > TIMEOUT_MS) {
        seen.delete(id);
        changed = true;
      }
    }
    if (changed) emitPresence();
  }, HEARTBEAT_MS);

  const bye = () => bc.postMessage({ kind: "bye", player: current });
  window.addEventListener("beforeunload", bye);
  bc.postMessage({ kind: "hello", player: current });

  return {
    kind: "local",
    send: (msg) => bc.postMessage({ kind: "msg", msg }),
    onMessage: (cb) => (msgCb = cb),
    onPresence: (cb) => {
      presenceCb = cb;
      emitPresence();
    },
    onStatus: (cb) => cb(true),
    updatePresence: (p) => {
      current = p;
      bc.postMessage({ kind: "hello", player: p });
      emitPresence();
    },
    close: () => {
      clearInterval(beat);
      window.removeEventListener("beforeunload", bye);
      bye();
      bc.close();
    },
  };
}
