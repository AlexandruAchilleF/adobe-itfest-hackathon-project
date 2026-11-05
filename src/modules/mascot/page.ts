// Ce știe mascota despre pagina curentă: acțiunile pe care le poate face pentru utilizator,
// contextul (ce e pe ecran) și pașii turului ghidat. Fiecare pagină le declară o dată:
//
//   useMascotPage({
//     actions: [defineAction({ name: "ask", ... })],
//     context: () => `Document încărcat: ${doc?.name ?? "niciunul"}`,
//     tour: [{ target: "upload", text: "Încarcă aici documentul." }, ...],
//   });
//
// În JSX, elementele din tur primesc data-tour="upload".

import { useEffect, useRef } from "react";
import type { AgentAction } from "../../lib/agent";

export interface TourStep {
  /** valoarea atributului data-tour al elementului arătat */
  target: string;
  /** ce spune mascota la pasul ăsta */
  text: string;
}

export interface MascotPage {
  title?: string;
  actions?: AgentAction[];
  context?: () => string;
  tour?: TourStep[];
}

type Listener = (p: MascotPage | null) => void;
let current: MascotPage | null = null;
const listeners = new Set<Listener>();

export const mascotPage = {
  get: () => current,
  set(p: MascotPage | null) {
    current = p;
    listeners.forEach((l) => l(current));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

/** Hook pentru pagini: înregistrează acțiunile/turul cât timp pagina e deschisă. */
export function useMascotPage(page: MascotPage) {
  // ținem mereu ultima versiune (acțiunile folosesc starea paginii), dar înregistrăm o singură dată
  const ref = useRef(page);
  ref.current = page;
  useEffect(() => {
    const proxy: MascotPage = {
      get title() {
        return ref.current.title;
      },
      get actions() {
        return ref.current.actions;
      },
      context: () => ref.current.context?.() ?? "",
      get tour() {
        return ref.current.tour;
      },
    };
    mascotPage.set(proxy);
    return () => {
      if (mascotPage.get() === proxy) mascotPage.set(null);
    };
  }, []);
}

// ── Turul ghidat (logică pură) ──
export interface TourState {
  steps: TourStep[];
  index: number;
}

export function tourReducer(state: TourState | null, event: { type: "start"; steps: TourStep[] } | { type: "next" } | { type: "prev" } | { type: "stop" }): TourState | null {
  switch (event.type) {
    case "start":
      return event.steps.length ? { steps: event.steps, index: 0 } : null;
    case "next":
      if (!state) return null;
      return state.index + 1 < state.steps.length ? { ...state, index: state.index + 1 } : null;
    case "prev":
      return state ? { ...state, index: Math.max(0, state.index - 1) } : null;
    case "stop":
      return null;
  }
}

// ── Navigare în limbaj natural ──
export interface Route {
  href: string;
  label: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");

/** „du-mă la hartă" → /map. Potrivire după cuvintele din eticheta paginii (fără diacritice). */
export function matchRoute(input: string, routes: Route[]): Route | null {
  const words = new Set(norm(input).split(/\s+/).filter((w) => w.length > 2));
  let best: Route | null = null;
  let score = 0;
  for (const r of routes) {
    const s = norm(r.label)
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .filter((w) => [...words].some((x) => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))).length;
    if (s > score) [best, score] = [r, s];
  }
  return best;
}
