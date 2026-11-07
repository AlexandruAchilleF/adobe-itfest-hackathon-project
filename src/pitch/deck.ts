// Pitch deck-ul (/pitch): slide-urile se construiesc din scenariul activ, deci după ce schimbați
// scenariul, deck-ul are deja numele, fraza, problema, rolurile și pașii. Ce nu e în scenariu
// (echipa, cerințele brief-ului, ce ați construit azi) se completează în PITCH, mai jos.
// Logică pură (testată în tests/pitch.test.ts); desenul e în src/pages/PitchPage.tsx.

import { happyPath } from "../lib/flow";
import type { Scenario } from "../scenario/types";

export interface Architecture {
  /** cine face pasul: se vede pe slide, pentru că asta e ideea arhitecturii */
  steps: Array<{ owner: "AI" | "cod" | "om"; title: string; text: string }>;
  /** bucla de agent, sub pași */
  loop: string;
  failures: Array<{ when: string; then: string }>;
}

export interface PitchConfig {
  /** „Ana · produs și interviuri”, câte unul pe rând */
  team: string[];
  /** apare pe prima slide, sub echipă */
  event: string;
  /** linkul din QR; gol = adresa de pe care rulează deck-ul (pe Vercel, adresa publică) */
  demoUrl: string;
  /** fiecare cerință din brief (docs/BRIEF.md) și momentul din demo în care se vede */
  brief: Array<{ need: string; where: string }>;
  /** cât de mare e problema dincolo de omul intervievat (ex: „1.200 de firme din București cu peste 20 de angajați”) */
  market: string;
  /** ce s-a scris azi, la hackathon (README.md, „Construit azi”) */
  builtToday: string[];
  /** ce urmează după hackathon (intenția de a construi mai departe e un criteriu Adobe) */
  next: string[];
  /** drumul prin sistem și ce se întâmplă când pică ceva; doar ce există în cod (docs/PITCH.md) */
  architecture?: Architecture;
  /** uliul de pază, desenat ca graf, pe copertă (src/pitch/HawkMark.tsx); false = copertă fără el */
  coverMark: boolean;
}

// ——— de completat mâine (docs/AMBALARE.md) ———
export const PITCH: PitchConfig = {
  team: [],
  event: "ITFest × Adobe · 7 noiembrie 2026",
  demoUrl: "",
  brief: [],
  market: "",
  builtToday: [],
  next: [],
  architecture: {
    steps: [
      { owner: "cod", title: "Extensia", text: "Citește pagina doar la clic, cu activeTab și scripting." },
      { owner: "AI", title: "Analiza", text: "Gemini scrie anatomia și textele, validate cu Zod." },
      { owner: "AI", title: "Ilustrația", text: "FLUX.2 pe Cloudflare, printr-un singur endpoint." },
      { owner: "cod", title: "Compunerea", text: "Designul pe straturi, din anatomie și marcă." },
      { owner: "cod", title: "Garda", text: "Preț, Delta E, dHash, contrast, mențiuni." },
      { owner: "om", title: "Omul", text: "Editează, vede garda din nou și descarcă." },
    ],
    loop: "Bucla de agent: ce pică reparabil la gardă se întoarce la AI, de cel mult două ori.",
    failures: [
      { when: "Gemini e supraîncărcat", then: "alt model, după 429, eroare de server sau 20 s" },
      { when: "Ilustrația pică", then: "mascota originală, iar garda o spune" },
      { when: "Fără cheie sau rețea", then: "mod demo, spus ca atare" },
    ],
  },
  coverMark: true,
};

export type Theme = "sky" | "cream" | "paper" | "night";

/** Un text care lipsește: pe slide apare ca o casetă punctată „De completat”, ca să nu scape la pitch. */
export interface Todo {
  todo: string;
}
export type Maybe<T> = T | Todo;
export const isTodo = (v: unknown): v is Todo => typeof v === "object" && v !== null && "todo" in v;
const orTodo = <T>(v: T | undefined | null | "", todo: string): Maybe<T> => (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ? { todo } : v);

export type Slide =
  | { kind: "cover"; theme: Theme; name: string; headline: string; tagline: string; notThis?: string; team: Maybe<string[]>; event: string; mark: boolean }
  | { kind: "problem"; theme: Theme; ribbon: string; problem: string; evidence: Maybe<string> }
  | { kind: "people"; theme: Theme; ribbon: string; title: string; roles: Array<{ label: string; pitch: string }> }
  | { kind: "how"; theme: Theme; ribbon: string; title: string; steps: Array<{ role: string; label: string; done: boolean }>; failed?: { role: string; label: string } }
  | { kind: "difference"; theme: Theme; ribbon: string; title: string; columns: Array<{ title: string; text: string }> }
  | { kind: "demo"; theme: Theme; title: string; text: string; url: string }
  | { kind: "architecture"; theme: Theme; ribbon: string; title: string; system: Maybe<Architecture> }
  | { kind: "payer"; theme: Theme; ribbon: string; payer: string; evidence: string[]; market: Maybe<string> }
  | { kind: "brief"; theme: Theme; ribbon: string; title: string; rows: Maybe<Array<{ need: string; where: string }>> }
  | { kind: "close"; theme: Theme; headline: string; tagline: string; builtToday: Maybe<string[]>; next: Maybe<string[]>; team: Maybe<string[]>; url: string };

