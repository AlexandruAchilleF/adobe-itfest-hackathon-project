import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleLogo, handleVideoCreate, handleVideoStatus } from "../server/media";

const post = (path: string, body: unknown, origin?: string) =>
  new Request(`http://x${path}`, {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", ...(origin ? { origin } : {}) },
  });
const status = (id: string | null) => handleVideoStatus(new Request(`http://x/api/video${id === null ? "" : `?id=${encodeURIComponent(id)}`}`));

const video = { prompt: "Pinguinul prezintă oferta", aspect: "9:16", seconds: 15, mock: { url: "/samples/spire/animatic.mp4", afterMs: 1000 } };
const create = async (body: unknown = video) => handleVideoCreate(post("/api/video", body));
const jobId = async (body: unknown = video) => ((await (await create(body)).json()) as { jobId: string }).jobId;

describe("POST /api/video", () => {
  it("pornește un job și răspunde 202 cu id-ul lui", async () => {
    const res = await create();
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ jobId: expect.stringMatching(/^mock_/), model: "mock" });
  });
  it.each([
    ["JSON stricat", "{nu e json"],
    ["fără prompt", { ...video, prompt: "" }],
    ["format necunoscut", { ...video, aspect: "4:3" }],
    ["durată în afara limitelor", { ...video, seconds: 0 }],
    ["durată prea mare", { ...video, seconds: 61 }],
    ["cadru-cheie fără date", { ...video, keyframes: [{ mimeType: "image/png" }] }],
    ["fără mock", { ...video, mock: undefined }],
    ["mock fără rezultat", { ...video, mock: { afterMs: 10 } }],
    ["adresă nesigură", { ...video, mock: { url: "javascript:alert(1)" } }],
    ["adresă pe alt protocol", { ...video, mock: { url: "//evil.example/a.mp4" } }],
  ])("respinge cererea: %s", async (_name, body) => {
    expect((await create(body)).status).toBe(400);
  });
  it("respinge corpul prea mare, cu indicație", async () => {
    const res = await create({ ...video, prompt: "x".repeat(4 * 1024 * 1024 + 1) });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ hint: expect.any(String) });
  });
  it("pune CORS pentru originile permise", async () => {
    const origin = "http://localhost:5241";
    expect((await handleVideoCreate(post("/api/video", video, origin))).headers.get("access-control-allow-origin")).toBe(origin);
  });
});

describe("GET /api/video", () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));
  afterEach(() => vi.useRealTimers());

  it("spune „running” cu progres până trece timpul", async () => {
    const id = await jobId();
    vi.setSystemTime(1_000_500);
    expect(await (await status(id)).json()).toEqual({ status: "running", progress: 0.5 });
  });
  it("spune „done” cu adresa, modelul și durata", async () => {
    const id = await jobId();
    vi.setSystemTime(1_001_000);
    expect(await (await status(id)).json()).toEqual({ status: "done", url: video.mock.url, model: "mock", ms: 1000 });
  });
  it("arată eșecul cerut prin mock, ca interfața să-l poată trata", async () => {
    const id = await jobId({ ...video, mock: { error: "Cota s-a terminat.", afterMs: 0 } });
    expect(await (await status(id)).json()).toEqual({ status: "failed", error: "Cota s-a terminat." });
  });
  it("acceptă și adrese https", async () => {
    const id = await jobId({ ...video, mock: { url: "https://cdn.example/a.mp4", afterMs: 0 } });
    expect(await (await status(id)).json()).toMatchObject({ status: "done", url: "https://cdn.example/a.mp4" });
  });
  it("fără id răspunde 400", async () => {
    expect((await status(null)).status).toBe(400);
  });
  it.each([
    ["alt prefix", "furnizor_abc"],
    ["conținut stricat", "mock_%%%"],
    ["adresă nesigură în id", `mock_${Buffer.from(JSON.stringify({ url: "javascript:alert(1)", startedAt: 1, afterMs: 0 })).toString("base64url")}`],
    ["timp lipsă în id", `mock_${Buffer.from(JSON.stringify({ url: "/a.mp4" })).toString("base64url")}`],
  ])("respinge id-ul: %s", async (_name, id) => {
    expect((await status(id)).status).toBe(404);
  });
});

describe("POST /api/logo", () => {
  const logo = { instruction: "A flat penguin symbol. No text, no letters.", seed: 7, mock: "/samples/spire/simbol.png" };
  const call = (body: unknown) => handleLogo(post("/api/logo", body));

  it("întoarce simbolul în aceeași formă ca /api/image", async () => {
    const res = await call(logo);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ image: logo.mock, model: "mock", ms: expect.any(Number) });
  });
  it.each([
    ["JSON stricat", "{nu e json"],
    ["fără instrucțiune", { ...logo, instruction: "" }],
    ["fără mock", { ...logo, mock: undefined }],
    ["seed care nu e întreg", { ...logo, seed: 1.5 }],
  ])("respinge cererea: %s", async (_name, body) => {
    expect((await call(body)).status).toBe(400);
  });
  it("respinge corpul prea mare", async () => {
    expect((await call({ ...logo, instruction: "x".repeat(4 * 1024 * 1024 + 1) })).status).toBe(413);
  });
});
