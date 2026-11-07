import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type BrowserContext, chromium, expect, type Frame, type Page, test, type Worker } from "@playwright/test";
import { parseExtensionMessage } from "../src/lib/extensionBridge";

// Extensia Spire încărcată într-un Chromium real (headless nou, channel "chromium").
//
// De ce o copie a extensiei: manifestul din repo nu are host_permissions (regulă fixă), iar
// activeTab se acordă doar la un clic real pe iconiță, pe care Playwright nu îl poate face.
// Fără permisiune, chrome.scripting.executeScript din service worker ar eșua pe fixture.
// Așa că testul copiază chrome-extension/ într-un director temporar din os.tmpdir() și DOAR în
// copie adaugă host_permissions pentru originile de test și rescrie APP_URL din config.js.
// Fișierele din repo rămân neatinse; directorul temporar se șterge la final.

// Originea falsă pe care servim fixture-ul (prin context.route, fără server nou).
const SITE_ORIGIN = "http://spire-site.test";
// Adresa aplicației din iframe. Deocamdată e o origine falsă cu o dublură a aplicației (APP_DOUBLE),
// pentru că /nou nu există încă. În A3/B10 se schimbă pe portul serverului de test
// (ex. "http://localhost:5199") și se scoate ruta de mai jos, ca iframe-ul să încarce aplicația reală.
const APP_URL = "http://spire-app.test";
// O altă origine, ca să verificăm că mesajul spire:page nu pleacă spre oricine (targetOrigin).
const OTHER_ORIGIN = "http://spire-other.test";

// Ce face dublura aplicației la încărcare:
// - "raspunde": primește spire:page și trimite înapoi spire:picks (4 alegeri);
// - "tace": doar ține minte mesajele (testul trimite el alegerile, cu window.__reply());
// - "redirect": /nou trimite iframe-ul pe OTHER_ORIGIN (altă aplicație decât cea configurată).
let appMode: "raspunde" | "tace" | "redirect" = "raspunde";

// Dublura aplicației: ține minte mesajele primite și, la cerere, răspunde cu spire:picks.
// Alegerile de aici sunt doar o dublură de test, după text și tag; regulile reale stau în
// src/lib/campaign.ts, rulate de aplicație.
function appDouble(reply: boolean): string {
  return `<!doctype html><title>Spire</title><script>
window.__spireMessages = [];
window.__reply = function () {
  var els = (window.__spirePage && window.__spirePage.elements) || [];
  function find(test) { var e = els.find(test); return e ? e.id : null; }
  var picks = [
    { elementId: find(function (e) { return e.tag === "h1"; }), kind: "hero", score: 0.9, reason: "titlul din primul ecran" },
    { elementId: find(function (e) { return e.tag === "div" && e.text.indexOf("-20%") === 0; }), kind: "offer", score: 0.8, reason: "reducere" },
    { elementId: find(function (e) { return e.tag === "svg"; }), kind: "mascot", score: 0.7, reason: "imagine mare" },
    { elementId: find(function (e) { return e.tag === "a" && e.text === "Comandă acum"; }), kind: "cta", score: 0.6, reason: "buton scurt" }
  ];
  parent.postMessage({ type: "spire:picks", picks: picks }, "*");
};
window.addEventListener("message", function (event) {
  var data = event.data;
  window.__spireMessages.push({ origin: event.origin, fromParent: event.source === parent, type: data && data.type, receivedAt: Date.now() });
  if (!data || data.type !== "spire:page") return;
  window.__spirePage = data;
  if (${reply}) window.__reply();
});
</script>`;
}

