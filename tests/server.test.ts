import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { activeProvider, handleAi, parseJsonLoose } from "../server/ai";
import { firstInlineImage, handleImage } from "../server/image";
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

describe("/api/image", () => {
  const old = { key: process.env.GEMINI_API_KEY, provider: process.env.AI_PROVIDER };
  afterEach(() => {
    process.env.GEMINI_API_KEY = old.key ?? "";
    process.env.AI_PROVIDER = old.provider ?? "";
  });
  const part = { mimeType: "image/png", data: "AAAA" };
  const call = (body: unknown) =>
    handleImage(new Request("http://x/api/image", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } }));

  it("fără cheie întoarce imaginea de rezervă", async () => {
    process.env.GEMINI_API_KEY = "";
    const res = await call({ style: part, subject: part, instruction: "x", mock: "/samples/spire/pip-in-stil.png" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ image: "/samples/spire/pip-in-stil.png", model: "mock" });
  });
  it("cu AI_PROVIDER=mock nu cheamă Gemini, chiar dacă are cheie", async () => {
    process.env.GEMINI_API_KEY = "cheie";
    process.env.AI_PROVIDER = "mock";
    const res = await call({ style: part, subject: part, instruction: "x", mock: "/m.png" });
    expect(await res.json()).toMatchObject({ image: "/m.png", model: "mock" });
  });
  it("fără imaginea de rezervă, în mock, spune ce lipsește", async () => {
    process.env.GEMINI_API_KEY = "";
    expect((await call({ style: part, subject: part, instruction: "x" })).status).toBe(400);
  });
  it("respinge JSON-ul stricat", async () => {
    expect((await call("{nu e json")).status).toBe(400);
  });
  it("cu cheie, cere stilul, subiectul și instrucțiunea", async () => {
    process.env.GEMINI_API_KEY = "cheie";
    process.env.AI_PROVIDER = "";
    expect((await call({ style: part, instruction: "x" })).status).toBe(400);
    expect((await call({ style: part, subject: part })).status).toBe(400);
  });
});

describe("firstInlineImage", () => {
  it("ia prima imagine din răspuns, ca data URL", () => {
    const parts = [{ text: "uite" }, { inlineData: { mimeType: "image/png", data: "AAA" } }, { inlineData: { mimeType: "image/png", data: "BBB" } }];
    expect(firstInlineImage([{ content: { parts } }])).toBe("data:image/png;base64,AAA");
  });
  it("null când modelul n-a întors imagine", () => {
    expect(firstInlineImage([{ content: { parts: [{ text: "nu pot" }] } }])).toBeNull();
    expect(firstInlineImage(undefined)).toBeNull();
  });
});
