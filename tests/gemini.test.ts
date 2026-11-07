import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGemini } from "../server/providers/gemini";

const generateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

const overloaded = () => Object.assign(new Error("high demand"), { status: 503 });
const ok = (text: string) => ({ text });
const usedModels = () => generateContent.mock.calls.map(([arg]) => arg.model);

describe("callGemini, cu model de rezervă", () => {
  beforeEach(() => {
    generateContent.mockReset();
    vi.stubEnv("GEMINI_API_KEY", "cheie");
    vi.stubEnv("GEMINI_MODEL", "principal");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "rezerva");
    vi.stubEnv("GEMINI_TIMEOUT_MS", "20");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("când modelul principal răspunde, nu-l cheamă pe cel de rezervă", async () => {
    generateContent.mockResolvedValue(ok("merge"));
    expect(await callGemini({ prompt: "x" })).toEqual({ model: "principal", text: "merge" });
    expect(usedModels()).toEqual(["principal"]);
  });
  it("supraîncărcat (503): trece pe rezervă și spune ce model a răspuns", async () => {
    generateContent.mockRejectedValueOnce(overloaded()).mockResolvedValue(ok("merge"));
    expect(await callGemini({ prompt: "x" })).toEqual({ model: "rezerva", text: "merge" });
  });
  it("cotă depășită (429): trece pe rezervă", async () => {
    generateContent.mockRejectedValueOnce(Object.assign(new Error("cotă"), { status: 429 })).mockResolvedValue(ok("merge"));
    expect((await callGemini({ prompt: "x" })).model).toBe("rezerva");
  });
  it("modelul principal nu răspunde la timp: trece pe rezervă", async () => {
    generateContent.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(ok("merge"));
    expect((await callGemini({ prompt: "x" })).model).toBe("rezerva");
  });
  it("cheia invalidă nu încearcă alt model", async () => {
    generateContent.mockRejectedValue(Object.assign(new Error("cheie"), { status: 401 }));
    await expect(callGemini({ prompt: "x" })).rejects.toMatchObject({ status: 401 });
    expect(usedModels()).toEqual(["principal"]);
  });
  it("amândouă pică: întoarce eroarea ultimului", async () => {
    generateContent.mockRejectedValue(overloaded());
    await expect(callGemini({ prompt: "x" })).rejects.toMatchObject({ status: 502 });
    expect(usedModels()).toEqual(["principal", "rezerva"]);
  });
  it("cu timeoutMs, modelul de rezervă mai are timp după ce principalul nu răspunde", async () => {
    vi.stubEnv("GEMINI_TIMEOUT_MS", "20000");
    generateContent.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(ok("merge"));
    const started = Date.now();
    expect((await callGemini({ prompt: "x", timeoutMs: 200 })).model).toBe("rezerva");
    expect(Date.now() - started).toBeLessThan(200);
  });
  it("cu timeoutMs, renunță înainte să expire, chiar dacă niciun model nu răspunde", async () => {
    vi.stubEnv("GEMINI_TIMEOUT_MS", "20000");
    generateContent.mockImplementation(() => new Promise(() => {}));
    const started = Date.now();
    await expect(callGemini({ prompt: "x", timeoutMs: 200 })).rejects.toMatchObject({ status: 502 });
    expect(Date.now() - started).toBeLessThan(260);
    expect(usedModels()).toEqual(["principal", "rezerva"]);
  });
  it("nu încearcă de două ori același model", async () => {
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "principal");
    generateContent.mockRejectedValue(overloaded());
    await expect(callGemini({ prompt: "x" })).rejects.toBeTruthy();
    expect(usedModels()).toEqual(["principal"]);
  });
});