// O pagină mare: 3000 de rânduri vizibile, fiecare cu text și două noduri în interior (9000 de noduri).
function bigPage(): string {
  const rows = Array.from({ length: 3000 }, (_, i) => `<div class="r">Rândul ${i} <span>detaliu</span> <b>${i}%</b></div>`).join("");
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Pagina mare</title>
<style>.r { padding: 2px 8px; font: 14px Arial; }</style></head>
<body><h1>Pagina mare</h1><a href="https://exemplu.ro/x" style="background:#C2410C;color:#fff">Cumpără</a>${rows}</body></html>`;
}

const EXT_SRC = join(process.cwd(), "chrome-extension");
const FIXTURE = join(process.cwd(), "e2e", "fixtures", "spire-site.html");

// Copia extensiei, cu permisiunile și adresa aplicației pentru test.
function prepareExtension(): string {
  const dir = mkdtempSync(join(tmpdir(), "spire-ext-"));
  cpSync(EXT_SRC, dir, { recursive: true });

  const manifestPath = join(dir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.host_permissions = [`${SITE_ORIGIN}/*`, `${APP_URL}/*`];
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const configPath = join(dir, "config.js");
  const config = readFileSync(configPath, "utf8");
  const rewritten = config.replace(/var APP_URL = "[^"]*";/, `var APP_URL = ${JSON.stringify(APP_URL)};`);
  if (rewritten === config) throw new Error("Nu găsesc APP_URL în config.js (s-a schimbat forma?)");
  writeFileSync(configPath, rewritten);
  return dir;
}

let extDir: string;
let userDataDir: string;
let context: BrowserContext;
let sw: Worker;

test.beforeAll(async () => {
  extDir = prepareExtension();
  userDataDir = mkdtempSync(join(tmpdir(), "spire-profile-"));
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  const html = { status: 200, contentType: "text/html; charset=utf-8" };
  await context.route(`${SITE_ORIGIN}/**`, (route) => {
    const body = new URL(route.request().url()).pathname === "/mare" ? bigPage() : readFileSync(FIXTURE, "utf8");
    return route.fulfill({ ...html, body });
  });
  await context.route(`${APP_URL}/**`, (route) => {
    // Navigarea din script (o redirecționare 302 prin route nu e urmată în iframe).
    if (appMode === "redirect") return route.fulfill({ ...html, body: `<script>location.replace(${JSON.stringify(`${OTHER_ORIGIN}/nou`)})</script>` });
    return route.fulfill({ ...html, body: appDouble(appMode === "raspunde") });
  });
  await context.route(`${OTHER_ORIGIN}/**`, (route) => route.fulfill({ ...html, body: appDouble(false) }));
  sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
});

test.afterAll(async () => {
  await context?.close();
  rmSync(extDir, { recursive: true, force: true });
  rmSync(userDataDir, { recursive: true, force: true });
});

// Ce face clicul pe iconiță: background.js injectează config.js și content.js în fila cu fixture-ul.
async function inject(): Promise<boolean> {
  return sw.evaluate(async (origin) => {
    type Chrome = {
      tabs: { query: (q: { url: string }) => Promise<Array<{ id?: number }>> };
    };
    const g = globalThis as unknown as { chrome: Chrome; injectSpire: (tabId: number) => Promise<boolean> };
    const [tab] = await g.chrome.tabs.query({ url: `${origin}/*` });
    if (!tab || tab.id == null) throw new Error("Nu găsesc fila cu fixture-ul");
    return g.injectSpire(tab.id);
  }, SITE_ORIGIN);
}

async function openFixture(): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${SITE_ORIGIN}/`);
  await expect(page.getByRole("heading", { name: "Cupe pentru dimineți lente" })).toBeVisible();
  return page;
}

// Cadrul iframe-ului Spire (din shadow root), după ce s-a încărcat de pe originea dată.
async function appFrame(page: Page, origin = APP_URL): Promise<Frame> {
  await expect.poll(() => page.frames().some((f) => f.url().startsWith(origin))).toBe(true);
  return page.frames().find((f) => f.url().startsWith(origin)) as Frame;
}

type Received = { origin: string; fromParent: boolean; type: unknown; receivedAt: number };
type PageMsg = {
  type: string;
  page: { url: string; title: string; headings: string[]; ctas: string[]; colors: string[]; fonts: string[] };
  elements: Array<{
    id: string;
    tag: string;
    text: string;
    box: { x: number; y: number; w: number; h: number };
    styles: Record<string, string>;
    imageSrc?: string;
    href?: string;
    inFirstScreen: boolean;
  }>;
};

async function received(frame: Frame): Promise<Received[]> {
  return frame.evaluate(() => (window as unknown as { __spireMessages: Received[] }).__spireMessages ?? []);
}

async function spirePage(frame: Frame): Promise<PageMsg> {
  await expect.poll(async () => (await received(frame)).filter((m) => m.type === "spire:page").length).toBeGreaterThan(0);
  return frame.evaluate(() => (window as unknown as { __spirePage: PageMsg }).__spirePage);
}

test.beforeEach(() => {
  appMode = "raspunde";
});

test("după injectare, Spire apare peste pagină: shadow root cu iframe la /nou?din=extensie", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);

  const root = page.locator("#spire-root");
  await expect(root).toHaveCount(1);
  expect(await root.evaluate((el) => el.shadowRoot !== null)).toBe(true);

  // Locatorii Playwright trec prin shadow root-urile deschise.
  const iframe = root.locator("iframe");
  await expect(iframe).toHaveCount(1);
  const src = await iframe.getAttribute("src");
  expect(src).toContain("/nou?din=extensie");
  expect(src?.startsWith(APP_URL)).toBe(true);

  // overlay.css s-a încărcat în shadow root (resursă web_accessible): panoul are 420 px.
  await expect(root.locator(".spire-panel")).toHaveCSS("width", "420px");

  // Pagina gazdă rămâne întreagă: titlul și butonul ei sunt tot acolo.
  await expect(page.getByRole("link", { name: "Comandă acum" })).toBeVisible();
  await page.close();
});

test("injectarea de două ori nu dublează stratul", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);
  expect(await inject()).toBe(true);
  await expect(page.locator("#spire-root")).toHaveCount(1);
  await expect(page.locator("#spire-root iframe")).toHaveCount(1);
  await page.close();
});

test("după încărcarea iframe-ului, aplicația primește spire:page cu elementele vizibile ale paginii", async () => {
  appMode = "tace";
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  const msg = await spirePage(frame);

  // Mesajul vine de la pagina gazdă (content script-ul rulează acolo), prin fereastra părinte.
  const first = (await received(frame)).find((m) => m.type === "spire:page");
  expect(first?.origin).toBe(SITE_ORIGIN);
  expect(first?.fromParent).toBe(true);

  // Mesajul trece schema aplicației (contractul din src/lib/extensionBridge.ts).
  expect(parseExtensionMessage(msg)?.type).toBe("spire:page");
  expect(msg.page.title).toBe("Cupe de Cafea Mocha - pagină de test");
  expect(msg.page.url).toBe(`${SITE_ORIGIN}/`);
  expect(msg.page.headings).toContain("Cupe pentru dimineți lente");
  expect(msg.page.ctas).toContain("Comandă acum");
  expect(msg.page.colors.length).toBeGreaterThan(0);
  expect(msg.page.colors.length).toBeLessThanOrEqual(10);
  expect(msg.page.fonts.length).toBeGreaterThan(0);
  expect(msg.page.fonts.length).toBeLessThanOrEqual(5);

  expect(msg.elements.length).toBeGreaterThan(0);
  expect(msg.elements.length).toBeLessThanOrEqual(200);
  const ids = msg.elements.map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const e of msg.elements) {
    expect(e.box.w).toBeGreaterThan(0);
    expect(e.box.h).toBeGreaterThan(0);
    expect(typeof e.styles.color).toBe("string");
    expect(typeof e.styles.background).toBe("string");
    expect(typeof e.styles.fontFamily).toBe("string");
    expect(typeof e.styles.fontSize).toBe("string");
    expect(typeof e.styles.fontWeight).toBe("string");
    // Cheile opționale lipsesc de tot (nu undefined), ca mesajul să treacă schema curat.
    if ("imageSrc" in e) expect(e.imageSrc).toMatch(/^(https?:|data:image\/)/);
    if ("href" in e) expect(e.href).toMatch(/^https?:/);
  }

  const tags = msg.elements.map((e) => e.tag);
  expect(tags).toEqual(expect.arrayContaining(["h1", "a", "svg", "section"]));
  // Nu coborâm în svg și nu citim propriul strat.
  expect(tags).not.toContain("path");
  expect(tags).not.toContain("iframe");
  expect(msg.elements.some((e) => e.text.includes("Închide Spire"))).toBe(false);

  const h1 = msg.elements.find((e) => e.tag === "h1");
  expect(h1?.text).toBe("Cupe pentru dimineți lente");
  expect(h1?.inFirstScreen).toBe(true);
  expect(h1?.styles.fontSize).toBe("56px");
  const cta = msg.elements.find((e) => e.tag === "a");
  expect(cta?.styles.background).toBe("rgb(194, 65, 12)");
  // href="#comanda" e rezolvat la adresa completă a paginii (http).
  expect(cta?.href).toBe(`${SITE_ORIGIN}/#comanda`);
  const footer = msg.elements.find((e) => e.tag === "footer");
  expect(footer?.inFirstScreen).toBe(false);
  await page.close();
});

test("după spire:picks, chenarele celor 4 elemente se aprind pe rând, cu etichete în română", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const root = page.locator("#spire-root");
  await expect(root.locator(".spire-box")).toHaveCount(4);
  await expect(root.locator(".spire-box.spire-box-lit")).toHaveCount(4);
  await expect(root.locator(".spire-box-label")).toHaveText(["hero", "ofertă", "mascotă", "buton"]);

  // Chenarul ofertei stă peste insigna din pagină (coordonatele viewport-ului).
  const badge = await page.locator(".badge").boundingBox();
  const offerBox = await root.locator(".spire-box").nth(1).boundingBox();
  expect(Math.abs((offerBox?.x ?? 0) - (badge?.x ?? 0))).toBeLessThan(2);
  expect(Math.abs((offerBox?.y ?? 0) - (badge?.y ?? 0))).toBeLessThan(2);

  // La scroll, chenarul urmează elementul.
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect
    .poll(async () => {
      const b = await page.locator(".badge").boundingBox();
      const o = await root.locator(".spire-box").nth(1).boundingBox();
      return Math.abs((o?.y ?? 0) - (b?.y ?? 0)) < 2;
    })
    .toBe(true);
  await page.close();
});

test("alegerile trimise din pagina gazdă sau greșite nu desenează chenare", async () => {
  appMode = "tace";
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  const msg = await spirePage(frame);
  const h1 = msg.elements.find((e) => e.tag === "h1");
  const root = page.locator("#spire-root");

  // Pagina gazdă (sau un script de pe ea) se dă drept aplicație: altă sursă, altă origine.
  await page.evaluate((id) => {
    window.postMessage({ type: "spire:picks", picks: [{ elementId: id, kind: "hero", score: 1, reason: "fals" }] }, "*");
  }, h1?.id);
  // Din iframe, dar cu date greșite: id necunoscut, fel necunoscut, nu e listă.
  await frame.evaluate((id) => {
    parent.postMessage({ type: "spire:picks", picks: [{ elementId: "nu-exista", kind: "hero", score: 1, reason: "x" }] }, "*");
    parent.postMessage({ type: "spire:picks", picks: [{ elementId: id, kind: "<b>rău</b>", score: 1, reason: "x" }] }, "*");
    parent.postMessage({ type: "spire:picks", picks: "hero" }, "*");
  }, h1?.id);
  await page.waitForTimeout(800);
  await expect(root.locator(".spire-box")).toHaveCount(0);

  // Control: aceleași alegeri, trimise corect de aplicație, se desenează.
  await frame.evaluate(() => (window as unknown as { __reply: () => void }).__reply());
  await expect(root.locator(".spire-box.spire-box-lit")).toHaveCount(4);
  await page.close();
});

test("spire:page pleacă doar spre originea aplicației, nu spre oricine (targetOrigin)", async () => {
  appMode = "redirect";
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const other = await appFrame(page, OTHER_ORIGIN);
  await page.waitForTimeout(800);
  expect((await received(other)).filter((m) => m.type === "spire:page")).toEqual([]);
  await page.close();
});

test("content.js nu folosește innerHTML și nu trimite mesaje cu „*”", () => {
  const src = readFileSync(join(EXT_SRC, "content.js"), "utf8");
  expect(src).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML/);
  expect(src).not.toMatch(/postMessage\([^)]*["'`]\*["'`]/);
});

test("pe o pagină cu 3000 de rânduri, scanarea dă cel mult 200 de elemente și termină repede", async () => {
  appMode = "tace";
  const page = await context.newPage();
  await page.goto(`${SITE_ORIGIN}/mare`);
  await expect(page.getByRole("heading", { name: "Pagina mare" })).toBeVisible();
  const start = Date.now();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  const msg = await spirePage(frame);
  const at = (await received(frame)).find((m) => m.type === "spire:page")?.receivedAt ?? Infinity;
  expect(at - start).toBeLessThan(3000);

  expect(msg.elements.length).toBeGreaterThan(0);
  expect(msg.elements.length).toBeLessThanOrEqual(200);
  expect(msg.page.title).toBe("Pagina mare");
  expect(parseExtensionMessage(msg)?.type).toBe("spire:page");
  // Prioritatea: titlul și butonul intră, chiar dacă sunt mii de rânduri.
  expect(msg.elements.some((e) => e.tag === "h1")).toBe(true);
  expect(msg.elements.find((e) => e.tag === "a")?.href).toBe("https://exemplu.ro/x");
  // Pagina răspunde după scanare.
  expect(await page.evaluate(() => document.title)).toBe("Pagina mare");
  await page.close();
});
