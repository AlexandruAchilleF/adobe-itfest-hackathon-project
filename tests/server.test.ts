import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { activeProvider, handleAi, parseJsonLoose } from "../server/ai";
import { handleImage, imageFromResult } from "../server/image";
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

describe("CORS pentru extensia Chrome", async () => {
  const { corsHeaders } = await import("../server/ai");
  const id = "abcdefghijklmnopabcdefghijklmnop";
  it("permite o origine de extensie Chrome", () => {
    expect(corsHeaders(`chrome-extension://${id}`)["access-control-allow-origin"]).toBe(`chrome-extension://${id}`);
  });
  it("refuză originile care doar seamănă", () => {
    expect(corsHeaders("chrome-extension://scurt")).toEqual({});
    expect(corsHeaders(`chrome-extension://${id}.evil.com`)).toEqual({});
    expect(corsHeaders(`https://${id}`)).toEqual({});
  });
});

describe("/api/image", () => {
  const old = { account: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN, provider: process.env.AI_PROVIDER };
  afterEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = old.account ?? "";
    process.env.CLOUDFLARE_API_TOKEN = old.token ?? "";
    process.env.AI_PROVIDER = old.provider ?? "";
    vi.unstubAllGlobals();
  });
  const withKeys = () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "cont";
    process.env.CLOUDFLARE_API_TOKEN = "token";
    process.env.AI_PROVIDER = "";
  };
  const withoutKeys = () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "";
    process.env.CLOUDFLARE_API_TOKEN = "";
    process.env.AI_PROVIDER = "";
  };
  const part = { mimeType: "image/png", data: "AAAA" };
  const call = (body: unknown) =>
    handleImage(new Request("http://x/api/image", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } }));
  const answer = (body: unknown, status = 200) => vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status }));

  it("fără credențiale întoarce imaginea de rezervă", async () => {
    withoutKeys();
    const res = await call({ style: part, subject: part, instruction: "x", mock: "/samples/spire/pip-in-stil.png" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ image: "/samples/spire/pip-in-stil.png", model: "mock" });
  });
  it("cu AI_PROVIDER=mock nu cheamă furnizorul, chiar dacă are credențiale", async () => {
    withKeys();
    process.env.AI_PROVIDER = "mock";
    const fetchMock = answer({});
    vi.stubGlobal("fetch", fetchMock);
    expect(await (await call({ style: part, subject: part, instruction: "x", mock: "/m.png" })).json()).toMatchObject({ image: "/m.png", model: "mock" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("fără imaginea de rezervă, în mock, spune ce lipsește", async () => {
    withoutKeys();
    expect((await call({ style: part, subject: part, instruction: "x" })).status).toBe(400);
  });
  it("respinge JSON-ul stricat", async () => {
    expect((await call("{nu e json")).status).toBe(400);
  });
  it("cu credențiale, cere stilul, subiectul și instrucțiunea", async () => {
    withKeys();
    expect((await call({ style: part, instruction: "x" })).status).toBe(400);
    expect((await call({ style: part, subject: part })).status).toBe(400);
  });
  it("trimite stilul primul, subiectul al doilea, și întoarce imaginea", async () => {
    withKeys();
    const fetchMock = answer({ success: true, result: { image: "iVBORw0KGgo=" } });
    vi.stubGlobal("fetch", fetchMock);
    const res = await call({ style: part, subject: { mimeType: "image/png", data: "BBBB" }, instruction: "desenează" });
    expect(await res.json()).toMatchObject({ image: "data:image/png;base64,iVBORw0KGgo=", model: expect.stringContaining("flux-2-klein-4b") });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/accounts/cont/ai/run/@cf/black-forest-labs/flux-2-klein-4b");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token");
    const form = init.body as FormData;
    expect(form.get("prompt")).toBe("desenează");
    expect(Buffer.from(await (form.get("input_image_0") as Blob).arrayBuffer()).toString("base64")).toBe("AAAA");
    expect(Buffer.from(await (form.get("input_image_1") as Blob).arrayBuffer()).toString("base64")).toBe("BBBB");
  });
  it("cota gratuită terminată are mesaj clar", async () => {
    withKeys();
    vi.stubGlobal("fetch", answer({ success: false, errors: [{ code: 4006, message: "you have used up your daily free allocation" }] }, 429));
    const res = await call({ style: part, subject: part, instruction: "x" });
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/cota gratuită/i);
  });
  it("tokenul greșit are mesaj clar", async () => {
    withKeys();
    vi.stubGlobal("fetch", answer({ success: false, errors: [{ code: 10000, message: "Authentication error" }] }, 401));
    const res = await call({ style: part, subject: part, instruction: "x" });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toContain("CLOUDFLARE_API_TOKEN");
  });
});

describe("imageFromResult", () => {
  it("recunoaște formatul din conținut", () => {
    expect(imageFromResult({ result: { image: "iVBORw0KGgo=" } })).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(imageFromResult({ result: { image: "/9j/4AAQ" } })).toBe("data:image/jpeg;base64,/9j/4AAQ");
  });
  it("null când răspunsul n-are imagine", () => {
    expect(imageFromResult({ result: {} })).toBeNull();
    expect(imageFromResult(null)).toBeNull();
  });
});
