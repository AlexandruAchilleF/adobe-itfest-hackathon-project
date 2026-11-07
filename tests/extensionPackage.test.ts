// Pachetul extensiei: manifestul, iconițele și ZIP-ul din public/, comparat fișier cu fișier cu sursa.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { CHROME_STORE_URL, EXTENSION_ZIP, installAction, UNPACKED_HINT } from "../src/lib/extensionInstall";

const SRC = "chrome-extension";
const manifest = JSON.parse(readFileSync(join(SRC, "manifest.json"), "utf8"));

/** Citește un ZIP din directorul central (fără unelte externe). */
function readZip(path: string): Map<string, Buffer> {
  const zip = readFileSync(path);
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(eocd + 10);
  let at = zip.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLen = zip.readUInt16LE(at + 28);
    const extraLen = zip.readUInt16LE(at + 30);
    const commentLen = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLen);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(start, start + size);
    if (!name.endsWith("/")) files.set(name, method === 0 ? raw : inflateRawSync(raw));
    at += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function walk(dir: string, base = ""): string[] {
  return readdirSync(dir).flatMap((f) => {
    const rel = base ? `${base}/${f}` : f;
    return statSync(join(dir, f)).isDirectory() ? walk(join(dir, f), rel) : [rel];
  });
}

describe("manifestul", () => {
  it("cere doar permisiunile folosite", () => {
    expect(manifest.permissions).toEqual(["activeTab", "scripting", "storage"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
  });

  it("are iconițe PNG cu mărimea declarată, cu transparență", () => {
    expect(Object.keys(manifest.icons)).toEqual(["16", "32", "48", "128"]);
    for (const [size, file] of Object.entries<string>(manifest.icons)) {
      const png = readFileSync(join(SRC, file));
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(Number(size));
      expect(png.readUInt32BE(20)).toBe(Number(size));
      expect(png[25], `${file}: RGBA`).toBe(6);
    }
  });
});

describe("ZIP-ul din public/", () => {
  const files = readZip(`public${EXTENSION_ZIP}`);
  const prodUrl = 'var APP_URL = "https://adobe-itfest-hackathon-project.vercel.app";';

  it("are manifest.json în rădăcină și nimic de test sau documentație", () => {
    expect(files.has("manifest.json")).toBe(true);
    for (const name of files.keys()) expect(name).not.toMatch(/readme|\.md$|test|spec/i);
  });

  it("are adresa publică; sursa rămâne pe localhost", () => {
    expect(files.get("config.js")?.toString()).toContain(prodUrl);
    expect(readFileSync(join(SRC, "config.js"), "utf8")).toContain('var APP_URL = "http://localhost:5173";');
  });

  it("are critica, dar nu și semnalul de filmare", () => {
    expect(files.has("critique.js")).toBe(true);
    expect(files.get("config.js")?.toString()).not.toContain("DEMO_INSPIRE_RESULT");
    expect(readFileSync(join(SRC, "config.js"), "utf8")).not.toContain("DEMO_INSPIRE_RESULT");
  });

  it("e la zi cu chrome-extension/ (altfel: npm run ext:zip)", () => {
    // aceeași regulă ca scripts/build-extension-zip.mjs: fără documentație și fără teste (ex. tests/)
    const skip = /(^readme(\.|$)|\.md$|\.(test|spec)\.|^tests?$|^__tests__$)/i;
    const expected = walk(SRC).filter((f) => !f.split("/").some((part) => skip.test(part))).sort();
    expect([...files.keys()].sort()).toEqual(expected);
    for (const name of expected) {
      if (name === "config.js") continue;
      expect(files.get(name)?.equals(readFileSync(join(SRC, name))), `${name} nu e la zi. Rulează: npm run ext:zip`).toBe(true);
    }
  });
});

describe("butonul de instalare", () => {
  it("fără link descarcă ZIP-ul și arată pașii", () => {
    expect(installAction("")).toEqual({ kind: "download", label: "Descarcă extensia", href: EXTENSION_ZIP, hint: UNPACKED_HINT });
  });

  it("cu link duce la magazin, fără linia cu pașii", () => {
    expect(installAction("https://chromewebstore.google.com/detail/x")).toEqual({ kind: "store", label: "Adaugă în Chrome", href: "https://chromewebstore.google.com/detail/x" });
  });

  it("linkul e gol până există fișa din magazin", () => {
    expect(CHROME_STORE_URL).toBe("");
  });
});
