import { beforeEach, describe, expect, it, vi } from "vitest";
import { ask } from "../src/lib/ai";
import { CritiqueRequest, CritiqueResult, critiqueWithAi } from "../src/lib/critiqueClient";

vi.mock("../src/lib/ai", () => ({ ask: vi.fn() }));
const input = () => ({
  page: { url: "https://exemplu.ro", title: "Servicii", lang: "ro", metaDescription: "Consultanță", jsonLdTypes: ["Organization"], h1Count: 1, imagesWithoutAlt: 0 },
  elements: [{ id: "s1", tag: "button", role: "button", text: "Continuă", accessibleName: "Continuă", fontSizePx: 16, fontWeight: 400, color: "#111111", background: "#ffffff", box: { x: 0, y: 100, w: 120, h: 40 }, inFirstScreen: true, isLink: false, href: null, isButtonLike: false, isImage: false, alt: null, isHeadingLike: false }],
  viewport: { w: 1280, h: 800 },
});
const finding = (over: Record<string, unknown> = {}) => ({ elementId: "s1", category: "primary-action", level: "de-imbunatatit", title: "Butonul „Continuă”", body: "Eticheta nu spune ce urmează după apăsare.", fix: "Aș numi butonul după acțiunea reală.", basis: "text", quote: "Continuă", ...over });
const respond = (observations = [finding()], provider = "gemini") => vi.mocked(ask).mockResolvedValue({ data: { observations }, raw: { provider } } as never);
beforeEach(() => vi.clearAllMocks());

