import { execFileSync } from "node:child_process";
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
// copie adaugă host_permissions pentru originile de test (plus "<all_urls>" pentru captură, vezi
// prepareExtension) și rescrie APP_URL din config.js.
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
// Dacă dublura cere singură scanarea la încărcare (spire:scan), ca aplicația reală la „Scanează pagina”.
// content.js nu mai scanează la `load`-ul iframe-ului; fără cererea asta nu vine spire:page.
let appScan = true;
let appReadyAuto = true;
let aiMode: "error" | "mock" | "silent" | "long" = "error";

// Dublura aplicației: ține minte mesajele primite și, la cerere, răspunde cu spire:picks.
// Alegerile de aici sunt doar o dublură de test, după text și tag; regulile reale stau în
// src/lib/campaign.ts, rulate de aplicație.
function appDouble(reply: boolean, scan: boolean): string {
  return `<!doctype html><title>Spire</title><script>
window.__spireMessages = [];
window.__briefReady = function () { parent.postMessage({type:"spire:brief-ready"}, "*"); };
// Ce trimite aplicația reală la „Scanează pagina” (src/lib/extensionPanel.ts, scanRequest).
window.__scan = function () { parent.postMessage({ type: "spire:scan" }, "*"); };
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
  if (data && data.type === "spire:brief") window.__spireBrief = data.brief;
  window.__spireMessages.push({ origin: event.origin, fromParent: event.source === parent, type: data && data.type, receivedAt: Date.now() });
  if (!data) return;
  if (data.type === "spire:critique-request") {
    window.__critiqueRequest = data;
    if (${JSON.stringify(aiMode)} === "silent") return;
    var c={elementId:data.input.elements[0]?.id || null,ruleId:"ai-critique",level:"important",title:"Titlul nu explică produsul",body:"Valoarea produsului rămâne neclară.",fix:"Aș numi produsul în titlu.",agent:"",evidence:{category:"purpose"}};
    var crits = ${JSON.stringify(aiMode)} === "long" ? ["oferta", "navigarea", "produsul"].map(function(topic,index){return {...c,elementId:null,fix:"Aș prezenta " + topic + " într-o secțiune clară, cu informații verificate despre serviciu, disponibilitate și condiții, astfel încât vizitatorii să poată lua o decizie informată.",evidence:{category:["purpose","hierarchy","navigation"][index]}};}) : [c];
    parent.postMessage({type:"spire:critique-result",requestId:data.requestId, ...(${JSON.stringify(aiMode)} === "error" ? {error:true} : {result:{critiques:crits,mode:"mock"}})}, "*");
    return;
  }
  // Referința (A3): o arătăm ca aplicația reală, cu titlul „Ce am văzut”, și o ținem minte.
  if (data.type === "spire:reference" && typeof data.image === "string" && data.image.indexOf("data:image/jpeg") === 0 && Array.isArray(data.elementIds)) {
    window.__spireReference = data;
    if (!document.getElementById("vazut")) {
      var h = document.createElement("h2");
      h.id = "vazut";
      h.textContent = "Ce am văzut";
      document.body.appendChild(h);
    }
    return;
  }
  if (data.type !== "spire:page") return;
  window.__spirePage = data;
  if (${reply}) window.__reply();
});
if (${appReadyAuto}) window.__briefReady();
if (${scan} && !new URLSearchParams(location.search).has("critique")) window.__scan();
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
  // "<all_urls>": chrome.tabs.captureVisibleTab cere fie activeTab (acordat la clicul real pe
  // iconiță, pe care testul nu îl poate face), fie <all_urls>. Doar în copie, ca dublură a clicului.
  manifest.host_permissions = [`${SITE_ORIGIN}/*`, `${APP_URL}/*`, "<all_urls>"];
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const configPath = join(dir, "config.js");
  const config = readFileSync(configPath, "utf8");
  const rewritten = config.replace(/var APP_URL = "[^"]*";/, `var APP_URL = ${JSON.stringify(APP_URL)};`);
  if (rewritten === config) throw new Error("Nu găsesc APP_URL în config.js (s-a schimbat forma?)");
  writeFileSync(configPath, rewritten);
  const contentPath = join(dir, "content.js");
  writeFileSync(contentPath, "globalThis.__spireTestSpeed = 0.08;globalThis.__spireTestAiTimeoutScale = 0.08;\n" + readFileSync(contentPath, "utf8")
    .replace("var facts=readFacts();", "var facts=readFacts();bird.dataset.facts=JSON.stringify(facts);")
    .replace("var elements=[], visited=0, h1=0, missing=0;", "var rectReads=0, originalRect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){rectReads++;return originalRect.call(this);};var elements=[], visited=0, h1=0, missing=0;")
    .replace('bird.dataset.analyzed=String(elements.length);', 'Element.prototype.getBoundingClientRect=originalRect;bird.dataset.rectReads=String(rectReads);bird.dataset.analyzed=String(elements.length);'));
  return dir;
}

let extDir: string;
let context: BrowserContext;
let sw: Worker;
const profiles: string[] = [];

// Un Chromium cu extensia și rutele de test. Al doilea (ecran cu densitate 2) se pornește în testul lui.
async function launch(options: { deviceScaleFactor?: number; args?: string[] } = {}): Promise<{ context: BrowserContext; sw: Worker }> {
  const userDataDir = mkdtempSync(join(tmpdir(), "spire-profile-"));
  profiles.push(userDataDir);
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: options.deviceScaleFactor,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`, ...(options.args ?? [])],
  });
  const html = { status: 200, contentType: "text/html; charset=utf-8" };
  await ctx.route(`${SITE_ORIGIN}/**`, (route) => {
    const body = new URL(route.request().url()).pathname === "/mare" ? bigPage() : readFileSync(FIXTURE, "utf8");
    const headers: Record<string, string> = new URL(route.request().url()).pathname === "/csp" ? { "Content-Security-Policy": "default-src 'none'; style-src 'none'; img-src 'none'; frame-src 'none'" } : {};
    return route.fulfill({ ...html, headers, body });
  });
  await ctx.route(`${APP_URL}/**`, (route) => {
    // Navigarea din script (o redirecționare 302 prin route nu e urmată în iframe).
    if (appMode === "redirect") return route.fulfill({ ...html, body: `<script>location.replace(${JSON.stringify(`${OTHER_ORIGIN}/nou`)})</script>` });
    return route.fulfill({ ...html, body: appDouble(appMode === "raspunde", appScan) });
  });
  // Și aplicația străină cere scanarea: content.js o refuză (altă origine), deci nu pleacă nimic.
  await ctx.route(`${OTHER_ORIGIN}/**`, (route) => route.fulfill({ ...html, body: appDouble(false, true) }));
  const worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
  return { context: ctx, sw: worker };
}

test.beforeAll(async () => {
  extDir = prepareExtension();
  ({ context, sw } = await launch());
});

test.afterAll(async () => {
  await context?.close();
  rmSync(extDir, { recursive: true, force: true });
  for (const dir of profiles) rmSync(dir, { recursive: true, force: true });
});

// Ce face clicul pe iconiță: background.js injectează config.js și content.js în fila cu fixture-ul.
async function inject(worker: Worker = sw): Promise<boolean> {
  return worker.evaluate(async (origin) => {
    type Chrome = {
      tabs: { query: (q: { url: string }) => Promise<Array<{ id?: number }>> };
    };
    const g = globalThis as unknown as { chrome: Chrome; injectSpire: (tabId: number) => Promise<boolean> };
    const [tab] = await g.chrome.tabs.query({ url: `${origin}/*` });
    if (!tab || tab.id == null) throw new Error("Nu găsesc fila cu fixture-ul");
    return g.injectSpire(tab.id);
  }, SITE_ORIGIN);
}

async function openFixture(ctx: BrowserContext = context): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(`${SITE_ORIGIN}/`);
  await expect(page.getByRole("heading", { name: "Cupe pentru dimineți lente" })).toBeVisible();
  return page;
}

// Cadrul iframe-ului Spire (din shadow root), după ce s-a încărcat de pe originea dată.
async function appFrame(page: Page, origin = APP_URL): Promise<Frame> {
  await page.locator("#spire-root").getByRole("button", { name: "Spire, deschide meniul" }).click();
  await page.locator("#spire-root").getByRole("button", { name: "Fă o campanie", exact: true }).click();
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
  appScan = true;
  aiMode = "error";
  appReadyAuto = true;
});

test("după injectare, Spire apare peste pagină: shadow root cu iframe la /nou?din=extensie", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);

  const root = page.locator("#spire-root");
  await expect(root).toHaveCount(1);
  expect(await root.evaluate((el) => el.shadowRoot !== null)).toBe(true);

  await expect(root.locator("iframe")).toHaveCount(0);
  await appFrame(page);
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
  await expect(page.locator("#spire-root iframe")).toHaveCount(0);
  await expect(page.locator("#spire-root")).toBeHidden();
  expect(await inject()).toBe(true);
  await expect(page.locator("#spire-root .spire-bird")).toBeVisible();
  await page.close();
});

test("scanarea pornește doar la spire:scan: întâi linia de scanare, apoi spire:page; a doua cerere în curs se ignoră", async () => {
  appMode = "tace";
  appScan = false;
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  const root = page.locator("#spire-root");
  const line = root.locator(".spire-boxes .spire-scanline");

  // Fără cerere: iframe-ul s-a încărcat, dar pagina nu se scanează singură.
  await page.waitForTimeout(2000);
  expect((await received(frame)).filter((m) => m.type === "spire:page")).toEqual([]);
  await expect(line).toHaveCount(0);

  // Două cereri la rând: linia apare în shadow root (fără să prindă clicuri), apoi vine o singură scanare.
  await frame.evaluate(() => {
    const w = window as unknown as { __scan: () => void };
    w.__scan();
    w.__scan();
  });
  await expect(line).toHaveCount(1);
  await expect(line).toHaveCSS("pointer-events", "none");
  const msg = await spirePage(frame);
  expect(parseExtensionMessage(msg)?.type).toBe("spire:page");
  await expect(line).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect((await received(frame)).filter((m) => m.type === "spire:page")).toHaveLength(1);

  // După ce s-a terminat, o cerere nouă scanează din nou.
  await frame.evaluate(() => (window as unknown as { __scan: () => void }).__scan());
  await expect.poll(async () => (await received(frame)).filter((m) => m.type === "spire:page").length).toBe(2);
  await page.close();
});

test("după spire:scan, aplicația primește spire:page cu elementele vizibile ale paginii", async () => {
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
  await appFrame(page);
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

// ---------------------------------------------------------------------------------------------
// A3: captura, decupajul și referința (spire:reference).
// ---------------------------------------------------------------------------------------------

type Reference = { type: string; image: string; elementIds: string[] };

// Referința primită de dublura aplicației, după ce a apărut „Ce am văzut”.
async function reference(frame: Frame): Promise<Reference> {
  await expect(frame.getByText("Ce am văzut")).toBeVisible();
  return frame.evaluate(() => (window as unknown as { __spireReference: Reference }).__spireReference);
}

async function referenceCount(frame: Frame): Promise<number> {
  return (await received(frame)).filter((m) => m.type === "spire:reference").length;
}

// Dimensiunile imaginii și, la cerere, culoarea câtorva pixeli (coordonate în imagine).
async function imageInfo(frame: Frame, image: string, points: Array<[number, number]> = []) {
  return frame.evaluate(
    async ({ image, points }) => {
      const img = new Image();
      img.src = image;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.drawImage(img, 0, 0);
      const pixels = points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)));
      return { w: img.naturalWidth, h: img.naturalHeight, pixels };
    },
    { image, points },
  );
}

// Dreptunghi tras cu mouse-ul real, în coordonatele viewport-ului.
async function drag(page: Page, from: [number, number], to: [number, number]) {
  await page.mouse.move(from[0], from[1]);
  await page.mouse.down();
  await page.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, { steps: 4 });
  await page.mouse.move(to[0], to[1], { steps: 4 });
  await page.mouse.up();
}

function near(actual: number, expected: number, tolerance = 3) {
  expect(Math.abs(actual - expected), `${actual} față de ${expected}`).toBeLessThanOrEqual(tolerance);
}

type Box = { x: number; y: number; width: number; height: number };

// Ce element vede pagina sub un punct: id-ul elementului sau „spire-root” pentru stratul Spire.
async function hitAt(page: Page, x: number, y: number): Promise<string> {
  return page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.id || el.tagName.toLowerCase() : "";
  }, [x, y] as const);
}

test("Strânge, apoi clic real pe chenarul mascotei: decupajul mascotei, JPEG, cu id-ul ei; panoul se redeschide", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  const msg = await spirePage(frame);
  const mascot = msg.elements.find((e) => e.tag === "svg");
  const root = page.locator("#spire-root");
  const panel = root.locator(".spire-panel");
  const tab = root.getByRole("button", { name: "Deschide panoul Spire" });
  await expect(root.locator(".spire-box.spire-box-lit")).toHaveCount(4);

  // Stratul nu prinde clicuri în afara chenarelor: sub (20, 650) e tot pagina.
  expect(await hitAt(page, 20, 650)).not.toBe("spire-root");

  // Mascota stă sub panoul de 420 px: un clic real acolo nimerește panoul.
  const svg = (await page.locator("svg.mascot").boundingBox()) as Box;
  const mx = svg.x + svg.width / 2;
  const my = svg.y + svg.height / 2;
  expect(await hitAt(page, mx, my)).toBe("spire-root");

  // Strânge: rămâne fila de ~44 px la margine, iframe-ul rămâne încărcat (aceeași fereastră).
  const before = await frame.evaluate(() => performance.timeOrigin);
  await root.getByRole("button", { name: "Strânge panoul Spire" }).click();
  await expect(panel).toBeHidden();
  await expect(tab).toBeVisible();
  const tabBox = (await tab.boundingBox()) as Box;
  near(tabBox.width, 44, 1);
  near(tabBox.x + tabBox.width, page.viewportSize()?.width ?? 0, 1);
  expect(frame.isDetached()).toBe(false);
  expect(await frame.evaluate(() => performance.timeOrigin)).toBe(before);

  // Interiorul chenarului lasă clicul spre pagină; doar marginea îl prinde.
  expect(await hitAt(page, mx, my)).not.toBe("spire-root");
  const mascotBox = root.locator(".spire-box").nth(2);
  await expect(mascotBox.locator(".spire-box-edge-top")).toHaveCSS("cursor", "pointer");
  const edge = (await mascotBox.locator(".spire-box-edge-left").boundingBox()) as Box;
  const ex = edge.x + edge.width / 2;
  const ey = edge.y + edge.height / 2;
  expect(await hitAt(page, ex, ey)).toBe("spire-root");

  // Două clicuri reale la rând: al doilea vine cât captura e în curs și se ignoră.
  await page.mouse.click(ex, ey);
  await page.mouse.click(ex, ey);

  const ref = await reference(frame);
  expect(parseExtensionMessage(ref)?.type).toBe("spire:reference");
  expect(ref.elementIds).toEqual([mascot?.id]);
  expect(ref.image.startsWith("data:image/jpeg")).toBe(true);

  // Panoul s-a deschis singur, ca omul să vadă „Ce am văzut”; fila a dispărut.
  await expect(panel).toBeVisible();
  await expect(tab).toBeHidden();
  expect(await frame.evaluate(() => performance.timeOrigin)).toBe(before);

  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const info = await imageInfo(frame, ref.image);
  near(info.w, svg.width * dpr);
  near(info.h, svg.height * dpr);
  expect(Math.max(info.w, info.h)).toBeLessThanOrEqual(1080);

  await page.waitForTimeout(800);
  expect(await referenceCount(frame)).toBe(1);

  // Fila redeschide panoul și cu mâna.
  await root.getByRole("button", { name: "Strânge panoul Spire" }).click();
  await tab.click();
  await expect(panel).toBeVisible();
  await page.close();
});

test("Decupează: dreptunghiul tras cu mouse-ul ajunge în aplicație; Esc anulează, cele mici se ignoră", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  await spirePage(frame);
  const root = page.locator("#spire-root");
  const crop = root.locator(".spire-crop");
  const button = root.getByRole("button", { name: "Decupează" });

  // Fără mod de decupaj, stratul nu prinde clicuri.
  await expect(crop).toBeHidden();

  // Esc anulează.
  await button.click();
  await expect(crop).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(crop).toBeHidden();

  // Un dreptunghi mai mic de 20×20 nu trimite nimic; modul rămâne deschis.
  await button.click();
  await drag(page, [100, 150], [110, 158]);
  await page.waitForTimeout(500);
  expect(await referenceCount(frame)).toBe(0);
  await expect(crop).toBeVisible();

  await drag(page, [100, 150], [500, 450]);
  const ref = await reference(frame);
  expect(parseExtensionMessage(ref)?.type).toBe("spire:reference");
  await expect(crop).toBeHidden();
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const info = await imageInfo(frame, ref.image);
  near(info.w, 400 * dpr);
  near(info.h, 300 * dpr);

  // elementIds: elementele scanate aflate în mare parte în dreptunghi (aici titlul, nu mascota).
  const msg = await spirePage(frame);
  const known = new Set(msg.elements.map((e) => e.id));
  for (const id of ref.elementIds) expect(known.has(id)).toBe(true);
  expect(ref.elementIds).toContain(msg.elements.find((e) => e.tag === "h1")?.id);
  expect(ref.elementIds).not.toContain(msg.elements.find((e) => e.tag === "svg")?.id);
  await page.close();
});

test("captura nu conține stratul Spire: sub panou și sub decupaj e culoarea paginii", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const frame = await appFrame(page);
  await spirePage(frame);
  const root = page.locator("#spire-root");
  await expect(root.locator(".spire-box.spire-box-lit")).toHaveCount(4);

  // Un fond simplu (#FFF4D6) sub hero, de la x=700 (pagina) până la x=1250 (sub panoul alb, care
  // începe la 860). Dreptunghiul începe pe pagină; mouse-ul trece apoi peste panou.
  await root.getByRole("button", { name: "Decupează" }).click();
  await drag(page, [700, 590], [1250, 700]);
  const ref = await reference(frame);
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  // (750, 640) e sub stratul de decupaj (umbrit); (1100, 640) e sub panou (alb, #ffffff).
  const info = await imageInfo(frame, ref.image, [
    [Math.round(50 * dpr), Math.round(50 * dpr)],
    [Math.round(400 * dpr), Math.round(50 * dpr)],
  ]);
  for (const [r, g, b] of info.pixels) {
    near(r, 0xff, 8);
    near(g, 0xf4, 8);
    near(b, 0xd6, 8);
  }
  // Și stratul e la loc după captură.
  await expect(root.locator(".spire-panel")).toBeVisible();
  await expect(root.locator(".spire-box.spire-box-lit")).toHaveCount(4);
  await page.close();
});

test("cu deviceScaleFactor 2, decupajul are de două ori mai mulți pixeli, dar tot cel mult 1080", async () => {
  // deviceScaleFactor din Playwright e doar emulare (Emulation.setDeviceMetricsOverride): pagina vede
  // devicePixelRatio 2, dar captureVisibleTab dă tot o imagine 1x. Un ecran 2x adevărat vine din
  // --force-device-scale-factor=2; deviceScaleFactor: 2 rămâne ca emularea să nu-l readucă la 1.
  const hi = await launch({ deviceScaleFactor: 2, args: ["--force-device-scale-factor=2"] });
  try {
    const page = await openFixture(hi.context);
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
    expect(await inject(hi.sw)).toBe(true);
    const frame = await appFrame(page);
    const msg = await spirePage(frame);
    const root = page.locator("#spire-root");
    await expect(root.locator(".spire-box.spire-box-lit")).toHaveCount(4);

    // Clic real pe eticheta chenarului butonului (în stânga, nu e sub panou). Interiorul chenarului
    // lasă clicul spre pagină, deci ținta e eticheta.
    const cta = (await page.getByRole("link", { name: "Comandă acum" }).boundingBox()) as Box;
    const label = (await root.locator(".spire-box-label", { hasText: "buton" }).boundingBox()) as Box;
    await page.mouse.click(label.x + label.width / 2, label.y + label.height / 2);
    const ref = await reference(frame);
    expect(ref.elementIds).toEqual([msg.elements.find((e) => e.tag === "a")?.id]);
    const info = await imageInfo(frame, ref.image);
    near(info.w, cta.width * 2, 4);
    near(info.h, cta.height * 2, 4);

    // Un dreptunghi de 600×300 px CSS are 1200×600 px în captură: se micșorează la 1080×540.
    await frame.evaluate(() => {
      (window as unknown as { __spireReference: unknown }).__spireReference = null;
    });
    await page.waitForTimeout(600); // captureVisibleTab: cel mult 2 capturi pe secundă
    await root.getByRole("button", { name: "Decupează" }).click();
    await drag(page, [80, 100], [680, 400]);
    await expect.poll(() => referenceCount(frame)).toBe(2);
    const big = await frame.evaluate(() => (window as unknown as { __spireReference: Reference }).__spireReference);
    const bigInfo = await imageInfo(frame, big.image);
    expect(bigInfo.w).toBe(1080);
    near(bigInfo.h, 540, 2);
    await page.close();
  } finally {
    await hi.context.close();
  }
});

test("content.js trimite referința doar spre APP_ORIGIN, iar background.js captează doar pentru extensie", () => {
  const content = readFileSync(join(EXT_SRC, "content.js"), "utf8");
  expect(content).toMatch(/type: "spire:reference"[\s\S]*config\.APP_ORIGIN/);
  const background = readFileSync(join(EXT_SRC, "background.js"), "utf8");
  expect(background).toMatch(/sender\.id !== chrome\.runtime\.id/);
  expect(background).toMatch(/captureVisibleTab/);
});

test("uliul pornește fără panou și se plimbă singur", async () => {
  const page = await openFixture();
  expect(await inject()).toBe(true);
  const bird = page.locator("#spire-root .spire-bird");
  await expect(bird).toBeVisible();
  const drawing = bird.locator('.spire-pose.show svg');
  await expect(drawing).toBeVisible();
  const rendered = await drawing.evaluate((el) => ({ namespace: el.namespaceURI, svg: el instanceof SVGSVGElement,
    width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
  expect(rendered.namespace).toBe("http://www.w3.org/2000/svg");
  expect(rendered.svg).toBe(true);
  expect(rendered.width).toBeGreaterThan(100);
  expect(rendered.height).toBeGreaterThan(100);
  await expect(page.locator("#spire-root iframe")).toHaveCount(0);
  const before = await bird.getAttribute("style");
  await expect.poll(() => bird.getAttribute("style")).not.toBe(before);
  await appFrame(page);
  await expect(page.locator("#spire-root iframe")).toHaveAttribute("src", APP_URL + "/nou?din=extensie&hostOrigin=" + encodeURIComponent(SITE_ORIGIN));
  await page.close();
});

async function startCritique(page: Page) {
  const root = page.locator("#spire-root");
  await root.getByRole("button", { name: "Spire, deschide meniul" }).click();
  await root.getByRole("button", { name: "Critică pagina", exact: true }).click();
  await expect(root.locator(".spire-bubble .spire-level")).toBeVisible();
}

test("fundalul oklch necunoscut nu devine alb în verificarea contrastului", async () => {
  const page = await openFixture();
  await page.evaluate(() => { document.body.innerHTML = '<h1>Test</h1><p style="background:oklch(30% .1 250);color:white">Text lizibil</p>'; });
  await inject(); await startCritique(page);
  const facts = JSON.parse((await page.locator("#spire-root .spire-bird").getAttribute("data-facts"))!);
  expect(facts.elements.find((e: { text: string }) => e.text === "Text lizibil").background).toBe("");
  await page.close();
});

test("citirea copiilor respectă plafonul și pe o pagină foarte lată", async () => {
  const page = await openFixture();
  await page.evaluate(() => { document.body.innerHTML = '<h1>Test</h1>' + '<span>x</span>'.repeat(20000); });
  await inject(); await startCritique(page);
  expect(Number(await page.locator("#spire-root .spire-bird").getAttribute("data-rect-reads"))).toBeLessThan(15000);
  await page.close();
});

test("meniul deschis în zbor anulează turul și permite reluarea plimbării", async () => {
  const page = await openFixture(); await inject();
  const root = page.locator("#spire-root"), bird = root.locator(".spire-bird");
  await bird.click(); await root.getByRole("button", { name: "Critică pagina", exact: true }).click();
  // Viteza accelerată face zborul mai scurt decât intervalul implicit de polling.
  await expect.poll(() => bird.getAttribute("class"), { intervals: [5] }).toMatch(/flap|glide/);
  await bird.dispatchEvent("click");
  await page.keyboard.press("Escape");
  await expect(root.locator(".spire-bubble")).toBeHidden();
  const stopped = await bird.getAttribute("style");
  await expect.poll(() => bird.getAttribute("style"), { timeout: 4000 }).not.toBe(stopped);
  await page.close();
});

test("critica aterizează, conturează elementul, avansează și termină cu rezumat", async () => {
  const page = await openFixture();
  await inject();
  await startCritique(page);
  const root = page.locator("#spire-root");
  await expect(root.locator(".spire-bubble p")).toHaveCount(1);
  await expect(root.locator(".spire-bubble")).not.toContainText("Pentru asistenții AI");
  await expect(root.locator(".spire-bird")).toHaveClass(/perched/);
  await expect(root.locator(".spire-bird")).not.toHaveClass(/flap/);
  await expect(root.locator('.spire-pose.show[data-pose="perched"]')).toHaveCount(1);
  await expect(root.locator(".spire-crit-outline")).toBeVisible();
  const first = await root.locator(".spire-bubble h2").textContent();
  await root.getByRole("button", { name: "Următorul" }).click();
  await expect.poll(() => root.locator(".spire-bubble h2").textContent()).not.toBe(first);
  for (let i = 0; i < 8 && !(await root.locator(".spire-bubble").getAttribute("data-summary")); i++) {
    const next = root.getByRole("button", { name: "Următorul" });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(450);
  }
  await expect(root.locator('.spire-bubble[data-summary="true"]')).toBeVisible();
  await page.close();
});

test("CSP strict: uliul are stiluri și critica folosește fallback când iframe e blocat", async () => {
  const page = await context.newPage();
  await page.goto(SITE_ORIGIN + "/csp");
  await inject();
  const bird = page.locator("#spire-root .spire-bird");
  await expect(bird).toHaveCSS("position", "fixed");
  await expect(bird).toHaveCSS("width", "140px");
  await startCritique(page);
  await expect(page.locator("#spire-root .spire-panel")).toBeHidden();
  await expect(page.locator("#spire-root .spire-bubble")).toContainText("Verificări locale");
  await page.locator("#spire-root").getByRole("button", { name: "Oprește" }).click();
  await expect(page.locator("#spire-root .spire-bubble")).toBeHidden();
  await page.close();
});

test("critica plafonează lectura și păstrează textul HTML ca text", async () => {
  const page = await context.newPage();
  await page.goto(SITE_ORIGIN + "/mare");
  await page.evaluate(() => {
    document.body.replaceChildren();
    const bad = document.createElement("a");
    bad.href = "#";
    bad.style.cssText = "display:block;color:#eee;background:white";
    bad.textContent = "<img src=x onerror=alert(1)>";
    document.body.append(bad);
    for (let i = 0; i < 5000; i++) {
      const p = document.createElement("p"); p.textContent = "Rând " + i; document.body.append(p);
    }
  });
  await inject();
  await startCritique(page);
  const root = page.locator("#spire-root");
  await expect(root.locator(".spire-bubble")).toContainText("<img src=x onerror=alert(1)>");
  await expect(root.locator(".spire-bubble img")).toHaveCount(0);
  expect(Number(await root.locator(".spire-bird").getAttribute("data-analyzed"))).toBeLessThanOrEqual(200);
  await page.close();
});

test("faptele separă textul propriu, controalele reale, butonul fals și numele ARIA", async () => {
  const page = await openFixture();
  await page.evaluate(() => {
    document.body.replaceChildren();
    const wrap = document.createElement("div");
    const button = document.createElement("button");
    button.style.cursor = "pointer";
    const span = document.createElement("span"); span.textContent = "Control real";
    button.append(span); wrap.append(button);
    const fake = document.createElement("div"); fake.style.cursor = "pointer";
    const leaf = document.createElement("span"); leaf.textContent = "Control fals"; fake.append(leaf); wrap.append(fake);
    const image = document.createElement("img"); image.setAttribute("aria-label", "Cană ilustrată"); image.width = 180; image.height = 180;
    image.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'/>";
    wrap.append(image); document.body.append(wrap);
  });
  await inject(); await startCritique(page);
  const facts = JSON.parse((await page.locator("#spire-root .spire-bird").getAttribute("data-facts"))!);
  expect(facts.elements.filter((e: { isButtonLike: boolean }) => e.isButtonLike).map((e: { text: string }) => e.text)).toEqual(["Control fals"]);
  expect(facts.elements.some((e: { tag: string }) => e.tag === "body")).toBe(false);
  expect(facts.elements.find((e: { tag: string }) => e.tag === "img").accessibleName).toBe("Cană ilustrată");
  await page.close();
});

async function finishCritique(page: Page) {
  await startCritique(page);
  const root = page.locator("#spire-root");
  for (let i=0;i<14 && !(await root.locator('.spire-bubble').getAttribute('data-summary'));i++) {
    const next=root.getByRole('button',{name:'Următorul'});
    if(await next.isVisible()) await next.click();
    await page.waitForTimeout(200);
  }
  await expect(root.getByRole('textbox')).toHaveCount(1);
}

async function completeBrief(page: Page) {
  const root=page.locator('#spire-root');
  for(let i=0;i<4 && await root.getByRole('button',{name:'Continuă',exact:true}).isVisible();i++) {
    const input=root.getByRole('textbox');
    if(!(await input.inputValue()).trim()) await input.fill('Răspuns confirmat');
    await root.getByRole('button',{name:'Continuă',exact:true}).click();
  }
  await expect(root.getByRole('button',{name:'Păstrează răspunsurile'})).toBeVisible();
}

test('brief: arată o singură întrebare și așteaptă răspunsul înainte de următoarea', async () => {
  const page = await openFixture(); await inject(); await finishCritique(page);
  const root = page.locator('#spire-root');
  await expect(root.getByRole('textbox')).toHaveCount(1);
  await expect(root.getByRole('textbox',{name:'Cui te adresezi?'})).toHaveCount(0);
  await expect(root.getByRole('textbox')).not.toHaveValue('');
  await root.getByRole('textbox').fill('');
  await expect(root.getByRole('button',{name:'Continuă',exact:true})).toBeDisabled();
  await root.getByRole('textbox',{name:'Ce produs sau serviciu promovezi?'}).fill('Cazare');
  await root.getByRole('button',{name:'Continuă',exact:true}).click();
  await expect(root.getByRole('textbox',{name:'Cui te adresezi?'})).toBeVisible();
  await expect(root.getByRole('textbox')).toHaveCount(1);
  await expect(root.locator('.spire-answer')).toContainText('Cazare');
  await page.close();
});

test("brief: memorie a extensiei, reîncărcare, uitare și transfer doar după ready valid", async () => {
  appScan = false;
  const page = await openFixture(); await inject(); await finishCritique(page);
  let root = page.locator('#spire-root');
  await root.getByRole('textbox',{name:'Ce produs sau serviciu promovezi?'}).fill('Cana mea');
  await root.getByRole('button',{name:'Continuă',exact:true}).click();
  await root.getByRole('textbox',{name:'Cui te adresezi?'}).fill('Părinți');
  await completeBrief(page);
  await root.getByRole('button',{name:'Păstrează răspunsurile'}).click();
  await expect(root.getByRole('status')).toContainText('Răspunsuri păstrate.');
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  await page.reload(); await inject(); await finishCritique(page);
  root=page.locator('#spire-root');
  await expect(root.getByRole('textbox',{name:'Ce produs sau serviciu promovezi?'})).toHaveValue('Cana mea');
  await inject(); await inject();
  await root.getByRole('button',{name:'Continuă',exact:true}).click();
  await expect(root.getByRole('textbox',{name:'Cui te adresezi?'})).toHaveValue('Părinți');
  await completeBrief(page);
  await root.getByRole('button',{name:'Continuă cu o campanie'}).click();
  await expect.poll(()=>page.frames().some(f=>f.url().startsWith(APP_URL))).toBe(true);
  const frame=page.frames().find(f=>f.url().startsWith(APP_URL))!;
  expect((await received(frame)).filter(m=>m.type==='spire:brief').length).toBeGreaterThanOrEqual(1);
  const briefCount=(await received(frame)).filter(m=>m.type==='spire:brief').length;
  // Mesaj cu originea corectă, dar de la fereastra greșită.
  await page.evaluate(origin=>window.dispatchEvent(new MessageEvent('message',{origin,source:window,data:{type:'spire:brief-ready'}})),APP_URL);
  // Sursa corectă, originea greșită.
  await page.evaluate(()=>{const win=document.querySelector('#spire-root')!.shadowRoot!.querySelector('iframe')!.contentWindow;window.dispatchEvent(new MessageEvent('message',{origin:'https://evil.test',source:win,data:{type:'spire:brief-ready'}}));});
  expect((await received(frame)).filter(m=>m.type==='spire:brief')).toHaveLength(briefCount);
  await frame.evaluate(()=> (window as unknown as {__briefReady:()=>void}).__briefReady());
  await expect.poll(async()=> (await received(frame)).filter(m=>m.type==='spire:brief').length).toBeGreaterThanOrEqual(1);
  expect(await frame.evaluate(()=> (window as unknown as {__spireBrief:unknown}).__spireBrief)).toMatchObject({source:{url:SITE_ORIGIN+'/'},answers:{product:'Cana mea',audience:'Părinți'}});
  expect((await received(frame)).filter(m=>m.type==='spire:page')).toHaveLength(0);
  await frame.goto(APP_URL+'/nou?din=extensie');
  await frame.evaluate(()=> (window as unknown as {__briefReady:()=>void}).__briefReady());
  await expect.poll(async()=> (await received(frame)).filter(m=>m.type==='spire:brief').length).toBeGreaterThanOrEqual(1);
  await page.reload(); await inject(); await finishCritique(page);
  await root.getByRole('button',{name:'Uită răspunsurile'}).click();
  await expect(root.getByRole('textbox',{name:'Ce produs sau serviciu promovezi?'})).toHaveValue('');
  await expect(root.getByRole('textbox',{name:'Cui te adresezi?'})).toHaveCount(0);
  await page.reload(); await inject(); await finishCritique(page);
  await expect(root.getByRole('textbox',{name:'Ce produs sau serviciu promovezi?'})).not.toHaveValue('Cana mea');
  await page.close();
});

test('AI: un singur apel corelat, panou ascuns, rezultat simulat și brief final', async () => {
  aiMode='mock'; appScan=false;
  const page=await openFixture(); await inject(); await finishCritique(page); await completeBrief(page);
  const root=page.locator('#spire-root');
  const frame=page.frames().find(f=>f.url().startsWith(APP_URL))!;
  await expect(root.locator('.spire-panel')).toBeHidden();
  await expect(root.locator('.spire-bubble')).toContainText('Analiză simulată');
  expect((await received(frame)).filter(m=>m.type==='spire:critique-request')).toHaveLength(1);
  expect((await received(frame)).filter(m=>m.type==='spire:brief')).toHaveLength(0);
  await root.getByRole('button',{name:'Modifică răspunsurile'}).click();
  await root.getByRole('textbox',{name:'Ce produs sau serviciu promovezi?'}).fill('Produs final');
  await completeBrief(page);
  await root.getByRole('button',{name:'Continuă cu o campanie'}).click();
  await expect(root.locator('.spire-panel')).toBeVisible();
  await expect.poll(()=>frame.evaluate(()=> (window as unknown as {__spireBrief?:{answers:{product:string}}}).__spireBrief?.answers.product)).toBe('Produs final');
  expect(await frame.evaluate(()=> (window as unknown as {__spireBrief:unknown}).__spireBrief)).toMatchObject({critique:{mode:'mock',items:[{title:'Titlul nu explică produsul',proposal:'Aș numi produsul în titlu.'}]}});
  const request=await frame.evaluate(()=> (window as unknown as {__critiqueRequest:{input:{screenshot?:string}}}).__critiqueRequest);
  if(request.input.screenshot) { const info=await imageInfo(frame,request.input.screenshot);expect(Math.max(info.w,info.h)).toBeLessThanOrEqual(960); }
  await page.close();
});

test('AI: ignoră surse/ID greșite și rezultate după anulare; timeout explicit local', async () => {
  aiMode='silent';appScan=false;
  const page=await openFixture();await inject();
  const root=page.locator('#spire-root');
  await root.getByRole('button',{name:'Spire, deschide meniul'}).click();
  await root.getByRole('button',{name:'Critică pagina',exact:true}).click();
  await expect.poll(()=>page.frames().some(f=>f.url().startsWith(APP_URL))).toBe(true);
  const frame=page.frames().find(f=>f.url().startsWith(APP_URL))!;
  await expect.poll(()=>frame.evaluate(()=>Boolean((window as unknown as {__critiqueRequest?:unknown}).__critiqueRequest))).toBe(true);
  const requestId=await frame.evaluate(()=> (window as unknown as {__critiqueRequest:{requestId:string}}).__critiqueRequest.requestId);
  const result={critiques:[],mode:'mock'};
  await page.evaluate(({requestId,result})=>window.dispatchEvent(new MessageEvent('message',{origin:'https://evil.test',source:document.querySelector('#spire-root')!.shadowRoot!.querySelector('iframe')!.contentWindow,data:{type:'spire:critique-result',requestId,result}})),{requestId,result});
  await frame.evaluate(result=>parent.postMessage({type:'spire:critique-result',requestId:'wrong',result},'*'),result);
  await expect(root.locator('.spire-bubble')).toContainText('Analizez pagina');
  await root.getByRole('button',{name:'Oprește',exact:true}).click();
  await frame.evaluate(({requestId,result})=>parent.postMessage({type:'spire:critique-result',requestId,result},'*'),{requestId,result});
  await expect(root.locator('.spire-bubble')).toBeHidden();
  await startCritique(page);
  await expect(root.locator('.spire-bubble')).toContainText('Verificări locale · AI indisponibil');
  await expect(root.locator('.spire-panel')).toBeHidden();
  await page.close();
});

test("ZIP-ul de pe landing page se încarcă în Chromium, cu adresa publică și fără sidePanel", async () => {
  const dir = mkdtempSync(join(tmpdir(), "spire-zip-"));
  const profile = mkdtempSync(join(tmpdir(), "spire-zip-profile-"));
  execFileSync("unzip", ["-q", join(process.cwd(), "public", "spire-extensie.zip"), "-d", dir]);
  const ctx = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
  });
  try {
    const worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
    const seen = await worker.evaluate(() => {
      const g = globalThis as unknown as { chrome: { runtime: { getManifest(): { permissions: string[]; icons: Record<string, string> } } }; SPIRE_CONFIG: { APP_URL: string } };
      const m = g.chrome.runtime.getManifest();
      return { permissions: m.permissions, icons: Object.keys(m.icons), appUrl: g.SPIRE_CONFIG.APP_URL };
    });
    expect(seen).toEqual({ permissions: ["activeTab", "scripting", "storage"], icons: ["16", "32", "48", "128"], appUrl: "https://spire-coral.vercel.app" });
  } finally {
    await ctx.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true });
  }
});

// Dublura lui /api/ai, în service worker. `delayMs` simulează un model lent; primele observații se leagă de <h1>.
async function fakeCritiqueAi(mode: { status?: number; delayMs?: number; model?: string }) {
  await sw.evaluate((m) => {
    const g = globalThis as unknown as { __realFetch?: typeof fetch; __aiBody?: unknown; fetch: typeof fetch };
    g.__realFetch ??= g.fetch;
    g.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!String(input).endsWith("/api/ai")) return g.__realFetch!(input, init);
      const body = JSON.parse(String(init?.body));
      g.__aiBody = { attachment: body.attachments?.[0]?.mimeType, size: body.attachments?.[0]?.data?.length, hasSchema: Boolean(body.schema) };
      await new Promise((r) => setTimeout(r, m.delayMs ?? 0));
      if (m.status) return new Response(JSON.stringify({ error: "picat" }), { status: m.status });
      const id = (/"id":"(crit-\d+)","tag":"h1"/.exec(body.prompt) ?? [])[1];
      const observations = [
        { elementId: id, level: "important", title: "Titlul nu spune oferta", body: "Nu e clar ce primește vizitatorul.", fix: "Spune oferta în titlu." },
        { elementId: "inventat", level: "important", title: "Observație inventată", body: "x", fix: "y" },
      ];
      return new Response(JSON.stringify({ provider: "gemini", model: m.model ?? "gemini-3.8-flash", text: "", data: { observations }, ms: 1 }));
    }) as typeof fetch;
  }, mode);
}


// Contractul service worker-ului rămâne disponibil separat de transportul UI din sidebar.
for (const mode of [{}, { status: 500 }, { model: "mock" }, { delayMs: 200 }]) {
  test(`gateway AI: răspuns ${JSON.stringify(mode)}`, async () => {
    await fakeCritiqueAi(mode);
    const reply = await sw.evaluate(async () => {
      const canvas = new OffscreenCanvas(4, 4);
      canvas.getContext("2d")!.fillRect(0, 0, 4, 4);
      const blob = await canvas.convertToBlob({ type: "image/jpeg" });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const image = "data:image/jpeg;base64," + btoa(String.fromCharCode(...bytes));
      const g = globalThis as unknown as { askCritique: (request: unknown, image: string) => Promise<{ ok: boolean; model?: string }> };
      return g.askCritique({ prompt: '{"id":"crit-0","tag":"h1"}', schema: { type: "object" }, mock: {} }, image);
    });
    expect(reply.ok).toBe(!("status" in mode));
    if ("model" in mode) expect(reply.model).toBe("mock");
    if (!("status" in mode)) expect(await sw.evaluate(() => (globalThis as unknown as { __aiBody: unknown }).__aiBody)).toMatchObject({ attachment: "image/jpeg", hasSchema: true });
  });
}

test('brief: întrebarea și continuarea rămân la vedere după observații pe un ecran scund', async () => {
  aiMode = 'long';
  const page = await openFixture();
  await page.setViewportSize({ width: 1280, height: 540 });
  await inject(); await finishCritique(page);
  const root = page.locator('#spire-root');
  await expect(root.getByRole('textbox')).toBeInViewport({ratio:1});
  await expect(root.getByRole('button',{name:'Continuă',exact:true})).toBeInViewport({ratio:1});
  for (let i=0; i<4 && await root.getByRole('button',{name:'Continuă',exact:true}).isVisible(); i++) {
    await root.getByRole('textbox').fill('Un răspuns detaliat pentru campanie, public și mesaj. '.repeat(5));
    await root.getByRole('button',{name:'Continuă',exact:true}).click();
    if (await root.getByRole('textbox').count()) {
      await expect(root.getByRole('textbox')).toBeInViewport({ratio:1});
      await expect(root.getByRole('button',{name:'Continuă',exact:true})).toBeInViewport({ratio:1});
    }
  }
  await expect(root.getByRole('button',{name:'Continuă cu o campanie'})).toBeInViewport({ratio:1});
  await page.close();
});
