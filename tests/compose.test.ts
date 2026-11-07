import { describe, expect, it } from "vitest";
import { sampleAnatomy } from "../src/lib/anatomy";
import { brandColor, brandPalette, demoBrand } from "../src/lib/brand";
import { compose, copyFromAnswers, FORMATS } from "../src/lib/compose";
import { contrastRatio, estimateTextHeight } from "../src/lib/accessibility";
import { Design, type DesignElement } from "../src/lib/design";

const copy = { title: "Gelato de iarnă", offer: "-20% azi", cta: "Comandă acum" };
const ILLUSTRATION = "data:image/png;base64,AAA";
const texts = (els: DesignElement[]) => els.filter((e) => e.type === "text");

describe("compose", () => {
  const post = compose(sampleAnatomy, demoBrand, copy, ILLUSTRATION, "post");
  const story = compose(sampleAnatomy, demoBrand, copy, null, "story");

  it("are mărimea formatului", () => {
    expect([post.width, post.height]).toEqual([1080, 1350]);
    expect([story.width, story.height]).toEqual([FORMATS.story.width, 1920]);
  });
  it("rezultatul trece schema Design", () => {
    expect(Design.safeParse(post).success).toBe(true);
    expect(Design.safeParse(story).success).toBe(true);
  });
  it("pune toate textele omului pe design", () => {
    expect(texts(post.elements).map((e) => e.type === "text" && e.text)).toEqual(expect.arrayContaining(Object.values(copy)));
  });
  it("folosește doar culorile mărcii, plus alb", () => {
    const fills = post.elements.flatMap((e) => ("fill" in e && e.fill ? [e.fill] : []));
    for (const f of [post.background, ...fills]) expect([...brandPalette(demoBrand), "#FFFFFF"]).toContain(f.toUpperCase());
  });
  it("fundalul e cel al mărcii", () => expect(post.background).toBe(brandColor(demoBrand, "background")));
  it("ilustrația generată intră în zona ei", () => {
    expect(post.elements.some((e) => e.type === "image" && e.src === ILLUSTRATION)).toBe(true);
  });
  it("fără ilustrație generată, intră mascota originală", () => {
    expect(story.elements.some((e) => e.type === "image" && e.src === demoBrand.mascot.image)).toBe(true);
  });
  it("logo-ul apare doar dacă marca are unul", () => {
    expect(post.elements.some((e) => e.id === "logo")).toBe(false);
    const withLogo = compose(sampleAnatomy, { ...demoBrand, logo: "/logo.png" }, copy, null, "post");
    expect(withLogo.elements.some((e) => e.type === "image" && e.src === "/logo.png")).toBe(true);
  });
  it("titlul are fontul de titlu, restul fontul de text", () => {
    const font = (id: string) => post.elements.find((e) => e.id === id);
    expect(font("title")).toMatchObject({ fontFamily: demoBrand.fonts.heading });
    expect(font("offer")).toMatchObject({ fontFamily: demoBrand.fonts.body });
    expect(font("cta")).toMatchObject({ fontFamily: demoBrand.fonts.body });
  });
  it("textul CTA stă pe un dreptunghi cu culoarea principală și are contrast bun", () => {
    const bg = post.elements.find((e) => e.id === "cta-bg");
    const cta = post.elements.find((e) => e.id === "cta");
    expect(bg).toMatchObject({ type: "rect", fill: brandColor(demoBrand, "primary") });
    expect(post.elements.indexOf(bg!)).toBeLessThan(post.elements.indexOf(cta!));
    expect(contrastRatio(cta!.type === "text" ? cta!.fill : "", brandColor(demoBrand, "primary"))).toBeGreaterThanOrEqual(4.5);
  });
  it("mențiunile obligatorii sunt pe design", () => {
    expect(texts(post.elements).some((e) => e.type === "text" && e.text === demoBrand.mandatory[0])).toBe(true);
  });
  it("textul încape în zona lui, chiar dacă e lung", () => {
    const long = { ...copy, title: "Un titlu foarte foarte lung, care nu încape deloc pe un singur rând" };
    const d = compose(sampleAnatomy, demoBrand, long, null, "post");
    const title = d.elements.find((e) => e.id === "title");
    if (title?.type !== "text") throw new Error("lipsește titlul");
    expect(estimateTextHeight(title.text, title.fontSize, title.width)).toBeLessThanOrEqual(sampleAnatomy.zones[0].box.h * 1350);
  });
  it("la story zonele își păstrează ordinea verticală și lățimea", () => {
    const y = (d: typeof post, id: string) => {
      const e = d.elements.find((x) => x.id === id);
      return e && "y" in e ? e.y : -1;
    };
    expect(y(story, "title")).toBeLessThan(y(story, "offer"));
    expect(y(story, "offer")).toBeLessThan(y(story, "cta"));
    const width = (d: typeof post) => (d.elements.find((e) => e.id === "cta-bg") as { width: number }).width;
    expect(width(story)).toBe(width(post));
  });
  it("ilustrația nu se deformează: caseta rămâne pătrată", () => {
    const art = story.elements.find((e) => e.id === "art");
    if (art?.type !== "image") throw new Error("lipsește ilustrația");
    expect(art.width).toBe(art.height);
  });
  it("o zonă fără text nu lasă un buton gol", () => {
    const d = compose(sampleAnatomy, demoBrand, { title: "x" }, null, "post");
    expect(d.elements.some((e) => e.id === "cta-bg" || e.id === "offer-bg")).toBe(false);
  });
});

describe("copyFromAnswers", () => {
  const answers = { product: "Gelato de iarnă", offer: "-20% azi", cta: "Comandă acum" };
  it("pune răspunsurile pe zonele lor", () => {
    expect(copyFromAnswers(sampleAnatomy, answers)).toEqual({ title: "Gelato de iarnă", offer: "-20% azi", cta: "Comandă acum" });
  });
  it("oferta conține prețul exact, dacă există", () => {
    expect(copyFromAnswers(sampleAnatomy, { ...answers, price: "49 lei" }).offer).toBe("-20% azi, 49 lei");
  });
  it("taie titlul la lungimea zonei, nu și oferta sau butonul", () => {
    const copy = copyFromAnswers(sampleAnatomy, { ...answers, product: "x".repeat(100), cta: "y".repeat(30) });
    expect(copy.title).toHaveLength(sampleAnatomy.zones[0].maxChars);
    expect(copy.cta).toHaveLength(30);
  });
});
