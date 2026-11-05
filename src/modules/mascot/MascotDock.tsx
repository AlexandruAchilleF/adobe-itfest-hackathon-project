// Țepi în colțul ecranului: îi vorbești sau îi scrii și face lucruri în aplicație pentru tine
// (folosind acțiunile declarate de pagina curentă cu useMascotPage), cere aprobarea înainte de
// modificări și prezintă aplicația printr-un tur ghidat. Generic: merge pe orice pagină nouă.
//
// La pitch: deschideți pagina cu ?tour=1 și Țepi pornește singur turul.

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { z } from "zod";
import { ConfirmActions } from "../../components/ConfirmActions";
import { type AgentAction, defineAction } from "../../lib/agent";
import { useVoiceAgent } from "../../lib/useVoiceAgent";
import { MASCOT_NAME, MascotFigure } from "./Mascot";
import { mascot, type MascotState } from "./mascot";
import { type MascotPage, mascotPage, matchRoute, type Route, tourReducer } from "./page";

const HIGHLIGHT = "mascot-highlight";

export function MascotDock({ routes }: { routes: Route[] }) {
  const [state, setState] = useState<MascotState>(mascot.get());
  const [page, setPage] = useState<MascotPage | null>(mascotPage.get());
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [text, setText] = useState("");
  const [tour, dispatch] = useReducer(tourReducer, null);
  const tourRef = useRef(page?.tour);
  tourRef.current = page?.tour;

  useEffect(() => mascot.subscribe(setState), []);
  useEffect(() => mascotPage.subscribe(setPage), []);
  useEffect(() => {
    const t = setInterval(() => mascot.tick(), 500);
    return () => clearInterval(t);
  }, []);

  // acțiuni globale (merg pe orice pagină) + acțiunile paginii curente
  const globalActions = useMemo<AgentAction[]>(() => {
    const hrefs = routes.map((r) => r.href) as [string, ...string[]];
    return [
      defineAction({
        name: "go_to_page",
        kind: "read",
        description: `Deschide o pagină a aplicației: ${routes.map((r) => `${r.href} (${r.label})`).join(", ")}`,
        args: z.object({ page: z.enum(hrefs) }),
        run: ({ page: href }) => navigate(href),
        examples: routes.map((r) => `du-mă la ${r.label.toLowerCase()}`),
        mockArgs: (input: string) => ({ page: matchRoute(input, routes)?.href ?? "/" }),
      }),
      defineAction({
        name: "start_tour",
        kind: "read",
        description: "Arată utilizatorului, pas cu pas, cum se folosește pagina curentă",
        args: z.object({}),
        run: () => {
          if (tourRef.current?.length) dispatch({ type: "start", steps: tourRef.current });
          else throw new Error("pagina asta nu are un tur");
        },
        examples: ["arată-mi cum merge", "ce pot face aici", "ajută-mă", "tur"],
        mockArgs: {},
      }),
    ];
  }, [routes]);

  const agent = useVoiceAgent({
    actions: [...globalActions, ...(page?.actions ?? [])],
    persona: `Ești ${MASCOT_NAME}, un arici prietenos care ajută utilizatorul să folosească aplicația. Răspunzi scurt și cald, în română. Pagina curentă: ${page?.title ?? "pagina de start"}.`,
    context: () => page?.context?.() ?? "",
  });

  // ascultă cât e pornit microfonul
  useEffect(() => {
    if (agent.listening) mascot.set("listening");
    else if (mascot.get().mood === "listening") mascot.set("idle");
  }, [agent.listening]);

  // ce a răspuns (sau ce n-a mers)
  useEffect(() => {
    const last = agent.log.at(-1);
    if (!last) return;
    const failed = last.actions.filter((a) => !a.ok && a.error !== "respinsă de utilizator");
    if (failed.length) mascot.say(`N-am reușit: ${failed[0].error}`, "worried");
    else mascot.say(last.say.replace(/^\(demo\)\s*/, ""), last.actions.some((a) => a.ok) ? "happy" : "idle");
  }, [agent.log]);

  // turul: evidențiază elementul pasului curent
  useEffect(() => {
    document.querySelectorAll(`.${HIGHLIGHT}`).forEach((el) => el.classList.remove(HIGHLIGHT));
    if (!tour) return;
    const step = tour.steps[tour.index];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.classList.add(HIGHLIGHT);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    mascot.set(tour.index === tour.steps.length - 1 ? "happy" : "idle");
  }, [tour]);

  // ?tour=1 → pornește turul singur (pentru pitch)
  useEffect(() => {
    if (!page?.tour?.length) return;
    if (new URLSearchParams(location.search).get("tour") === "1") dispatch({ type: "start", steps: page.tour });
  }, [page]);

  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} className="fixed bottom-4 right-4 z-[1200] rounded-full bg-slate-800 px-3 py-2 text-xs text-slate-300 print:hidden">
        🦔 {MASCOT_NAME}
      </button>
    );
  }

  const step = tour ? tour.steps[tour.index] : null;
  const suggestions = [...(page?.actions ?? []), ...globalActions].flatMap((a) => a.examples?.slice(0, 1) ?? []).slice(0, 3);

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[1200] flex max-w-[calc(100vw-24px)] items-end gap-1 print:hidden" data-testid="mascot" data-mood={state.mood}>
      {/* doar bulele și ariciul primesc click-uri; restul zonei lasă click-ul să treacă la pagină */}
      <div className="mb-14 flex w-[300px] max-w-full flex-col gap-2 [&>*]:pointer-events-auto">
        {/* turul ghidat */}
        {step && tour && (
          <div className="rounded-2xl rounded-br-sm bg-white p-3 text-sm text-slate-900 shadow-xl" role="dialog" aria-label="Tur ghidat" data-testid="mascot-tour">
            <b className="block text-xs text-slate-500">
              {MASCOT_NAME} · pasul {tour.index + 1} din {tour.steps.length}
            </b>
            <p className="mt-1">{step.text}</p>
            <div className="mt-2 flex gap-2">
              <button className="rounded-lg bg-slate-200 px-2 py-1 text-xs" onClick={() => dispatch({ type: "prev" })} disabled={tour.index === 0}>
                Înapoi
              </button>
              <button className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold" onClick={() => dispatch({ type: "next" })}>
                {tour.index === tour.steps.length - 1 ? "Gata" : "Mai departe"}
              </button>
              <button className="ml-auto text-xs text-slate-500 underline" onClick={() => dispatch({ type: "stop" })}>
                Închide
              </button>
            </div>
          </div>
        )}

        {/* mesajul curent */}
        {!step && state.message && !open && (
          <div className="self-end rounded-2xl rounded-br-sm bg-white px-3 py-2 text-sm text-slate-900 shadow-xl" role="status" aria-live="polite">
            <b className="block text-xs text-slate-500">{MASCOT_NAME}</b>
            {state.message}
          </div>
        )}

        {/* panoul de conversație */}
        {open && !step && (
          <div className="rounded-2xl rounded-br-sm bg-white p-3 text-sm text-slate-900 shadow-xl" role="dialog" aria-label={`Vorbește cu ${MASCOT_NAME}`}>
            <div className="flex items-center justify-between">
              <b className="text-xs text-slate-500">{MASCOT_NAME}</b>
              <button className="text-xs text-slate-400" onClick={() => setHidden(true)} title="Ascunde mascota">
                ascunde
              </button>
            </div>
            <p className="mt-1" role="status" aria-live="polite">
              {state.message ?? "Spune-mi ce vrei să faci și te ajut, sau te plimb prin pagină."}
            </p>
            {agent.pending && (
              <div className="mt-2">
                <ConfirmActions pending={agent.pending} />
              </div>
            )}
            <form
              className="mt-2 flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                void agent.send(text);
                setText("");
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ex: arată-mi cum merge"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1"
                aria-label={`Mesaj pentru ${MASCOT_NAME}`}
              />
              <button type="button" onClick={agent.listening ? agent.stopListening : agent.listen} disabled={!agent.supported} className="rounded-lg bg-slate-200 px-2" title="Vorbește">
                {agent.listening ? "■" : "🎤"}
              </button>
              <button type="submit" disabled={!text.trim() || agent.thinking} className="rounded-lg bg-amber-400 px-2 font-semibold">
                ↵
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {page?.tour?.length ? (
                <button className="rounded-full bg-amber-100 px-2 py-0.5 text-xs" onClick={() => dispatch({ type: "start", steps: page.tour! })}>
                  ▶ Arată-mi cum merge
                </button>
              ) : null}
              {suggestions.map((s) => (
                <button key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs" onClick={() => void agent.send(s)}>
                  „{s}”
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        className="pointer-events-auto"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? `Închide conversația cu ${MASCOT_NAME}` : `Vorbește cu ${MASCOT_NAME}`}
        aria-expanded={open}
      >
        <MascotFigure mood={state.mood} />
      </button>
    </div>
  );
}
