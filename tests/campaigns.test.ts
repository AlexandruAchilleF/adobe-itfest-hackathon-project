import { describe, expect, it, vi } from "vitest";
import { sampleAnatomy } from "../src/lib/anatomy";
import { demoBrand } from "../src/lib/brand";
import { Campaign, campaignStatus, guardCampaign, makeKit, saveCampaign, seedCampaign } from "../src/lib/campaigns";
import { compose } from "../src/lib/compose";
import { createCollection, memoryBackend } from "../src/lib/store";

const answers = { product: "Gelato de iarnă", offer: "-20% azi", cta: "Comandă acum", formats: ["post", "story"] as Array<"post" | "story"> };
const input = { anatomy: sampleAnatomy, brand: demoBrand, answers, reference: "/ref.png" };
const copy = { title: "Gelato de iarnă", offer: "-20% azi", cta: "Comandă acum" };
const onBrand = { colors: demoBrand.colors.map((c) => c.hex), hashDistance: 30 };
const deps = (over = {}) => ({
  writeCopy: vi.fn(async () => copy),
  generateMascot: vi.fn(async () => "/generat.png"),
  checkMascot: vi.fn(async () => ({ ok: true, reason: "Seamănă cu Pip." })),
  signature: vi.fn(async () => onBrand),
  ...over,
});

describe("makeKit", () => {
  it("face câte un design pe format, cu ilustrația generată, și trece garda din prima", async () => {
    const d = deps();
    const kit = await makeKit(input, d);
    expect(Object.keys(kit.designs)).toEqual(["post", "story"]);
    expect(kit.designs.post?.elements.some((e) => e.type === "image" && e.src === "/generat.png")).toBe(true);
    expect(kit.checks.filter((c) => !c.ok)).toEqual([]);
    expect(kit.attempts).toBe(1);
    expect(d.generateMascot).toHaveBeenCalledTimes(1);
  });
  it("marchează verificarea mascotei ca AI și are verificarea de kit", async () => {
    const kit = await makeKit(input, deps());
    expect(kit.checks.find((c) => c.id === "mascot")?.source).toBe("ai");
    expect(kit.checks.find((c) => c.id === "kit")?.ok).toBe(true);
  });
  it("fără formate alese, face postarea", async () => {
    const kit = await makeKit({ ...input, answers: { ...answers, formats: [] } }, deps());
    expect(Object.keys(kit.designs)).toEqual(["post"]);
  });
  it("hero-ul nu e format de design", async () => {
    const kit = await makeKit({ ...input, answers: { ...answers, formats: ["hero", "story"] } }, deps());
    expect(Object.keys(kit.designs)).toEqual(["story"]);
  });
  it("generarea pică: compune cu mascota originală și garda spune asta", async () => {
    const kit = await makeKit(input, deps({ generateMascot: vi.fn(async () => { throw new Error("cota"); }) }));
    expect(kit.illustration).toBeNull();
    expect(kit.designs.post?.elements.some((e) => e.type === "image" && e.src === demoBrand.mascot.image)).toBe(true);
    expect(kit.checks.find((c) => c.id === "illustration-palette")?.message).toBe("Imaginea din marcă, generarea n-a reușit");
    expect(kit.checks.some((c) => c.id === "mascot")).toBe(false);
  });
  it("ilustrația nu trece garda nici după 2 reîncercări: se întoarce la mascota originală", async () => {
    const d = deps({ checkMascot: vi.fn(async () => ({ ok: false, reason: "e o cămilă" })) });
    const kit = await makeKit(input, d);
    expect(d.generateMascot).toHaveBeenCalledTimes(3);
    expect(kit.illustration).toBeNull();
    expect(kit.attempts).toBe(3);
    expect(kit.checks.find((c) => c.id === "illustration-palette")?.message).toBe("Imaginea din marcă, generarea n-a reușit");
  });
  it("corectează textele fără să regenereze ilustrația, trimițând ce a picat", async () => {
    const writeCopy = vi.fn(async (_failed: unknown[]) => copy);
    writeCopy.mockImplementationOnce(async () => ({ ...copy, offer: "-20% azi la 59 lei" }));
    const d = deps({ writeCopy });
    const kit = await makeKit(input, d);
    expect(kit.attempts).toBe(2);
    expect(d.generateMascot).toHaveBeenCalledTimes(1);
    expect(writeCopy.mock.calls[1][0]).toEqual(expect.arrayContaining([expect.objectContaining({ id: "price", ok: false })]));
  });
  it("AI-ul pentru texte pică de tot: textele vin din răspunsuri, kitul tot iese", async () => {
    const kit = await makeKit(input, deps({ writeCopy: vi.fn(async () => { throw new Error("rețea"); }) }));
    expect(kit.copy).toEqual(copy);
    expect(kit.error).toBe("rețea");
    expect(kit.designs.post).toBeDefined();
  });
});

describe("guardCampaign", () => {
  const post = compose(sampleAnatomy, demoBrand, copy, null, "post");
  const story = compose(sampleAnatomy, demoBrand, copy, null, "story");
  const run = (designs: { post?: typeof post; story?: typeof story }) => guardCampaign({ designs, brand: demoBrand, answers, copy });
  it("ține un singur rând pe verificare", () => {
    const ids = run({ post, story }).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("o verificare picată pe un singur format apare și spune unde", () => {
    const broken = { ...story, elements: story.elements.filter((e) => !e.id.startsWith("mandatory")) };
    const c = run({ post, story: broken }).find((x) => x.id === "mandatory");
    expect(c?.ok).toBe(false);
    expect(c?.message).toContain("Story");
  });
});

describe("campaignStatus", () => {
  it("verificat doar când trece tot", () => {
    expect(campaignStatus([{ id: "text", ok: true, message: "", source: "cod", fixable: true }])).toBe("verificat");
    expect(campaignStatus([{ id: "text", ok: false, message: "", source: "cod", fixable: true }])).toBe("respins");
  });
});

describe("saveCampaign", () => {
  const seed = seedCampaign();
  const collection = (storage: Pick<Storage, "getItem" | "setItem">) => createCollection("t:campanii", Campaign, [], memoryBackend(storage));
  const working = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };
  it("campania din seed trece schema", () => expect(Campaign.safeParse(seed).success).toBe(true));
  it("salvează și întoarce înregistrarea", async () => {
    expect((await saveCampaign(collection(working()), seed)).data.title).toBe(seed.title);
  });
  it("spațiul plin din browser dă o eroare, nu pierde campania în tăcere", async () => {
    const full = { getItem: () => "[]", setItem: () => { throw new DOMException("plin", "QuotaExceededError"); } };
    await expect(saveCampaign(collection(full), seed)).rejects.toThrow("Nu mai e loc în browser. Șterge o campanie veche.");
  });
});
