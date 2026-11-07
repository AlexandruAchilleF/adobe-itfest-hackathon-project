import { describe, expect, it } from "vitest";
import { demoBrand } from "../src/lib/brand";
import {
  campaignOrigin, campaignTransport, clarificationMock, contextSnapshot, enqueueAsset,
  generationInstruction, recoverJobs, restoreWorkspaceDraft, validateAssetResult,
  workspaceCollection,
} from "../src/lib/campaignQueue";
import type { CritiqueBrief } from "../src/lib/extensionBridge";

const brief: CritiqueBrief = {
  source: { url: "https://www.marinapark.ro/oferte", title: "Marina Park" },
  answers: { product: "Cazare" },
  critique: { mode: "mock", items: [{ id: "cta", title: "Acțiune neclară", observation: "Butonul spune Detalii.", proposal: "Aș explicita rezervarea.", elementId: "button-1" }], searchOptimization: [{ title: "Descrierea cazării", query: "cazare lângă lac", proposal: "Aș explica facilitățile reale.", status: "needs-check", evidence: "Indexarea nu a fost verificată." }] },
};
const answers = { product: "Cazare pentru familie", audience: "Părinți", goal: "Rezervări", cta: "Verifică disponibilitatea" };
const snapshot = () => contextSnapshot(brief, answers, demoBrand, "O imagine pentru prima pagină", [{ question: "Ce perioadă?", answer: "Vara" }]);
function storage() {
  const items = new Map<string, string>();
  return { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => { items.set(key, value); } };
}

describe("snapshotul campaniei", () => {
  it("include critica reală, căutările, răspunsurile, descrierea, clarificările și marca fără a copia imaginile", () => {
    const context = snapshot();
    const instruction = generationInstruction("logo", context);
    for (const value of [brief.critique!.items[0].observation, brief.critique!.items[0].proposal, "cazare lângă lac", ...Object.values(answers), "O imagine pentru prima pagină", "Vara", demoBrand.name, demoBrand.mandatory[0]]) expect(instruction).toContain(value);
    expect(context.brand).not.toHaveProperty("logo");
    expect(context.brand.mascot).not.toHaveProperty("image");
    expect(context.critique).not.toHaveProperty("screenshot");
    answers.product = "Schimbat după snapshot";
    expect(context.answers.product).toBe("Cazare pentru familie");
    answers.product = "Cazare pentru familie";
  });
  it("cere descriere și respinge intrările prea mari", () => {
    expect(() => contextSnapshot(brief, answers, demoBrand, "   ", [])).toThrow();
    expect(() => contextSnapshot(brief, answers, demoBrand, "a".repeat(2001), [])).toThrow();
    expect(() => contextSnapshot(brief, { product: "a".repeat(501) }, demoBrand, "Material", [])).toThrow();
  });
  it("produce maximum 3 întrebări contextuale, fără oferte inventate", () => {
    const result = clarificationMock(snapshot());
    expect(result.questions.length).toBeLessThanOrEqual(3);
    expect(result.questions.join(" ")).toContain(answers.product);
    expect(result.questions.join(" ")).not.toMatch(/reducere|%|lei|Cui te adresezi/);
  });
});

