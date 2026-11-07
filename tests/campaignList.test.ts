import { describe, expect, it } from "vitest";
import { attentionLabel, campaignSource, failedKey, guardSummary, materialsLabel, newCampaignStep, newestFirst, previewDesign, recentCampaigns, removeWithUndo } from "../src/lib/campaignList";
import { demoBrand } from "../src/lib/brand";
import { brandSample, Campaign, seedCampaign } from "../src/lib/campaigns";
import type { Check } from "../src/lib/guard";
import { hasPendingReference, setPendingReference, takePendingReference } from "../src/lib/pendingReference";
import { createCollection, memoryBackend, type Rec } from "../src/lib/store";

const seed = seedCampaign();
const rec = (id: string, createdAt: string): Rec<Campaign> => ({ id, created_at: "", data: { ...seed, createdAt } });
const check = (id: Check["id"], ok: boolean): Check => ({ id, ok, message: "", source: "cod", fixable: true });

describe("campaniile recente", () => {
  const items = [rec("a", "2026-11-05T10:00:00.000Z"), rec("b", "2026-11-07T10:00:00.000Z"), rec("c", "2026-11-06T10:00:00.000Z"), rec("d", "2026-11-01T10:00:00.000Z"), rec("e", "2026-11-03T10:00:00.000Z")];

  it("ia cele mai noi, după createdAt, nu după ordinea din store", () => {
    expect(recentCampaigns(items).map((r) => r.id)).toEqual(["b", "c", "a", "e"]);
  });
  it("respectă limita", () => {
    expect(recentCampaigns(items, 3).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });
  it("merge cu mai puține decât limita și cu lista goală", () => {
    expect(recentCampaigns(items.slice(0, 2)).map((r) => r.id)).toEqual(["b", "a"]);
    expect(recentCampaigns([])).toEqual([]);
  });
  it("nu schimbă lista primită", () => {
    const before = items.map((r) => r.id);
    newestFirst(items);
    expect(items.map((r) => r.id)).toEqual(before);
  });
});

describe("miniatura", () => {
  it("arată postarea", () => expect(previewDesign(seed)).toBe(seed.designs.post));
  it("are rezervă pe story", () => {
    const story = { ...seed, designs: { story: seed.designs.story } };
    expect(previewDesign(story)).toBe(seed.designs.story);
  });
  it("fără design nu inventează nimic", () => expect(previewDesign({ ...seed, designs: {} })).toBeNull());
});

describe("ce apare pe card și în gardă", () => {
  it("nimic când totul trece", () => expect(attentionLabel([check("price", true), check("cta", true)])).toBeNull());
  it("singular și plural", () => {
    expect(attentionLabel([check("price", false), check("cta", true)])).toBe("1 verificare de revăzut");
    expect(attentionLabel([check("price", false), check("cta", false)])).toBe("2 verificări de revăzut");
  });
  it("garda pe o linie numără ce trece", () => {
    expect(guardSummary([check("price", true), check("cta", false), check("kit", true)])).toBe("2 din 3 trec");
  });
  it("cheia gărzii e goală când trece tot și se schimbă când pică altceva", () => {
    expect(failedKey([check("price", true)])).toBe("");
    expect(failedKey([check("price", false), check("cta", true)])).toBe("price");
    expect(failedKey([check("price", false), check("cta", false)])).toBe("price,cta");
  });
  it("sursa are text și pentru imaginile încărcate", () => {
    expect(campaignSource({ source: null })).toBe("Imagine încărcată");
    expect(campaignSource({ source: { url: "https://x.ro", title: "Site X" } })).toBe("Site X");
  });
});

describe("ștergerea cu undo", () => {
  const collection = () => createCollection("test:undo", Campaign, [], memoryBackend());

  it("șterge pe loc, iar undo-ul aduce înapoi aceleași date", async () => {
    const list = collection();
    const older = await list.add({ ...seed, title: "Veche", createdAt: "2026-11-01T10:00:00.000Z" });
    const newer = await list.add({ ...seed, title: "Nouă", createdAt: "2026-11-02T10:00:00.000Z" });

    const undo = await removeWithUndo(list, older);
    expect((await list.list()).map((r) => r.data.title)).toEqual(["Nouă"]);

    const restored = await undo();
    expect(restored.data).toEqual(older.data);
    // locul din listă rămâne, deși înregistrarea e scrisă după cea mai nouă
    expect(newestFirst(await list.list()).map((r) => r.data.title)).toEqual(["Nouă", "Veche"]);
    expect(newer.id).not.toBe(restored.id);
  });

  it("fără undo, ștergerea rămâne", async () => {
    const list = collection();
    const only = await list.add(seed);
    await removeWithUndo(list, only);
    expect(await list.list()).toEqual([]);
  });
});

describe("pașii de pe /nou", () => {
  it("merg după ce există", () => {
    expect(newCampaignStep({ anatomy: null, kit: null })).toBe(0);
    expect(newCampaignStep({ anatomy: {}, kit: null })).toBe(1);
    expect(newCampaignStep({ anatomy: {}, kit: {} })).toBe(2);
  });
});

describe("imaginea trimisă de pe Acasă", () => {
  it("se citește o singură dată, ca o reîntoarcere pe /nou să n-o pornească din nou", () => {
    expect(hasPendingReference()).toBe(false);
    setPendingReference("/ref.png");
    expect(hasPendingReference()).toBe(true);
    expect(takePendingReference()).toBe("/ref.png");
    expect(takePendingReference()).toBeNull();
    expect(hasPendingReference()).toBe(false);
  });
});

describe("postarea de exemplu de pe /marca", () => {
  const edited = {
    ...demoBrand,
    colors: demoBrand.colors.map((c) => (c.role === "primary" ? { ...c, hex: "#112233" } : c)),
    fonts: { heading: "Georgia", body: "Arial" },
    mandatory: ["Doar azi."],
    mascot: { ...demoBrand.mascot, image: "/alta.png" },
  };
  const design = brandSample(edited);

  it("folosește culorile, fonturile, mențiunile și mascota din formular", () => {
    expect(design.elements.some((e) => e.type === "rect" && e.fill === "#112233")).toBe(true);
    expect(design.elements.some((e) => e.type === "text" && e.fontFamily === "Georgia")).toBe(true);
    expect(design.elements.some((e) => e.type === "text" && e.text === "Doar azi.")).toBe(true);
    expect(design.elements.some((e) => e.type === "image" && e.src === "/alta.png")).toBe(true);
  });
  it("are mărimea unei postări", () => {
    expect([design.width, design.height]).toEqual([1080, 1350]);
  });
});

describe("clipul campaniei", () => {
  const video = { url: "/clip.mp4", poster: "/clip.webp" };

  it("campaniile vechi, fără câmp, rămân valide și n-au semn", () => {
    const { video: _none, ...old } = seed;
    expect(Campaign.parse(old).video).toBeUndefined();
    expect(Campaign.parse({ ...old, video: null }).video).toBeNull();
    expect(materialsLabel(Campaign.parse(old))).toBeNull();
  });

  it("clipul se păstrează la citire, iar semnul apare doar lângă un afiș", () => {
    expect(Campaign.parse({ ...seed, video }).video).toEqual(video);
    expect(materialsLabel({ ...seed, video })).toBe("Afiș + clip");
    expect(materialsLabel({ designs: {}, video })).toBeNull();
    expect(() => Campaign.parse({ ...seed, video: { url: "/clip.mp4" } })).toThrow();
  });
});
