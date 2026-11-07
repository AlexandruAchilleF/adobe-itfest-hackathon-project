// Date persistente simple (CRUD) cu date de seed — forma câștigătorului ITFest (ResourceMe).
// Cu Supabase: tabela generică `records` (SQL în supabase/records.sql). Fără: localStorage în browser.
//
//   const requests = createCollection("cereri", RequestSchema, seed);
//   const { items, add, update, remove } = useCollection(requests);

import { useCallback, useEffect, useState } from "react";
import type { z } from "zod";
import { supabase } from "./supabase";

export interface Rec<T> {
  id: string;
  data: T;
  created_at: string;
}

export interface Backend {
  list(collection: string): Promise<Array<Rec<unknown>>>;
  insert(collection: string, data: unknown): Promise<Rec<unknown>>;
  update(collection: string, id: string, data: unknown): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();

/** Backend în memorie, cu persistență opțională (localStorage în browser). */
export function memoryBackend(storage?: Pick<Storage, "getItem" | "setItem">): Backend {
  const mem = new Map<string, Array<Rec<unknown>>>();
  // Cu storage, citim de fiecare dată din el: alt tab (alt rol în demo) poate fi scris între timp.
  const read = (c: string) => {
    if (storage || !mem.has(c)) {
      let rows: Array<Rec<unknown>> = [];
      try {
        rows = JSON.parse(storage?.getItem(`hackathon:db:${c}`) ?? "[]");
      } catch {
        rows = [];
      }
      mem.set(c, rows);
    }
    return mem.get(c)!;
  };
  const write = (c: string, rows: Array<Rec<unknown>>) => {
    mem.set(c, rows);
    try {
      storage?.setItem(`hackathon:db:${c}`, JSON.stringify(rows));
    } catch {
      /* storage plin sau blocat: rămâne în memorie */
    }
  };
  return {
    list: async (c) => [...read(c)],
    insert: async (c, data) => {
      const rec = { id: uid(), data, created_at: new Date().toISOString() };
      write(c, [...read(c), rec]);
      return rec;
    },
    update: async (c, id, data) => write(c, read(c).map((r) => (r.id === id ? { ...r, data } : r))),
    remove: async (c, id) => write(c, read(c).filter((r) => r.id !== id)),
  };
}

export function supabaseBackend(): Backend {
  const db = supabase!;
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(`Supabase: ${e.message}`);
  };
  return {
    list: async (c) => {
      const { data, error } = await db.from("records").select("id, data, created_at").eq("collection", c).order("created_at");
      fail(error);
      return (data ?? []) as Array<Rec<unknown>>;
    },
    insert: async (c, data) => {
      const { data: row, error } = await db.from("records").insert({ collection: c, data }).select("id, data, created_at").single();
      fail(error);
      return row as Rec<unknown>;
    },
    update: async (c, id, data) => fail((await db.from("records").update({ data }).eq("collection", c).eq("id", id)).error),
    remove: async (c, id) => fail((await db.from("records").delete().eq("collection", c).eq("id", id)).error),
  };
}

let defaultBackend: Backend | null = null;
export function getBackend(): Backend {
  defaultBackend ??= supabase ? supabaseBackend() : memoryBackend(typeof localStorage !== "undefined" ? localStorage : undefined);
  return defaultBackend;
}

export interface Collection<T> {
  name: string;
  list(): Promise<Array<Rec<T>>>;
  add(data: T): Promise<Rec<T>>;
  update(id: string, data: T): Promise<void>;
  remove(id: string): Promise<void>;
  /** șterge tot și pune înapoi datele de seed (pentru demo) */
  reset(): Promise<void>;
}

export function createCollection<T>(name: string, schema: z.ZodType<T>, seed: T[] = [], backend: Backend = getBackend()): Collection<T> {
  let seeded: Promise<void> | null = null;
  const ensureSeed = () =>
    (seeded ??= (async () => {
      const rows = await backend.list(name);
      if (rows.length === 0) for (const s of seed) await backend.insert(name, schema.parse(s));
    })().catch((err) => {
      // o cădere trecătoare nu rămâne definitivă: următoarea citire reîncearcă
      seeded = null;
      throw err;
    }));
  const listeners = collectionListeners(name);
  const changed = () => listeners.forEach((l) => l());
  return {
    name,
    list: async () => {
      await ensureSeed();
      const rows = await backend.list(name);
      // rânduri corupte sau dintr-o versiune veche a schemei sunt ignorate, nu crapă UI-ul
      return rows.flatMap((r) => {
        const parsed = schema.safeParse(r.data);
        return parsed.success ? [{ ...r, data: parsed.data }] : [];
      });
    },
    add: async (data) => {
      await ensureSeed();
      const rec = (await backend.insert(name, schema.parse(data))) as Rec<T>;
      changed();
      return rec;
    },
    update: async (id, data) => {
      await backend.update(name, id, schema.parse(data));
      changed();
    },
    remove: async (id) => {
      await backend.remove(name, id);
      changed();
    },
    reset: async () => {
      for (const r of await backend.list(name)) await backend.remove(name, r.id);
      seeded = null;
      await ensureSeed();
      changed();
    },
  };
}

const allListeners = new Map<string, Set<() => void>>();
function collectionListeners(name: string) {
  let set = allListeners.get(name);
  if (!set) allListeners.set(name, (set = new Set()));
  return set;
}

/** Ascultă schimbările unei colecții din tab-ul ăsta (folosit de src/lib/live.ts). */
export function subscribeCollection(name: string, listener: () => void): () => void {
  const set = collectionListeners(name);
  set.add(listener);
  return () => void set.delete(listener);
}

/** Cere reîncărcarea unei colecții (ex: alt telefon a schimbat-o). */
export function refreshCollection(name: string): void {
  collectionListeners(name).forEach((l) => l());
}

/** Hook React: lista se reîncarcă automat după add/update/remove din orice componentă. */
/** Ascultă revenirea în tab: alt tab sau panoul extensiei pot fi schimbat datele între timp. */
export function reloadWhenBack(target: Pick<EventTarget, "addEventListener" | "removeEventListener">, reload: () => void): () => void {
  const listener = () => reload();
  target.addEventListener("focus", listener);
  return () => target.removeEventListener("focus", listener);
}

export function useCollection<T>(collection: Collection<T>) {
  const [items, setItems] = useState<Array<Rec<T>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await collection.list());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    void reload();
    const listeners = collectionListeners(collection.name);
    const l = () => void reload();
    listeners.add(l);
    const stop = typeof window === "undefined" ? undefined : reloadWhenBack(window, l);
    return () => {
      listeners.delete(l);
      stop?.();
    };
  }, [collection, reload]);

  return { items, loading, error, reload, add: collection.add, update: collection.update, remove: collection.remove, reset: collection.reset };
}
