// Pitch deck-ul (/pitch): pe capitolele landing-ului (cerul, problema, pașii, garda, noaptea, apusul).
// Numele, fraza, problema și plătitorul vin din scenariu; textele poveștii, din STORY. Ce nu e în scenariu
// (echipa, cerințele brief-ului, ce ați construit azi) se completează în PITCH, mai jos.
// Logică pură (testată în tests/pitch.test.ts); desenul e în src/pages/PitchPage.tsx.

import type { Scenario } from "../scenario/types";

export interface Architecture {
  /** cine face pasul: se vede pe slide, pentru că asta e ideea arhitecturii */
  steps: Array<{ owner: "AI" | "cod" | "om"; title: string; lines: string[] }>;
  /** bucla de agent, sub pași */
  loop: string;
  failures: Array<{ when: string; then: string }>;
}

/** O cifră de pe net: doar cu sursa ei, verificată pe pagina sursei (nu din rezumate). */
export interface Fact {
  /** cifra mare de pe slide, dacă are una */
  figure?: string;
  text: string;
  source: string;
}

export interface PitchConfig {
  /** „Ana · produs și interviuri”, câte unul pe rând */
  team: string[];
  /** apare pe prima slide, sub echipă */
  event: string;
  /** adresa de pe slide-ul final; gol = adresa de pe care rulează deck-ul */
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
  team: ["Fork Exec", "Flueraru Alexandru Achille", "David Gaina"],
  event: "ITFest × Adobe · 7 noiembrie 2026",
  demoUrl: "https://adobe-itfest-hackathon-project.vercel.app",
  problemFact: {
    figure: "500–3.500 lei pe lună",
    text: "Cine nu face singur postările plătește azi 500–1.500 lei pe lună unui freelancer sau 1.500–3.500 lei unei agenții mici.",
    source: "Trifu Media, „Cât costă administrarea social media în România”, 2026",
  },
  payerFacts: [{ text: "O agenție mică cere de la 99 €/lună pentru 8 postări cu design, până la 299 €/lună pentru 20, cu contract de minimum 3 luni.", source: "ESYS Agency, pachetele de social media" }],
  market: { figure: "930.000", text: "Circa 930.000 de IMM-uri în România, aproape toate microîntreprinderi.", source: "Comisia Europeană, SME Country Fact Sheet 2025 (date din 2024)" },
  builtToday: [
    "Extensia Chrome: uliul peste site, scanarea paginii și Inspire",
    "Citirea referinței și întrebările, cu Gemini",
    "Mascota redesenată în stilul referinței, cu FLUX.2 pe Cloudflare",
    "Designul pe straturi, verificările din cod și reîncercările AI-ului",
    "Aplicația: campanii, marca, export PNG, clipul randat în browser, datele în Supabase",
  ],
  next: [
    "Generarea cu Adobe Firefly, sigură pentru uz comercial",
    "Add-on publicat în marketplace-ul Adobe Express",
    "Primii clienți-pilot, ca să validăm prețul",
    "Conturi și izolare între firme; costul pe rulare, calculat",
  ],
  architecture: {
    steps: [
      { owner: "cod", title: "Citește", lines: ["Extensia vede pagina doar când apeși."] },
      { owner: "AI", title: "Propune", lines: ["Gemini înțelege designul și scrie textele.", "FLUX.2 desenează mascota."] },
      { owner: "cod", title: "Verifică", lines: ["Pune designul pe straturi.", "Verifică prețul, culorile, contrastul și dacă e o copie."] },
      { owner: "om", title: "Aprobă", lines: ["Editează, vede verificarea din nou și descarcă."] },
    ],
    loop: "Ce nu trece se întoarce la AI, de cel mult două ori",
    failures: [
      { when: "Pică modelul Gemini", then: "trecem automat pe alt model" },
      { when: "Pică desenul", then: "mascota originală, iar garda o spune" },
      { when: "Fără cheie AI", then: "mod demo, spus ca atare" },
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
  | { kind: "guess"; theme: Theme; ribbon: string; title: string; text: string; options: string[] }
  | { kind: "problem"; theme: Theme; ribbon: string; title: string; problem: string; pains: string[]; evidence: Maybe<string | Fact> }
  | { kind: "how"; theme: Theme; ribbon: string; title: string; steps: Array<{ tag: string; title: string; text: string; mock: Mock }> }
  | { kind: "guard"; theme: Theme; ribbon: string; title: string; text: string }
  | { kind: "architecture"; theme: Theme; ribbon: string; title: string; system: Maybe<Architecture> }
  | { kind: "payer"; theme: Theme; ribbon: string; payer: string; evidence: string[]; facts: Fact[]; market: Maybe<Fact> }
  | { kind: "video"; theme: Theme; src: string; missing: string }
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
  guessTitle: "Câte *prompturi?*",
  guessText: "Ca un chat să facă asta pentru o gelaterie, cu mascota ei și cu prețul corect.",
  guessOptions: ["1", "5", "10+"],
};

/** Slide-urile, pe capitolele landing-ului și în ordinea textului vorbit (docs/PITCH.md): hook → problema → piața → produsul → arhitectura → garda → video → final. Exemplele sunt machete cu Gelateria Pip; Marina Park apare doar în video. */
export function buildDeck(s: Scenario, p: PitchConfig, origin = ""): Slide[] {
  const url = p.demoUrl || origin;
  const team = orTodo(p.team, "numele echipei și rolul fiecăruia (PITCH.team)");

  return [
    { kind: "cover", theme: "hero", name: s.app.name, headline: s.app.headline ?? s.app.name, notThis: s.app.notThis, says: STORY.says, team, event: p.event, mark: p.coverMark },
    { kind: "guess", theme: "cream", ribbon: "Ghiciți", title: STORY.guessTitle, text: STORY.guessText, options: STORY.guessOptions },
    {
      kind: "problem",
      theme: "cream",
      ribbon: "Problema",
      title: STORY.problemTitle,
      problem: s.business.problem,
      pains: STORY.pains,
      evidence: orTodo<string | Fact>(s.business.evidence[0] ?? p.problemFact, "cifra spusă de un om real, cu numele lui (scenario.business.evidence)"),
    },
    {
      kind: "payer",
      theme: "cream",
      ribbon: "Piața",
      payer: s.business.payer,
      evidence: s.business.evidence.slice(1),
      facts: p.payerFacts,
      market: orTodo(p.market, "cât de mare e piața, cu sursa (PITCH.market)"),
    },
    { kind: "how", theme: "cream", ribbon: "Cum funcționează", title: "Se uită, întreabă *și face kitul.*", steps: STORY.steps },
    {
      kind: "architecture",
      theme: "dawn",
      ribbon: "Arhitectura",
      title: "AI-ul propune, *codul verifică,* omul aprobă.",
      system: orTodo(p.architecture, "drumul prin sistem și ce se întâmplă când pică ceva (PITCH.architecture)"),
    },
    { kind: "guard", theme: "cream", ribbon: "Garda", title: STORY.guardTitle, text: STORY.guardText },
    { kind: "video", theme: "night", src: "/pitch/demo.mp4", missing: "Video-ul nu pornește. Continuăm cu slide-urile." },
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

/** Unde suntem în deck: slide-ul și câți pași sunt aprinși pe el. */
export interface Position {
  slide: number;
  reveal: number;
}

/** Câte stări are un slide la clicker: arhitectura aprinde pașii pe rând, apoi bucla și ce se întâmplă când pică ceva. */
export function revealCount(s: Slide): number {
  return s.kind === "architecture" && !isTodo(s.system) ? s.system.steps.length + 1 : 1;
}

/** Clicul următor sau anterior: întâi pașii slide-ului, apoi slide-ul vecin. La capete nu se mișcă. */
export function move(deck: Slide[], pos: Position, direction: 1 | -1): Position {
  if (direction === 1) {
    if (pos.reveal < revealCount(deck[pos.slide])) return { ...pos, reveal: pos.reveal + 1 };
    return pos.slide < deck.length - 1 ? { slide: pos.slide + 1, reveal: 1 } : pos;
  }
  if (pos.reveal > 1) return { ...pos, reveal: pos.reveal - 1 };
  return pos.slide > 0 ? { slide: pos.slide - 1, reveal: revealCount(deck[pos.slide - 1]) } : pos;
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
