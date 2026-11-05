// Sincronizare live între telefoane și tab-uri, peste modulul rooms (Supabase Realtime sau
// BroadcastChannel ca rezervă). O singură cameră pe scenariu, deschisă o dată în App:
//  - după orice schimbare locală a unei colecții, trimite „changed”, iar ceilalți o reîncarcă
//    (datele rămân în store; prin cameră circulă doar semnalul)
//  - alte module (ex: rapoartele live) folosesc `useLive()` pentru mesajele lor

import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import { useRoom } from "../modules/rooms/useRoom";
import { scenario } from "../scenario/config";
import { refreshCollection, subscribeCollection } from "./store";

const CHANGED = "changed";

type Room = ReturnType<typeof useRoom>;
const LiveContext = createContext<Pick<Room, "send" | "on" | "connected" | "transport" | "players"> | null>(null);

export function LiveProvider({ collections, children }: { collections: string[]; children: ReactNode }) {
  const room = useRoom(`${scenario.id}-live`, { name: "app" });
  const suppress = useRef(false);
  const sendRef = useRef(room.send);
  sendRef.current = room.send;
  const key = collections.join("|");

  useEffect(() => {
    const offs = collections.map((name) =>
      subscribeCollection(name, () => {
        if (!suppress.current) sendRef.current(CHANGED, name);
      }),
    );
    return () => offs.forEach((off) => off());
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () =>
      room.on(CHANGED, (data) => {
        if (typeof data !== "string" || !collections.includes(data)) return;
        suppress.current = true;
        try {
          refreshCollection(data);
        } finally {
          suppress.current = false;
        }
      }),
    [room.on, key], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return <LiveContext.Provider value={{ send: room.send, on: room.on, connected: room.connected, transport: room.transport, players: room.players }}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLive() trebuie folosit în <LiveProvider> (vezi src/App.tsx).");
  return ctx;
}