describe("coada explicită", () => {
  it("păstrează snapshotul și limitează cererile în curs și istoricul", () => {
    const context = snapshot();
    const first = enqueueAsset([], "image", context, "first");
    expect(first[0].status).toBe("queued");
    expect(() => enqueueAsset(first, "logo", context, "second")).toThrow(/Așteaptă/);
    expect(() => enqueueAsset(Array.from({ length: 4 }, (_, i) => ({ ...first[0], id: String(i), status: "ready" as const })), "video", context)).toThrow(/4 materiale/);
  });
  it("nu repetă generarea la reload și păstrează rezultatele finalizate", () => {
    const queued = enqueueAsset([], "logo", snapshot(), "first")[0];
    const jobs = recoverJobs([queued, { ...queued, id: "second", status: "generating" }, { ...queued, id: "third", status: "ready" }]);
    expect(jobs.map((job) => job.status)).toEqual(["error", "error", "ready"]);
    expect(jobs[0].error).toContain("Reîncearcă explicit");
    expect(queued.status).toBe("queued");
  });
  it("validează rezultatul și proveniența simulată", () => {
    expect(validateAssetResult({ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1sAAAAASUVORK5CYII=", model: "mock", simulated: true }, "image").simulated).toBe(true);
    expect(() => validateAssetResult({ url: "data:image/png;base64,aGVsbG8=", model: "mock", simulated: true }, "image")).toThrow();
    expect(() => validateAssetResult({ url: "javascript:alert(1)", model: "mock", simulated: true }, "logo")).toThrow();
    expect(() => validateAssetResult({ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1sAAAAASUVORK5CYII=", model: "mock", simulated: false }, "image")).toThrow(/Proveniența/);
    expect(() => validateAssetResult({ url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aU1sAAAAASUVORK5CYII=", simulated: false }, "image")).toThrow();
  });
});

describe("videoclipul generat", () => {
  const plan = { scenes: [{ photo: 0, kicker: "", title: "Cazare în Vama Veche", seconds: 4, motion: "zoom-in" as const }, { photo: null, kicker: "", title: "Vino vara", seconds: 4, motion: "pan-left" as const }], cta: "Rezervă" };
  const checks = [{ id: "durata" as const, label: "Durata", ok: true, detail: "11 s din maximum 30" }];
  const made = { url: "blob:https://app.example/1", mimeType: "video/webm", plan, checks, model: "claude-opus-5-5", simulated: false };
  it("trimite contextul, marca și fotografiile la generator și păstrează scenariul cu verificările", async () => {
    let seen: { photos?: string[]; brand?: string } = {};
    const transport = campaignTransport(async (_context, brand, photos) => { seen = { photos, brand: brand.name }; return made; });
    expect(transport.supports("video", snapshot())).toBe(true);
    const result = await transport.generate("video", snapshot(), { brand: demoBrand, photos: ["data:image/jpeg;base64,AAAA"] });
    expect(seen).toEqual({ photos: ["data:image/jpeg;base64,AAAA"], brand: demoBrand.name });
    expect(result).toMatchObject({ url: made.url, model: "claude-opus-5-5", simulated: false, video: { plan, checks, type: "video/webm" } });
  });
  it("respinge un clip fără scenariu, un URL care nu e blob și o proveniență amestecată", () => {
    expect(() => validateAssetResult({ url: "/samples/marina.mp4", model: "claude-opus-5-5", simulated: false, video: { plan, checks, type: "video/mp4" } }, "video")).toThrow(/randat/);
    expect(() => validateAssetResult({ url: made.url, model: "claude-opus-5-5", simulated: false }, "video")).toThrow(/randat/);
    expect(() => validateAssetResult({ url: made.url, model: "mock", simulated: false, video: { plan, checks, type: "video/mp4" } }, "video")).toThrow(/Proveniența/);
  });
  it("după reîncărcare, clipul cere o randare nouă, nu un link mort", () => {
    const [job] = enqueueAsset([], "video", snapshot(), "v");
    const ready = { ...job, status: "ready" as const, result: { url: made.url, model: made.model, simulated: false, video: { plan, checks, type: "video/webm" as const } } };
    const [recovered] = recoverJobs([ready]);
    expect(recovered).toMatchObject({ status: "error", result: undefined });
    expect(recovered.error).toMatch(/Reîncearcă/);
  });
});

describe("persistența locală confirmată", () => {
  it("păstrează editările la reload, dar un brief nou are prioritate față de răspunsurile vechi", () => {
    const stored = { origin: campaignOrigin(brief), answers: { product: "Text editat în sidebar" }, description: "Descriere păstrată", clarifications: [], clarificationSimulated: false, jobs: [], importKey: JSON.stringify(brief.answers) };
    expect(restoreWorkspaceDraft(stored, brief, brief.answers).answers.product).toBe("Text editat în sidebar");
    const incoming = { ...brief, answers: { product: "Serviciu nou" } };
    expect(restoreWorkspaceDraft(stored, incoming, incoming.answers)).toMatchObject({ answers: { product: "Serviciu nou" }, description: "Descriere păstrată" });
  });
  it("restaurează draft și coadă separat pe origine", async () => {
    const local = storage();
    const origin = campaignOrigin(brief);
    const collection = workspaceCollection(origin, local);
    const data = { origin, answers, description: "Text ales", clarifications: [{ question: "Unde?", answer: "Pe site" }], clarificationSimulated: true, jobs: enqueueAsset([], "image", snapshot(), "first") };
    const saved = await collection.add(data);
    await collection.update(saved.id, { ...data, description: "Text editat" });
    expect((await workspaceCollection(origin, local).list())[0].data).toMatchObject({ description: "Text editat", answers, clarifications: data.clarifications, jobs: [{ id: "first" }] });
    expect(await workspaceCollection("https://alta-origine.ro", local).list()).toEqual([]);
  });
  it("nu confirmă scrierea când storage refuză sau pierde datele", async () => {
    const data = { origin: campaignOrigin(brief), answers, description: "Text", clarifications: [], clarificationSimulated: false, jobs: [] };
    const denied = workspaceCollection(data.origin, { getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } });
    await expect(denied.add(data)).rejects.toThrow("Quota exceeded");
    const discarded = workspaceCollection(data.origin, { getItem: () => null, setItem: () => {} });
    await expect(discarded.add(data)).rejects.toThrow(/nu a putut fi păstrată/);
  });
});
