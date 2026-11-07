// Pitch deck-ul (/pitch): pe capitolele landing-ului (cerul, problema, pașii, garda, noaptea, apusul).
// Numele, fraza, problema și plătitorul vin din scenariu; textele poveștii, din STORY. Ce nu e în scenariu
// (echipa, cerințele brief-ului, ce ați construit azi) se completează în PITCH, mai jos.
// Logică pură (testată în tests/pitch.test.ts); desenul e în src/pages/PitchPage.tsx.

import type { Scenario } from "../scenario/types";

export interface Architecture {
  /** cine face pasul: se vede pe slide, pentru că asta e ideea arhitecturii */
  steps: Array<{ owner: "AI" | "cod" | "om"; title: string; text: string }>;
  /** bucla de agent, sub pași */
  loop: string;
  failures: Array<{ when: string; then: string }>;
}

/** O cifră de pe net: doar cu sursa ei, verificată pe pagina sursei (nu din rezumate). */
export interface Fact {
  text: string;
  source: string;
}

export interface PitchConfig {
  /** „Ana · produs și interviuri”, câte unul pe rând */
  team: string[];
  /** apare pe prima slide, sub echipă */
  event: string;
  /** linkul din QR; gol = adresa de pe care rulează deck-ul (pe Vercel, adresa publică) */
  demoUrl: string;
  /** cât costă azi problema, cu sursa; apare pe slide-ul problemei cât timp nu avem cifra din interviuri */
  problemFact?: Fact;
  /** cât plătesc firmele azi pentru ce face Spire, cu sursa (slide-ul „Cine plătește”) */
  payerFacts: Fact[];
  /** cât de mare e piața, cu sursa */
  market?: Fact;
  /** ce s-a scris azi, la hackathon (README.md, „Construit azi”) */
  builtToday: string[];
  /** ce urmează după hackathon (intenția de a construi mai departe e un criteriu Adobe) */
  next: string[];
  /** drumul prin sistem și ce se întâmplă când pică ceva; doar ce există în cod (docs/PITCH.md) */
  architecture?: Architecture;
  /** uliul de pază, desenat ca graf (src/pitch/HawkMark.tsx), pe copertă în locul cerului pictat cu uliu; false = cerul de pe landing */
  coverMark: boolean;
}

// Cifrele de pe net sunt verificate pe pagina sursei la 7 noiembrie 2026. Cifra din interviuri, când o avem,
// merge în scenario.business.evidence și ia locul lui problemFact.
export const PITCH: PitchConfig = {
  team: ["Fork Exec", "Flueraru Alexandru Achille"],
  event: "ITFest × Adobe · 7 noiembrie 2026",
  demoUrl: "https://adobe-itfest-hackathon-project.vercel.app",
  problemFact: {
    text: "Cine nu face singur postările plătește azi 500–1.500 lei pe lună unui freelancer sau 1.500–3.500 lei unei agenții mici.",
    source: "Trifu Media, „Cât costă administrarea social media în România”, 2026",
  },
  payerFacts: [{ text: "O agenție mică cere de la 99 €/lună pentru 8 postări cu design, până la 299 €/lună pentru 20, cu contract de minimum 3 luni.", source: "ESYS Agency, pachetele de social media" }],
  market: { text: "Circa 930.000 de IMM-uri în România, aproape toate microîntreprinderi.", source: "Comisia Europeană, SME Country Fact Sheet 2025 (date din 2024)" },
  builtToday: [
    "Extensia Chrome: uliul peste site, scanarea și critica paginii",
    "Anatomia referinței și întrebările, cu Gemini validat cu Zod",
    "Mascota redesenată în stilul referinței, cu FLUX.2 pe Cloudflare",
    "Compunerea pe straturi, garda deterministă și bucla de agent",
    "Aplicația: campanii, marca, export PNG, datele în Supabase",
  ],
  next: [
    "Generarea cu Adobe Firefly, sigură pentru uz comercial",
    "Add-on publicat în marketplace-ul Adobe Express",
    "Clienți-pilot printre firmele mici intervievate",
    "Conturi și izolare între firme; costul pe rulare, calculat",
  ],
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
  coverMark: false,
};

export type Theme = "hero" | "cream" | "night" | "dawn" | "sky" | "dusk";

/** Un text care lipsește: pe slide apare ca o casetă punctată „De completat”, ca să nu scape la pitch. */
export interface Todo {
  todo: string;
}
export type Maybe<T> = T | Todo;
export const isTodo = (v: unknown): v is Todo => typeof v === "object" && v !== null && "todo" in v;
const orTodo = <T>(v: T | undefined | null | "", todo: string): Maybe<T> => (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ? { todo } : v);

/** machetele animate de pe landing (src/pages/spire/LandingMockups.tsx), aceleași în deck */
export type Mock = "scan" | "ask" | "kit";