describe("critica AI", () => {
  it("precompletează brief-ul din același răspuns, numai cu dovezi valide", async () => {
    vi.mocked(ask).mockResolvedValue({ data: { observations: [], brief: {
      product: { value: "Servicii", evidence: "Servicii" },
      audience: { value: "Familii", evidence: "text inventat" },
    } }, raw: { provider: "gemini" } } as never);
    const result = await critiqueWithAi(input());
    expect(CritiqueResult.parse(result).suggestedAnswers).toEqual({ product: "Servicii" });
    expect(ask).toHaveBeenCalledTimes(1);
  });
  it("apelează modelul o singură dată cu criterii compacte și date citate", async () => {
    respond();
    const result = await critiqueWithAi(input());
    expect(ask).toHaveBeenCalledTimes(1);
    const args = vi.mocked(ask).mock.calls[0][0];
    expect(args.system).toContain("ierarhie");
    expect(args.system).toContain("neîncredere");
    expect(args.prompt.length).toBeLessThan(5000);
    expect(args.files).toBeUndefined();
    expect(result.mode).toBe("ai");
    expect(result.critiques[0]).toMatchObject({ ruleId: "ai-critique", elementId: "s1", evidence: { category: "primary-action" } });
  });
  it("nu raportează o pagină fără probleme când toate constatările sunt invalide", async () => {
    respond([finding({ elementId: "inventat" })]);
    await expect(critiqueWithAi(input())).rejects.toThrow(/constatări/i);
  });
  it("atașează screenshot JPEG și permite observații vizuale numai cu el", async () => {
    respond([finding({ basis: "visual", quote: "" })]);
    await expect(critiqueWithAi(input())).rejects.toThrow(/constatări/);
    const screenshot = "data:image/jpeg;base64,/9j/2Q==";
    const result = await critiqueWithAi({ ...input(), screenshot });
    expect(vi.mocked(ask).mock.calls[1][0].files).toEqual([screenshot]);
    expect(result.critiques).toHaveLength(1);
  });
  it("marchează provider mock și construiește constatări din intrarea reală", async () => {
    const data = input(); data.page.h1Count = 0;
    vi.mocked(ask).mockImplementation(async (options) => ({ data: options.mock, raw: { provider: "mock" } }) as never);
    const result = await critiqueWithAi(data);
    expect(result.mode).toBe("mock");
    expect(result.critiques.some((c) => c.ruleId === "pagina-fara-titlu")).toBe(true);
  });
  it("elimină ID-uri, citate și măsurători inventate, imperative și categorii repetate", async () => {
    respond([
      finding({ elementId: "necunoscut" }),
      finding({ quote: "ofertă inexistentă" }),
      finding({ body: "Conversiile scad cu 80%." }),
      finding({ fix: "Schimbă butonul." }),
      finding(),
    ]);
    const result = await critiqueWithAi(input());
    expect(result.critiques).toHaveLength(1);
    respond([finding(), finding({ elementId: null }), finding({ category: "navigation" })]);
    expect((await critiqueWithAi(input())).critiques).toHaveLength(1);
  });
  it("elimină comenzi ascunse după condițional și promisiuni de clasare", async () => {
    for (const observation of [
      finding({ fix: "Aș clarifica eticheta. Schimbă butonul acum." }),
      finding({ body: "Adaugă o etichetă clară." }),
      finding({ body: "Poziția în Google este garantată." }),
    ]) {
      respond([observation]);
      await expect(critiqueWithAi(input())).rejects.toThrow(/constatări/);
    }
  });
  it("păstrează cifrele din ținta citată, fără a inventa măsurători", async () => {
    const data = input();
    data.elements[0].text = "Prețuri 2026";
    respond([finding({ title: "Butonul „Prețuri 2026”", quote: "Prețuri 2026" })]);
    const result = await critiqueWithAi(data);
    expect(result.critiques[0]?.title).toBe("Butonul „Prețuri 2026”");
    expect(result.critiques[0]?.evidence.quote).toBe("Prețuri 2026");
    respond([finding({ quote: "Prețuri 2026", body: "Conversiile scad cu 80%." })]);
    await expect(critiqueWithAi(data)).rejects.toThrow(/constatări/);
    respond([finding({ quote: "Prețuri 2026", body: "Pagina pierde 2026 clienți." })]);
    await expect(critiqueWithAi(data)).rejects.toThrow(/constatări/);
  });
  it("acceptă observații descriptive și condiționale cu verbe care pot fi și imperative", async () => {
    respond([finding({ body: "Butonul cere o acțiune nespecificată.", fix: "Aș cere o etichetă care descrie acțiunea." })]);
    expect((await critiqueWithAi(input())).critiques).toHaveLength(1);
  });
  it("nu repetă familia de butoane sub o categorie diferită", async () => {
    const data = input(); data.elements.push({ ...data.elements[0], id: "s2", text: "Meniu" });
    respond([finding(), finding({ elementId: "s2", category: "navigation", quote: "Meniu" })]);
    expect((await critiqueWithAi(data)).critiques).toHaveLength(1);
  });
  it("validează limitele cererii și răspunsului", async () => {
    const data = input();
    expect(CritiqueRequest.safeParse({ ...data, elements: Array(201).fill(data.elements[0]) }).success).toBe(false);
    expect(CritiqueRequest.safeParse({ ...data, screenshot: "data:image/png;base64,aaaa" }).success).toBe(false);
    expect(CritiqueRequest.safeParse({ ...data, screenshot: "data:image/jpeg;base64," + "a".repeat(2 * 1024 * 1024) }).success).toBe(false);
    respond([finding({ body: "a".repeat(121) })]);
    await expect(critiqueWithAi(data)).rejects.toThrow();
  });
  it("include recomandări de căutare în același apel și validează dovezile", async () => {
    vi.mocked(ask).mockResolvedValue({ data: { observations: [finding()], searchOptimization: [
      { title: "Acțiune clară", query: "servicii de consultanță", proposal: "Aș descrie concret serviciul din pagina de consultanță.", status: "observed", evidence: "Continuă" },
      { title: "Indexare", query: "servicii", proposal: "Aș verifica accesul OAI-SearchBot în robots.txt.", status: "observed", evidence: "Servicii" },
      { title: "Prețuri", query: "servicii ieftine", proposal: "Aș publica prețurile verificate.", status: "observed", evidence: "preț fictiv" },
    ] }, raw: { provider: "gemini" } } as never);
    const result = await critiqueWithAi(input());
    expect(ask).toHaveBeenCalledTimes(1);
    expect(result.searchOptimization).toHaveLength(3);
    expect(result.searchOptimization[0].status).toBe("observed");
    expect(result.searchOptimization[1].status).toBe("needs-check");
    expect(result.searchOptimization[2].status).toBe("needs-check");
    expect(result.searchOptimization[2].evidence).toBe("");
    expect(CritiqueResult.parse(result).searchOptimization).toHaveLength(3);
    expect(CritiqueResult.parse({ critiques: [], mode: "ai" }).searchOptimization).toEqual([]);
  });
  it("respinge recomandări cu promisiuni, spam sau reduceri inventate", async () => {
    for (const proposal of [
      "Aș adăuga llms.txt obligatoriu.",
      "Aș garanta primul loc în Google.",
      "Aș promova reducerea de 80%.",
    ]) {
      vi.mocked(ask).mockResolvedValue({ data: { observations: [], searchOptimization: [
        { title: "Descoperire", query: "servicii consultanță", proposal, status: "needs-check", evidence: "" },
      ] }, raw: { provider: "gemini" } } as never);
      expect((await critiqueWithAi(input())).searchOptimization).toEqual([]);
    }
  });
  it("mock-ul propune căutări din pagina reală, fără verificări inventate", async () => {
    vi.mocked(ask).mockImplementation(async (options) => ({ data: options.mock, raw: { provider: "mock" } }) as never);
    const result = await critiqueWithAi(input());
    expect(result.searchOptimization.length).toBeGreaterThan(0);
    expect(result.searchOptimization[0].query).toContain("Servicii");
    expect(result.searchOptimization.every((item) => item.status === "needs-check")).toBe(true);
  });
  it("întrerupe apelul după zece secunde și propagă erorile", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(ask).mockReturnValue(new Promise(() => {}));
      const pending = critiqueWithAi(input());
      const assertion = expect(pending).rejects.toThrow(/timp/i);
      await vi.advanceTimersByTimeAsync(10_000);
      await assertion;
      expect(vi.mocked(ask).mock.calls[0][0].signal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
    vi.mocked(ask).mockRejectedValue(new Error("provider indisponibil"));
    await expect(critiqueWithAi(input())).rejects.toThrow("provider indisponibil");
  });
});
