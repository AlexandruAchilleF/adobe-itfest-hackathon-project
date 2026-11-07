import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type BrowserContext, chromium, expect, type Page, test, type Worker } from "@playwright/test";

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
// Adresa aplicației din iframe. Deocamdată e o origine falsă cu o pagină goală (aici contează
// doar src-ul). În A3 se schimbă pe portul serverului de test (ex. "http://localhost:5199")
// și se scoate ruta de mai jos, ca iframe-ul să încarce aplicația reală.
const APP_URL = "http://spire-app.test";

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
  await context.route(`${SITE_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: readFileSync(FIXTURE, "utf8") }),
  );
  await context.route(`${APP_URL}/**`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: "<!doctype html><title>Spire</title>" }),
  );
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
