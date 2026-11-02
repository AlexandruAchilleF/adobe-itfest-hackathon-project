import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { normalizeSchema } from "../server/schema";
import { agentSchema, defineAction, mockPlan, runAgent } from "../src/lib/agent";
import { BusinessCanvas, canvasToMarkdown, exampleCanvas } from "../src/lib/business";
import { type Responses, summarizeSurvey, surveyToCsv } from "../src/lib/survey";

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

describe("business canvas", () => {
  it("exemplul respectă schema", () => expect(BusinessCanvas.safeParse(exampleCanvas).success).toBe(true));
  it("schema e compatibilă cu structured outputs (toate câmpurile obligatorii)", () => {
    const schema = normalizeSchema(z.toJSONSchema(BusinessCanvas));
    walk(schema, (n) => {
      if (n.type === "object" && n.properties) {
        expect(n.additionalProperties).toBe(false);
        expect((n.required as string[]).sort()).toEqual(Object.keys(n.properties as object).sort());
      }
    });
  });
  it("exportă Markdown cu secțiunile cheie", () => {
    const md = canvasToMarkdown(exampleCanvas);
    for (const h of ["## Problema", "## Clienți", "## Model de business", "## Adopție", "## Întrebări de la juriu"]) expect(md).toContain(h);
  });
});

describe("sondaj", () => {
  const qs = exampleCanvas.validation_survey; // yes_no, scale, choice
  const responses: Responses[] = [
    { 0: true, 1: 5, 2: 2 },
    { 0: true, 1: 4, 2: 2 },
    { 0: false, 1: 2, 2: 1 },
    { 0: true },
  ];
  const stats = summarizeSurvey(qs, responses);
  it("Da/Nu → frază cu procent", () => expect(stats[0].headline).toBe("3 din 4 (75%) au răspuns „Da”"));
  it("scală → medie și top-2", () => {
    expect(stats[1].average).toBe(3.7);
    expect(stats[1].headline).toContain("2 din 3 (67%) au dat 4 sau 5");
  });
  it("variante → cea mai aleasă", () => expect(stats[2].headline).toBe("cel mai ales: „15 €” (2 din 3, 67%)"));
  it("CSV cu antet și rânduri", () => {
    const csv = surveyToCsv(qs, responses).split("\n");
    expect(csv).toHaveLength(5);
    expect(csv[1]).toBe('1,da,"5","15 €"');
  });
});

describe("agent (comenzi în limbaj natural)", () => {
  const calls: unknown[] = [];
  const actions = [
    defineAction({
      name: "set_color",
      description: "Schimbă culoarea fundalului",
      args: z.object({ color: z.string() }),
      run: (a) => void calls.push(a),
      examples: ["fă fundalul verde"],
      mockArgs: { color: "#0f0" },
    }),
    defineAction({ name: "clear", description: "Șterge tot", args: z.object({}), run: () => void calls.push("clear"), examples: ["golește"], mockArgs: {} }),
  ];
  afterEach(() => {
    calls.length = 0;
    vi.unstubAllGlobals();
  });

  it("schema e acceptată de structured outputs", () => {
    const schema = normalizeSchema(z.toJSONSchema(agentSchema(actions)));
    expect(JSON.stringify(schema)).toContain('"enum":["set_color"]');
    expect(JSON.stringify(schema)).not.toContain("oneOf");
  });

  it("modul demo alege acțiunea după cuvinte (cu diacritice ignorate)", () => {
    expect(mockPlan("fa fundalul verde te rog", actions).actions[0]).toEqual({ name: "set_color", args: { color: "#0f0" } });
    expect(mockPlan("cântă ceva", actions).actions).toEqual([]);
  });

  it("execută acțiunile alese de AI și raportează argumentele invalide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          provider: "mock",
          model: "mock",
          text: "",
          ms: 1,
          data: {
            say: "Gata",
            actions: [
              { name: "set_color", args: { color: "#123456" } },
              { name: "set_color", args: { colour: 1 } },
              { name: "fly", args: {} },
              { name: "clear", args: {} },
            ],
          },
        }),
      ),
    );
    const turn = await runAgent({ input: "x", actions });
    expect(turn.say).toBe("Gata");
    expect(calls).toEqual([{ color: "#123456" }, "clear"]);
    expect(turn.actions.map((a) => [a.name, a.ok])).toEqual([
      ["set_color", true],
      ["set_color", false],
      ["fly", false],
      ["clear", true],
    ]);
    expect(turn.actions[2].error).toBe("acțiune necunoscută");
  });
});
