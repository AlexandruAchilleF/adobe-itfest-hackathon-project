// Uli (uliul) în colțul ecranului: îi vorbești sau îi scrii și face lucruri în aplicație pentru tine
// (folosind acțiunile declarate de pagina curentă cu useMascotPage), cere aprobarea înainte de
// modificări și prezintă aplicația printr-un tur ghidat. Generic: merge pe orice pagină nouă.
//
// La pitch: deschideți pagina cu ?tour=1 și Uli pornește singur turul.

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import { z } from "zod";
import { ConfirmActions } from "../../components/ConfirmActions";
import { MicIcon } from "../../components/ui";
import { type AgentAction, defineAction } from "../../lib/agent";
import { useVoiceAgent } from "../../lib/useVoiceAgent";
import { scenario } from "../../scenario/config";
import { MASCOT_NAME, MascotFigure } from "./MascotFigure";
import { mascot, type MascotState } from "./mascot";
import { type MascotPage, mascotPage, matchRoute, type Route, tourReducer } from "./page";

const HIGHLIGHT = "mascot-highlight";
const CHARACTER = Boolean(scenario.mascot.character);
/** Mic, ca să nu acopere conținutul din colț. */
const DOCK_SIZE = 56;

/** Asistentul fără personaj: un buton rotund; starea (ascultă, se gândește, a găsit o problemă) e un punct colorat. */
function AssistantButton({ mood, open }: { mood: MascotState["mood"]; open: boolean }) {
  const dot = mood === "worried" ? "bg-warn-dot" : mood === "thinking" || mood === "listening" ? "animate-pulse bg-coral-bright" : mood === "happy" || mood === "celebrate" ? "bg-[#3f9d64]" : "";
  return (
    <span className="relative grid h-10 w-10 place-items-center rounded-full bg-ink text-white shadow-[0_10px_24px_-10px_rgb(27_35_80/0.6)] transition hover:bg-[#262e5c]">
      {open ? (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v6.5A1.5 1.5 0 0 1 16 14H9l-3.5 3v-3H4a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 4 4.5Z" strokeLinejoin="round" />
        </svg>
      )}
      {dot && <span className={`absolute top-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${dot}`} aria-hidden />}
    </span>
  );
}

export function MascotDock({ routes }: { routes: Route[] }) {
  const [state, setState] = useState<MascotState>(mascot.get());
  const [page, setPage] = useState<MascotPage | null>(mascotPage.get());
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [text, setText] = useState("");
  const [tour, dispatch] = useReducer(tourReducer, null);
  // turul se poate opri din scenariu (scenario.mascot.tour)
  const pageTour = scenario.mascot.tour ? page?.tour : undefined;
  const tourRef = useRef(pageTour);
  tourRef.current = pageTour;

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
    persona: `Ești ${MASCOT_NAME}, ${scenario.mascot.persona}, în aplicația „${scenario.app.name}”. Ajuți utilizatorul să o folosească. Răspunzi scurt și cald, în română. Pagina curentă: ${page?.title ?? "pagina de start"}.`,
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
    if (!pageTour?.length) return;
    if (new URLSearchParams(location.search).get("tour") === "1") dispatch({ type: "start", steps: pageTour });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (hidden) {
    return (
      <button onClick={() => setHidden(false)} className="fixed bottom-4 right-4 z-[1200] rounded-full bg-ink px-3 py-2 text-xs text-white print:hidden">
        {MASCOT_NAME}
      </button>
    );
  }

  const step = tour ? tour.steps[tour.index] : null;
  const suggestions = [...(page?.actions ?? []), ...globalActions].flatMap((a) => a.examples?.slice(0, 1) ?? []).slice(0, 3);

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[1200] flex max-w-[calc(100vw-24px)] items-end gap-1 print:hidden" data-testid="mascot" data-mood={state.mood}>
      {/* doar bulele și uliul primesc click-uri; restul zonei lasă click-ul să treacă la pagină */}
      <div className="mb-12 flex w-[300px] max-w-full flex-col gap-2 [&>*]:pointer-events-auto">
        {/* turul ghidat */}
        {step && tour && (
          <div className="rounded-xl bg-card text-sm text-ink shadow-[0_12px_32px_-14px_rgb(27_35_80/0.35)] ring-1 ring-line p-4" role="dialog" aria-label="Tur ghidat" data-testid="mascot-tour">
            <b className="block text-xs font-medium text-muted">
              {MASCOT_NAME} · pasul {tour.index + 1} din {tour.steps.length}
            </b>
            <p className="mt-1">{step.text}</p>
            <div className="mt-2 flex gap-2">
              <button className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => dispatch({ type: "prev" })} disabled={tour.index === 0}>
                Înapoi
              </button>
              <button className="btn btn-primary !px-3 !py-1 text-xs" onClick={() => dispatch({ type: "next" })}>
                {tour.index === tour.steps.length - 1 ? "Gata" : "Mai departe"}
              </button>
              <button className="ml-auto text-xs text-muted underline" onClick={() => dispatch({ type: "stop" })}>
                Închide
              </button>
            </div>
          </div>
        )}

        {/* mesajul curent */}
        {!step && state.message && !open && (
          <div className="self-end rounded-[22px] rounded-br-md bg-card text-sm text-ink shadow-[0_0_0_5px_rgb(255_255_255/0.6),0_18px_40px_-20px_rgb(28_26_94/0.35)] ring-1 ring-line px-4 py-3" role="status" aria-live="polite">
            <b className="block text-xs font-medium text-muted">{MASCOT_NAME}</b>
            {state.message}
          </div>
        )}

        {/* panoul de conversație */}
        {open && !step && (
          <div className="rounded-xl bg-card text-sm text-ink shadow-[0_12px_32px_-14px_rgb(27_35_80/0.35)] ring-1 ring-line p-4" role="dialog" aria-label={`Vorbește cu ${MASCOT_NAME}`}>
            <div className="flex items-center justify-between">
              <b className="text-xs font-medium text-muted">{MASCOT_NAME}</b>
              <button className="text-xs text-muted hover:text-ink" onClick={() => setHidden(true)} title="Ascunde asistentul">
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
                className="min-w-0 flex-1 px-2.5 py-1.5"
                aria-label={`Mesaj pentru ${MASCOT_NAME}`}
              />
              <button type="button" onClick={agent.listening ? agent.stopListening : agent.listen} disabled={!agent.supported} className="grid w-9 place-items-center rounded-xl bg-paper-2 text-ink ring-1 ring-line" title="Vorbește">
                <MicIcon on={agent.listening} />
              </button>
              <button type="submit" disabled={!text.trim() || agent.thinking} className="grid w-9 place-items-center rounded-xl bg-coral font-semibold text-white">
                ↵
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {pageTour?.length ? (
                <button className="rounded-md bg-paper-2 px-2.5 py-1 text-xs font-medium text-ink" onClick={() => dispatch({ type: "start", steps: pageTour })}>
                  Arată-mi cum merge
                </button>
              ) : null}
              {suggestions.map((s) => (
                <button key={s} className="rounded-md bg-paper-2 px-2 py-1 text-xs text-ink-2 hover:text-ink" onClick={() => void agent.send(s)}>
                  „{s}”
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        className="pointer-events-auto rounded-full"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? `Închide conversația cu ${MASCOT_NAME}` : `Vorbește cu ${MASCOT_NAME}`}
        aria-expanded={open}
      >
        {CHARACTER ? <MascotFigure mood={state.mood} size={DOCK_SIZE} /> : <AssistantButton mood={state.mood} open={open} />}
      </button>
    </div>
  );
}
