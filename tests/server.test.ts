import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { activeProvider, handleAi, parseJsonLoose } from "../server/ai";
import { fakeFromSchema, normalizeSchema } from "../server/schema";
import { AiDesign } from "../src/lib/design";

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((v) => walk(v, visit));
  }
}

describe("normalizeSchema", () => {
  const schema = normalizeSchema(z.toJSONSchema(AiDesign)) as Record<string, unknown>;

  it("nu lasă oneOf/const/$schema sau constrângeri nesuportate", () => {
    walk(schema, (n) => {
      for (const k of ["oneOf", "const", "$schema", "minimum", "maximum", "minLength"]) expect(n).not.toHaveProperty(k);
    });
  });

  it("toate obiectele au additionalProperties: false", () => {
    walk(schema, (n) => {
      if (n.type === "object") expect(n.additionalProperties).toBe(false);
    });
  });

  it("păstrează discriminatorii ca enum", () => {
    expect(JSON.stringify(schema)).toContain('"enum":["rect"]');
  });
});

describe("fakeFromSchema", () => {
  it("produce date valide pentru schema de design", () => {
    const fake = fakeFromSchema(normalizeSchema(z.toJSONSchema(AiDesign)));
    expect(AiDesign.safeParse(fake).success).toBe(true);
  });
});

describe("parseJsonLoose", () => {
  it("acceptă JSON în blocuri ```json", () => expect(parseJsonLoose('Iată:\n```json\n{"a":1}\n```')).toEqual({ a: 1 }));
  it("acceptă JSON cu text în jur", () => expect(parseJsonLoose('Sigur! {"a":[1,2]} Gata.')).toEqual({ a: [1, 2] }));
  it("aruncă eroare când nu există JSON", () => expect(() => parseJsonLoose("nimic")).toThrow());
});

describe("handleAi (provider mock)", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  const call = (body: unknown) =>
    handleAi(new Request("http://x/api/ai", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

  it("folosește mock când nu există chei", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_PROVIDER;
    expect(activeProvider()).toBe("mock");
    const res = await call({ prompt: "salut", schema: { type: "object", properties: { a: { type: "string" } } }, mock: { a: "x" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ provider: "mock", data: { a: "x" } });
  });

  it("respinge cererile fără prompt", async () => {
    const res = await call({});
    expect(res.status).toBe(400);
  });

  it("respinge body invalid", async () => {
    const res = await handleAi(new Request("http://x/api/ai", { method: "POST", body: "{nu e json" }));
    expect(res.status).toBe(400);
  });

  it("preferă furnizorul cerut doar dacă are cheie", () => {
    process.env.GEMINI_API_KEY = "x";
    delete process.env.ANTHROPIC_API_KEY;
    expect(activeProvider("anthropic")).toBe("gemini");
    expect(activeProvider("mock")).toBe("mock");
  });
});

describe("CORS pentru add-on-uri Adobe Express", async () => {
  const { corsHeaders } = await import("../server/ai");
  it("permite domeniul de add-on și localhost", () => {
    expect(corsHeaders("https://abc123.wxp.adobe-addons.com")["access-control-allow-origin"]).toBe("https://abc123.wxp.adobe-addons.com");
    expect(corsHeaders("https://localhost:5241")["access-control-allow-origin"]).toBe("https://localhost:5241");
  });
  it("refuză alte domenii", () => {
    expect(corsHeaders("https://evil.example.com")).toEqual({});
    expect(corsHeaders("https://x.wxp.adobe-addons.com.evil.com")).toEqual({});
  });
});
