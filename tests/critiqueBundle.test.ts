// Pachetul pentru extensie (chrome-extension/critique.js) e generat din src/lib/critique.ts.
// Testul verifică două lucruri: că e la zi și că, încărcat într-un context gol, se poartă ca modulul TS.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { critiquePage, summarySentence, type ElementFacts, type PageFacts } from "../src/lib/critique";

const root = resolve(__dirname, "..");
const bundlePath = resolve(root, "chrome-extension/critique.js");

describe("pachetul criticii pentru extensie", () => {
  const code = readFileSync(bundlePath, "utf8");

  it("e la zi (regenerarea dă același conținut)", () => {
    const fresh = execFileSync(process.execPath, [resolve(root, "scripts/build-critique.mjs"), "--stdout"], { cwd: root, encoding: "utf8" });
    expect(fresh === code, "chrome-extension/critique.js nu e la zi. Rulează: npm run ext:critique").toBe(true);
  });

  it("are antetul și nu are importuri rămase", () => {
    expect(code.startsWith("// Generat din src/lib/critique.ts; nu-l edita de mână. Rulează: npm run ext:critique")).toBe(true);
    expect(code).not.toMatch(/^\s*import\s/m);
    expect(code).not.toMatch(/^\s*export\s/m);
    expect(code).not.toContain("import.meta");
    expect(code).not.toMatch(/\brequire\(/);
  });

  it("într-un context gol expune SpireCritique și dă același rezultat ca modulul TS", () => {
    const ctx = vm.createContext({});
    vm.runInContext(code, ctx);
    const api = vm.runInContext("globalThis.SpireCritique", ctx) as {
      critiquePage: typeof critiquePage;
      summarySentence: typeof summarySentence;
    };
    expect(typeof api.critiquePage).toBe("function");
    expect(typeof api.summarySentence).toBe("function");

    const page: PageFacts = {
      url: "https://exemplu.ro/",
      title: "Exemplu",
      lang: "",
      metaDescription: "",
      jsonLdTypes: [],
      h1Count: 0,
      imagesWithoutAlt: 1,
    };
    const base = {
      role: "",
      accessibleName: "",
      fontWeight: 400,
      color: "#111111",
      background: "#ffffff",
      inFirstScreen: true,
      isLink: false,
      href: null,
      isButtonLike: false,
      isImage: false,
      alt: null,
      isHeadingLike: false,
    };
    const els: ElementFacts[] = [
      { ...base, id: "a", tag: "div", text: "Gelateria", fontSizePx: 44, isHeadingLike: true, box: { x: 0, y: 20, w: 300, h: 50 } },
      { ...base, id: "b", tag: "div", text: "Comandă acum", accessibleName: "Comandă acum", fontSizePx: 16, color: "rgb(249, 192, 208)", isButtonLike: true, box: { x: 0, y: 300, w: 140, h: 44 } },
      { ...base, id: "c", tag: "a", text: "click aici", accessibleName: "click aici", fontSizePx: 16, isLink: true, href: "/arome", box: { x: 0, y: 400, w: 80, h: 20 } },
      { ...base, id: "d", tag: "img", text: "", fontSizePx: 16, isImage: true, box: { x: 0, y: 500, w: 600, h: 400 } },
    ];
    const view = { w: 1280, h: 800 };
    const fromBundle = api.critiquePage(page, els, view);
    const fromTs = critiquePage(page, els, view);
    expect(fromTs.length).toBeGreaterThan(3);
    // obiectele vin din alt context: le comparăm prin JSON
    expect(JSON.parse(JSON.stringify(fromBundle))).toEqual(fromTs);
    expect(api.summarySentence(fromBundle)).toBe(summarySentence(fromTs));
  });

  it("expune și partea de AI a criticii", () => {
    const ctx = vm.createContext({});
    vm.runInContext(code, ctx);
    const types = vm.runInContext("['critiqueAiRequest','acceptAiCritiques','mergeAiCritiques'].map(function(n){return typeof globalThis.SpireCritique[n];})", ctx);
    expect(Array.from(types as string[])).toEqual(["function", "function", "function"]);
  });
});