export type Slide =
  | { kind: "cover"; theme: Theme; name: string; headline: string; notThis?: string; says: string; team: Maybe<string[]>; event: string; mark: boolean }
  | { kind: "problem"; theme: Theme; ribbon: string; title: string; problem: string; pains: string[]; evidence: Maybe<string | Fact> }
  | { kind: "how"; theme: Theme; ribbon: string; title: string; steps: Array<{ tag: string; title: string; text: string; mock: Mock }> }
  | { kind: "guard"; theme: Theme; ribbon: string; title: string; text: string }
  | { kind: "beforeAfter"; theme: Theme; ribbon: string; title: string; text: string }
  | { kind: "architecture"; theme: Theme; ribbon: string; title: string; system: Maybe<Architecture> }
  | { kind: "payer"; theme: Theme; ribbon: string; payer: string; evidence: string[]; facts: Fact[]; market: Maybe<Fact> }
  | { kind: "demo"; theme: Theme; title: string; text: string; url: string }
  | { kind: "close"; theme: Theme; question: string; answer: string; builtToday: Maybe<string[]>; next: Maybe<string[]>; team: Maybe<string[]>; url: string };

// Textele poveștii, aceleași ca pe landing (src/pages/spire/LandingPage.tsx), ca deck-ul și pagina să spună același lucru.
const STORY = {
  says: "Am găsit pe pagină un hero cu ilustrație, trei culori și un ton jucăuș. Îl refac pentru Gelateria Pip, cu Pip desenat în același stil?",
  problemTitle: "Designul care îți place e la un clic.\n*Pe marca ta, e la zece prompturi.*",
  pains: ["Promptul nu prinde stilul", "Culorile mărcii ies pe alături", "Prețul și mențiunile ies greșit"],
  steps: [
    { tag: "Se uită", title: "Citește *pagina*", text: "Uliul apare peste site și marchează ce e bun pentru campanie.", mock: "scan" },
    { tag: "Întreabă", title: "Doar *trei lucruri*", text: "Oferta, îndemnul și formatele. Restul îl ia din marcă.", mock: "ask" },
    { tag: "Face", title: "Kitul de *campanie*", text: "Postare și story, cu mascota în stilul referinței, pe straturi editabile.", mock: "kit" },
  ] satisfies Array<{ tag: string; title: string; text: string; mock: Mock }>,
  guardTitle: "AI-ul propune.\n*Codul verifică.*",
  guardText: "Înainte să vezi kitul, codul verifică fiecare material: prețul, culorile mărcii, contrastul, cât seamănă cu referința. Ce nu trece se întoarce la AI, de cel mult două ori.",
  afterTitle: "Stilul altcuiva.\n*Conținutul tău.*",
  afterText: "Preluăm doar felul în care e desenat. Ilustrația, textele și culorile sunt ale tale, iar codul respinge ce e prea aproape de referință.",
};

/** Slide-urile, pe capitolele landing-ului și în ordinea video-ului (docs/PITCH.md: rezultatul → durerea → demo → arhitectura → plătitorul → închiderea). Cerințele brief-ului nu au slide: se văd în demo.. */
export function buildDeck(s: Scenario, p: PitchConfig, origin = ""): Slide[] {
  const roleLabel = (id: string) => s.roles[id]?.label ?? id;
  const url = p.demoUrl || origin;
  const team = orTodo(p.team, "numele echipei și rolul fiecăruia (PITCH.team)");

  return [
    { kind: "cover", theme: "hero", name: s.app.name, headline: s.app.headline ?? s.app.name, notThis: s.app.notThis, says: STORY.says, team, event: p.event, mark: p.coverMark },
    {
      kind: "problem",
      theme: "cream",
      ribbon: "Problema",
      title: STORY.problemTitle,
      problem: s.business.problem,
      pains: STORY.pains,
      evidence: orTodo<string | Fact>(s.business.evidence[0] ?? p.problemFact, "cifra spusă de un om real, cu numele lui (scenario.business.evidence)"),
    },
    { kind: "how", theme: "cream", ribbon: "Cum funcționează", title: "Se uită, întreabă *și face kitul.*", steps: STORY.steps },
    { kind: "guard", theme: "cream", ribbon: "Garda", title: STORY.guardTitle, text: STORY.guardText },
    { kind: "beforeAfter", theme: "night", ribbon: "Înainte și după", title: STORY.afterTitle, text: STORY.afterText },
    {
      kind: "architecture",
      theme: "dawn",
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
      facts: p.payerFacts,
      market: orTodo(p.market, "cât de mare e piața, cu sursa (PITCH.market)"),
    },
    {
      kind: "demo",
      theme: "sky",
      title: "Încercați *voi.*",
      text: `Scanați codul cu telefonul și intrați ca ${roleLabel(s.flow.requester).toLowerCase()}.`,
      url,
    },
    {
      kind: "close",
      theme: "dusk",
      question: "N-ai designer azi?",
      answer: `${s.app.name} e aici.`,
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
