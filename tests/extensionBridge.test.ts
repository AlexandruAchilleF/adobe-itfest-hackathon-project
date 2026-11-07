import { describe, expect, it } from "vitest";
import { isFromExtension, parseExtensionMessage } from "../src/lib/extensionBridge";

const samplePage = { url: "https://exemplu.ro/", title: "Exemplu", headings: ["Titlu"], ctas: ["Comandă"], colors: ["#000000"], fonts: ["Geist"] };
const sampleElement = {
  id: "e1",
  tag: "img",
  text: "",
  box: { x: 0, y: 0, w: 100, h: 100 },
  styles: { color: "#000", background: "#fff", fontFamily: "Geist", fontSize: "16px", fontWeight: "400" },
  imageSrc: "https://exemplu.ro/a.png",
  inFirstScreen: true,
};
const image = "data:image/jpeg;base64,AAAA";
const root = { tag: "section", styles: { color: "#000" }, attrs: {}, children: [{ tag: "h1", text: "Titlu", styles: {}, attrs: { href: "https://exemplu.ro" }, children: [] }] };

describe("parseExtensionMessage", () => {
  it("acceptă spire:page", () => {
    expect(parseExtensionMessage({ type: "spire:page", page: samplePage, elements: [sampleElement] })?.type).toBe("spire:page");
  });
  it("acceptă spire:reference", () => {
    expect(parseExtensionMessage({ type: "spire:reference", image, elementIds: ["e1"] })).toEqual({ type: "spire:reference", image, elementIds: ["e1"] });
  });
  it("acceptă spire:section, cu arborele", () => {
    const m = parseExtensionMessage({ type: "spire:section", image, root, truncated: false });
    expect(m?.type === "spire:section" && m.root.children[0].text).toBe("Titlu");
  });
  it("respinge tipurile necunoscute și gunoiul", () => {
    expect(parseExtensionMessage({ type: "altceva" })).toBeNull();
    expect(parseExtensionMessage("<script>")).toBeNull();
    expect(parseExtensionMessage(null)).toBeNull();
    expect(parseExtensionMessage({ type: "spire:page", page: samplePage })).toBeNull();
  });
  it("imaginea trebuie să înceapă cu data:image/", () => {
    expect(parseExtensionMessage({ type: "spire:reference", image: "javascript:alert(1)", elementIds: [] })).toBeNull();
    expect(parseExtensionMessage({ type: "spire:section", image: "https://x.ro/a.png", root, truncated: false })).toBeNull();
  });
  it("respinge mai mult de 200 de elemente", () => {
    const elements = Array.from({ length: 201 }, (_, i) => ({ ...sampleElement, id: `e${i}` }));
    expect(parseExtensionMessage({ type: "spire:page", page: samplePage, elements })).toBeNull();
  });
  it("un arbore absurd de adânc nu aruncă", () => {
    let deep: unknown = { tag: "div", styles: {}, attrs: {}, children: [] };
    for (let i = 0; i < 200_000; i++) deep = { tag: "div", styles: {}, attrs: {}, children: [deep] };
    expect(() => parseExtensionMessage({ type: "spire:section", image, root: deep, truncated: true })).not.toThrow();
  });
});

describe("isFromExtension", () => {
  const parent = {} as Window;
  const win = (search: string) => ({ parent, location: { search }, document: { referrer: "https://site.test/" } }) as unknown as Window;
  const event = (source: unknown) => ({ source, origin: "https://site.test" }) as MessageEvent;

  it("adevărat doar de la fereastra părinte, cu din=extensie", () => {
    expect(isFromExtension(event(parent), win("?din=extensie"))).toBe(true);
  });
  it("fals de la altă fereastră", () => expect(isFromExtension(event({}), win("?din=extensie"))).toBe(false));
  it("fals fără din=extensie", () => expect(isFromExtension(event(parent), win(""))).toBe(false));
  it("fals cu altă valoare în din", () => expect(isFromExtension(event(parent), win("?din=altceva"))).toBe(false));
});