/** Slide-urile, în ordinea pitch-ului de 3 minute (docs/PITCH.md: omul → durerea → diferența → demo → arhitectura → plătitorul → brief-ul). */
export function buildDeck(s: Scenario, p: PitchConfig, origin = ""): Slide[] {
  const roleLabel = (id: string) => s.roles[id]?.label ?? id;
  const path = happyPath(s.flow);
  const last = path[path.length - 1];
  const failed = s.flow.transitions.find((t) => t.outcome === "failed");
  const url = p.demoUrl || origin;
  const team = orTodo(p.team, "numele echipei și rolul fiecăruia (PITCH.team)");

  return [
    { kind: "cover", theme: "sky", name: s.app.name, headline: s.app.headline ?? s.app.name, tagline: s.app.tagline, notThis: s.app.notThis, team, event: p.event, mark: p.coverMark },
    {
      kind: "problem",
      theme: "cream",
      ribbon: "Problema",
      problem: s.business.problem,
      evidence: orTodo(s.business.evidence[0], "cifra spusă de un om real, cu numele lui (scenario.business.evidence)"),
    },
    {
      kind: "people",
      theme: "paper",
      ribbon: "Pentru cine",
      title: "Cine folosește aplicația",
      roles: [s.flow.requester, ...Object.keys(s.roles).filter((r) => r !== s.flow.requester)].map((id) => ({ label: s.roles[id].label, pitch: s.roles[id].pitch })),
    },
    {
      kind: "how",
      theme: "sky",
      ribbon: "Cum merge",
      title: "De la început până la confirmare",
      steps: path.map((t) => ({ role: roleLabel(t.role), label: t.label, done: t.outcome === "done" })),
      failed: failed ? { role: roleLabel(failed.role), label: failed.label } : undefined,
    },
    {
      kind: "difference",
      theme: "cream",
      ribbon: "De ce nu doar un chatbot",
      title: "AI-ul propune, *omul confirmă.*",
      columns: [
        { title: "AI-ul citește", text: s.documents?.enabled ? "Transformă poza sau textul documentului în câmpuri. Nu calculează nimic." : "Transformă ce scrie sau spune omul într-o cerere structurată. Nu decide nimic." },
        {
          title: "Codul verifică",
          text: s.documents?.enabled
            ? "Suma, codul fiscal, data, duplicatele și plafoanele: calculate, nu ghicite."
            : `Cine are voie la fiecare pas${s.features.map ? ", distanța" : ""}${s.features.gamification ? ", punctele" : ""}: calculate, nu ghicite.`,
        },
        {
          title: "Omul confirmă",
          text: last
            ? `Ultimul pas e al omului: „${last.label}” (${roleLabel(last.role).toLowerCase()}).${failed ? ` Când n-a mers: „${failed.label}”.` : ""}`
            : "Nicio modificare nu se face fără aprobarea omului.",
        },
      ],
    },
    {
      kind: "demo",
      theme: "night",
      title: "Încercați *voi.*",
      text: `Scanați codul cu telefonul și intrați ca ${roleLabel(s.flow.requester).toLowerCase()}.`,
      url,
    },
    {
      kind: "architecture",
      theme: "paper",
      ribbon: "Arhitectura",
      title: "AI-ul propune, *codul verifică,* omul aprobă.",
      system: orTodo(p.architecture, "drumul prin sistem și ce se întâmplă când pică ceva (PITCH.architecture)"),
    },
    {
      kind: "payer",
      theme: "cream",
      ribbon: "Cine plătește",
      payer: s.business.payer,
      evidence: s.business.evidence.slice(1),
      market: orTodo(p.market, "cât de mare e problema: câte organizații, cât plătesc azi (PITCH.market)"),
    },
    {
      kind: "brief",
      theme: "paper",
      ribbon: "Ce cere brief-ul",
      title: "Fiecare cerință, în demo",
      rows: orTodo(p.brief, "cerințele din docs/BRIEF.md și unde se văd în demo (PITCH.brief)"),
    },
    {
      kind: "close",
      theme: "sky",
      headline: s.app.headline ?? s.app.name,
      tagline: s.app.tagline,
      builtToday: orTodo(p.builtToday, "ce ați scris azi (PITCH.builtToday)"),
      next: orTodo(p.next, "ce urmează după hackathon (PITCH.next)"),
      team,
      url,
    },
  ];
}

/** Ce mai e de completat înainte de pitch, cu numele câmpului. */
export function missing(deck: Slide[]): string[] {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (isTodo(v)) found.add(v.todo);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  deck.forEach(walk);
  return [...found];
}
