// Contor de utilizare pentru pitch: „47 de oameni au încercat azi".
// Cu Supabase: tabela `events` (SQL în README). Fără: se numără local, în browser.

import { supabase } from "../../lib/supabase";

const LOCAL_KEY = "hackathon:events";

export async function track(event: string, data: Record<string, unknown> = {}): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("events").insert({ event, data });
    if (!error) return;
    console.warn("[stats] insert Supabase eșuat, salvez local:", error.message);
  }
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as Array<{ event: string; at: number }>;
    list.push({ event, at: Date.now() });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(-5000)));
  } catch {
    /* storage indisponibil */
  }
}

/** Câte evenimente de un tip au avut loc de la `since` (implicit: azi). */
export async function countEvents(event: string, since = startOfToday()): Promise<number> {
  if (supabase) {
    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("event", event)
      .gte("created_at", new Date(since).toISOString());
    if (!error && count !== null) return count;
  }
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as Array<{ event: string; at: number }>;
    return list.filter((e) => e.event === event && e.at >= since).length;
  } catch {
    return 0;
  }
}

export function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
