import { describe, expect, it } from "vitest";
import { buildDeck, isTodo, missing, move, PITCH, type PitchConfig, revealCount } from "../src/pitch/deck";
import type { Scenario } from "../src/scenario/types";

const modules = import.meta.glob<Record<string, Scenario>>("../src/scenario/scenarios/*.ts", { eager: true });
const all = Object.values(modules)
  .flatMap((m) => Object.values(m))
  .filter((s): s is Scenario => !!s && typeof s === "object" && "id" in s && "flow" in s);

const FILLED: PitchConfig = {
  ...PITCH,
  team: ["Ana · produs"],
  demoUrl: "https://exemplu.vercel.app",
  market: { text: "o cifră", source: "o sursă" },
  builtToday: ["scenariul"],
  next: ["pilot"],
};

describe("pitch deck", () => {
  for (const s of all) {
    it(`„${s.id}”: 9 slide-uri, pe capitolele landing-ului, cu textele scenariului`, () => {
      const deck = buildDeck(s, { ...PITCH, demoUrl: "" }, "http://localhost:5173");
      expect(deck.map((x) => x.kind)).toEqual(["cover", "guess", "problem", "payer", "how", "architecture", "guard", "video", "close"]);
      const cover = deck[0];
      expect(cover.kind === "cover" && cover.name).toBe(s.app.name);
      const problem = deck.find((x) => x.kind === "problem");
      expect(problem?.kind === "problem" && problem.problem).toBe(s.business.problem);
      const how = deck.find((x) => x.kind === "how");
      expect(how?.kind === "how" && how.steps.map((x) => x.mock)).toEqual(["scan", "ask", "kit"]);
      const close = deck.find((x) => x.kind === "close");
      expect(close?.kind === "close" && close.url).toBe("http://localhost:5173");
      expect(deck.find((x) => x.kind === "video")).toMatchObject({ src: "/pitch/demo.mp4" });
    });
  }

  it("arată ce lipsește, ca să nu scape la pitch", () => {
    const s = all[0];
    const deck = buildDeck({ ...s, business: { ...s.business, evidence: [] } }, { ...PITCH, team: [], problemFact: undefined });
    const todo = missing(deck);
    expect(todo.some((t) => t.includes("business.evidence"))).toBe(true);
    expect(todo.some((t) => t.includes("PITCH.team"))).toBe(true);
    const problem = deck.find((x) => x.kind === "problem");
    expect(isTodo(problem?.kind === "problem" && problem.evidence)).toBe(true);
  });

  it("problema: cifra din interviuri bate cifra de pe net, iar cifra de pe net vine cu sursa", () => {
    const s = all[0];
    const fact = { text: "500–1.500 lei pe lună", source: "un ghid de prețuri" };
    const web = buildDeck({ ...s, business: { ...s.business, evidence: [] } }, { ...PITCH, problemFact: fact }).find((x) => x.kind === "problem");
    expect(web?.kind === "problem" && web.evidence).toEqual(fact);
    const people = buildDeck({ ...s, business: { ...s.business, evidence: ["„Pierd o zi pe postare.” (Ana)"] } }, { ...PITCH, problemFact: fact }).find((x) => x.kind === "problem");
    expect(people?.kind === "problem" && people.evidence).toBe("„Pierd o zi pe postare.” (Ana)");
  });

  it("arhitectura: fără ea apare ca lipsă; cu ea arată AI-ul, codul și omul, plus ce se întâmplă când pică", () => {
    const s = all[0];
    expect(missing(buildDeck(s, { ...PITCH, architecture: undefined })).some((t) => t.includes("PITCH.architecture"))).toBe(true);
    const slide = buildDeck(s, PITCH).find((x) => x.kind === "architecture");
    const system = slide?.kind === "architecture" ? slide.system : undefined;
    if (!system || isTodo(system)) throw new Error("PITCH.architecture lipsește");
    expect(new Set(system.steps.map((x) => x.owner))).toEqual(new Set(["AI", "cod", "om"]));
    expect(system.failures.length).toBeGreaterThan(0);
  });

  it("completat, nu mai cere nimic; linkul din PITCH bate adresa locală", () => {
    const s = all[0];
    const deck = buildDeck({ ...s, business: { ...s.business, evidence: ["„Pierd 2 zile pe lună.” (contabila)"] } }, FILLED, "http://localhost:5173");
    expect(missing(deck)).toEqual([]);
    const close = deck.find((x) => x.kind === "close");
    expect(close?.kind === "close" && close.url).toBe("https://exemplu.vercel.app");
  });

  it("clickerul aprinde pașii arhitecturii pe rând, apoi trece la slide-ul următor și se poate întoarce", () => {
    const deck = buildDeck(all[0], PITCH);
    const slide = deck.findIndex((x) => x.kind === "architecture");
    const count = revealCount(deck[slide]);
    expect(count).toBe(7);
    expect(move(deck, { slide: slide - 1, reveal: 1 }, 1)).toEqual({ slide, reveal: 1 });
    expect(move(deck, { slide, reveal: 3 }, 1)).toEqual({ slide, reveal: 4 });
    expect(move(deck, { slide, reveal: count }, 1)).toEqual({ slide: slide + 1, reveal: 1 });
    expect(move(deck, { slide: slide + 1, reveal: 1 }, -1)).toEqual({ slide, reveal: count });
    expect(move(deck, { slide, reveal: 2 }, -1)).toEqual({ slide, reveal: 1 });
  });

  it("la capetele deck-ului, clicul nu mai mută nimic", () => {
    const deck = buildDeck(all[0], PITCH);
    expect(move(deck, { slide: 0, reveal: 1 }, -1)).toEqual({ slide: 0, reveal: 1 });
    expect(move(deck, { slide: deck.length - 1, reveal: 1 }, 1)).toEqual({ slide: deck.length - 1, reveal: 1 });
  });

  it("deck-ul nu mai are QR și nici slide de încercat pe telefon", () => {
    const deck = buildDeck(all[0], PITCH);
    expect(deck.some((x) => (x.kind as string) === "demo")).toBe(false);
    expect(JSON.stringify(deck)).not.toMatch(/\bQR\b|Scanați/);
  });
});
