// Camere multiplayer: cine e conectat, mesaje între jucători și o stare comună.
//
//   const room = useRoom<{ round: number }>("ABCD", { name: "Ana", initialState: { round: 1 } });
//   room.players          // lista jucătorilor (sortată după intrare)
//   room.isHost           // primul intrat e „host" și deține starea
//   room.setState(s => ({ round: s.round + 1 }))   // se propagă la toți
//   room.send("vote", { option: 2 });  room.on("vote", (data, from) => ...)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTransport, type Envelope, type Player, type Transport } from "./transport";

const STATE = "__state";
const STATE_REQUEST = "__state_request";

function myId(): string {
  try {
    let id = sessionStorage.getItem("hackathon:player-id");
    if (!id) {
      id = crypto.randomUUID().slice(0, 8);
      sessionStorage.setItem("hackathon:player-id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID().slice(0, 8);
  }
}

export function randomRoomCode(length = 4): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // fără I/O, ușor de citit
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (n) => alphabet[n % alphabet.length]).join("");
}

export function roomJoinUrl(code: string, path = "/room"): string {
  return `${location.origin}${path}?code=${encodeURIComponent(code)}`;
}

type Handler = (data: unknown, from: string) => void;

export function useRoom<S = Record<string, unknown>>(
  code: string | null,
  {
    name,
    initialState,
    meta,
    authority = false,
  }: {
    name: string;
    initialState?: S;
    meta?: Record<string, unknown>;
    /** true = clientul ăsta deține starea (ex: ecranul mare), chiar dacă n-a intrat primul */
    authority?: boolean;
  },
) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const [state, setLocalState] = useState<S | undefined>(initialState);
  const stateRef = useRef(state);
  const transportRef = useRef<Transport | null>(null);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const [kind, setKind] = useState<Transport["kind"] | null>(null);

  const me = useMemo<Player>(() => ({ id: myId(), name, joinedAt: Date.now(), meta }), []); // creat o singură dată pe montare
  const isHost = players.length > 0 && players[0].id === me.id;
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const authorityRef = useRef(authority);
  authorityRef.current = authority;

  useEffect(() => {
    if (!code) return;
    const t = createTransport(code, me);
    transportRef.current = t;
    setKind(t.kind);
    t.onStatus(setConnected);
    t.onPresence(setPlayers);
    t.onMessage((msg: Envelope) => {
      if (msg.type === STATE) {
        stateRef.current = msg.data as S;
        setLocalState(msg.data as S);
        return;
      }
      if (msg.type === STATE_REQUEST) {
        if ((isHostRef.current || authorityRef.current) && stateRef.current !== undefined) t.send({ type: STATE, data: stateRef.current, from: me.id });
        return;
      }
      handlers.current.get(msg.type)?.forEach((h) => h(msg.data, msg.from));
      handlers.current.get("*")?.forEach((h) => h(msg, msg.from));
    });
    // cere starea curentă de la host după ce ne conectăm
    const ask = setTimeout(() => t.send({ type: STATE_REQUEST, data: null, from: me.id }), 800);
    return () => {
      clearTimeout(ask);
      t.close();
      transportRef.current = null;
      setConnected(false);
      setPlayers([]);
    };
  }, [code, me]);

  // actualizează numele/meta în presence
  useEffect(() => {
    transportRef.current?.updatePresence({ ...me, name, meta });
  }, [name, meta, me]);

  const send = useCallback(
    (type: string, data: unknown = null) => transportRef.current?.send({ type, data, from: me.id }),
    [me.id],
  );

  /** Abonare la un tip de mesaj; returnează funcția de dezabonare. "*" = toate. */
  const on = useCallback((type: string, handler: Handler) => {
    let set = handlers.current.get(type);
    if (!set) handlers.current.set(type, (set = new Set()));
    set.add(handler);
    return () => void set!.delete(handler);
  }, []);

  /** Schimbă starea comună și o trimite tuturor (last-write-wins). */
  const setState = useCallback(
    (next: S | ((prev: S) => S)) => {
      const value = typeof next === "function" ? (next as (p: S) => S)(stateRef.current as S) : next;
      stateRef.current = value;
      setLocalState(value);
      transportRef.current?.send({ type: STATE, data: value, from: me.id });
    },
    [me.id],
  );

  return { me, players, isHost, connected, transport: kind, state, setState, send, on };
}
