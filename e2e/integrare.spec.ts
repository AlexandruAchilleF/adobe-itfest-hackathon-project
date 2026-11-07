// Drumul filmat, cu extensia reală și aplicația reală: uliu → critică → brief → panou → decupare → kit
// → aplicația, într-un tab normal. Partiționarea e pornită, ca la un om (Playwright o oprește implicit).
// Rulează prin `npm run e2e:prod` (aplicația de la BASE_URL; local cu AI_PROVIDER=mock, fără chei).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type BrowserContext, chromium, expect, type Frame, type Page, test, type Worker } from "@playwright/test";
import { loadEnv } from "vite";

// Site-ul gazdă e simulat prin context.route. Când aplicația e pe localhost, gazda stă pe 127.0.0.1:
// Chromium blochează iframe-ul spre localhost pus de un site public (Local Network Access).
let SITE = "http://spire-site.test";
const env = loadEnv("production", process.cwd(), "VITE_SUPABASE");
const dirs: string[] = [];

/** Copia extensiei cu APP_URL spre aplicația testată. host_permissions înlocuiesc clicul real pe iconiță. */
function prepareExtension(appUrl: string): string {
  const dir = mkdtempSync(join(tmpdir(), "spire-ext-"));
  dirs.push(dir);
  cpSync(join(process.cwd(), "chrome-extension"), dir, { recursive: true });
  const manifestPath = join(dir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.host_permissions = [`${SITE}/*`, `${appUrl}/*`, "<all_urls>"];
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const configPath = join(dir, "config.js");
  const config = readFileSync(configPath, "utf8");
  const rewritten = config.replace(/var APP_URL = "[^"]*";/, `var APP_URL = ${JSON.stringify(appUrl)};`);
  if (rewritten === config) throw new Error("Nu găsesc APP_URL în config.js");
  writeFileSync(configPath, rewritten);
  return dir;
}

async function launch(appUrl: string): Promise<{ context: BrowserContext; sw: Worker }> {
  const ext = prepareExtension(appUrl);
  const profile = mkdtempSync(join(tmpdir(), "spire-profile-"));
  dirs.push(profile);
  const off = /localhost/.test(appUrl) ? "Translate,LocalNetworkAccessChecks" : "Translate";
  const context = await chromium.launchPersistentContext(profile, {
    // Chrome-ul oficial nu mai încarcă extensii din linia de comandă; Chromium da.
    channel: "chromium",
    headless: !process.env.HEADED,
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    // Lista noastră înlocuiește --disable-features al Playwright, deci partiționarea rămâne pornită.
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, `--disable-features=${off}`],
  });
  await context.route(`${SITE}/**`, (route) =>
    route.fulfill({ contentType: "text/html; charset=utf-8", body: readFileSync(join(process.cwd(), "e2e/fixtures/spire-site.html"), "utf8") }),
  );
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  return { context, sw };
}

async function inject(sw: Worker) {
  const ok = await sw.evaluate(async (site) => {
    const g = globalThis as unknown as {
      chrome: { tabs: { query: (q: { url: string }) => Promise<Array<{ id?: number }>> } };
      injectSpire: (id: number) => Promise<boolean>;
    };
    const [tab] = await g.chrome.tabs.query({ url: `${site}/*` });
    return g.injectSpire(tab.id!);
  }, SITE);
  expect(ok).toBe(true);
}

async function panel(page: Page, appUrl: string): Promise<Frame> {
  await expect.poll(() => page.frames().some((f) => f.url().startsWith(`${appUrl}/nou`))).toBe(true);
  return page.frames().find((f) => f.url().startsWith(`${appUrl}/nou`))!;
}

async function removeCampaign(id: string) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/records?id=eq.${id}`, {
    method: "DELETE",
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
  });
  expect(res.ok).toBe(true);
}

let context: BrowserContext;
let sw: Worker;

test.beforeAll(async ({ baseURL }) => {
  const app = new URL(baseURL!);
  if (app.hostname === "localhost") SITE = `http://127.0.0.1:${app.port}`;
  ({ context, sw } = await launch(app.origin));
});

test.afterAll(async () => {
  await context?.close();
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test("drumul filmat: din extensie până la PNG-ul din aplicație", async ({ baseURL }) => {
  const app = new URL(baseURL!).origin;
  const page = await context.newPage();
  await page.goto(`${SITE}/site`);
  await inject(sw);
  const root = page.locator("#spire-root");

  // 1. Uliul critică pagina prin aplicația din iframe (AI sau mock), apoi întreabă brief-ul pe rând.
  await root.getByRole("button", { name: "Spire, deschide meniul" }).click();
  await root.getByRole("button", { name: "Critică pagina", exact: true }).click();
  await expect(root.locator(".spire-bubble .spire-level")).toBeVisible({ timeout: 90_000 });
  // Zborul are viteza reală, deci până la rezumat trec câteva secunde.
  const end = Date.now() + 60_000;
  while (Date.now() < end && !(await root.locator(".spire-bubble").getAttribute("data-summary"))) {
    const next = root.getByRole("button", { name: "Următorul" });
    if (await next.isVisible()) await next.click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await expect(root.locator(".spire-bubble")).not.toContainText("AI indisponibil");
  await expect(root.getByRole("textbox")).toHaveCount(1);
  await root.getByRole("textbox").fill("Cazare la munte");
  for (let i = 0; i < 4 && (await root.getByRole("button", { name: "Continuă", exact: true }).isVisible()); i++) {
    const input = root.getByRole("textbox");
    if (!(await input.inputValue()).trim()) await input.fill("Familii cu copii");
    await root.getByRole("button", { name: "Continuă", exact: true }).click();
  }
  await root.getByRole("button", { name: "Continuă cu o campanie" }).click();

  // 2. Panoul e aplicația reală și a primit brief-ul.
  const frame = await panel(page, app);
  await expect(frame.getByText("Am păstrat brief-ul").first()).toBeVisible({ timeout: 30_000 });

  // Partiționarea e pornită: ce scrie panoul în localStorage nu se vede într-un tab al aplicației.
  await frame.evaluate(() => localStorage.setItem("spire:proba-partitie", "panou"));
  const check = await context.newPage();
  await check.goto(`${app}/marca`);
  expect(await check.evaluate(() => localStorage.getItem("spire:proba-partitie"))).toBeNull();
  await check.close();
  await page.bringToFront();

  // 3. Referința: scanarea aprinde chenarele, omul strânge panoul și alege unul din pagină.
  await frame.getByRole("button", { name: "Scanează pagina" }).click();
  await expect(root.locator(".spire-box.spire-box-lit").first()).toBeVisible({ timeout: 60_000 });
  await root.getByRole("button", { name: "Strânge panoul Spire" }).click();
  const edge = (await root.locator(".spire-box.spire-box-lit").first().locator(".spire-box-edge-left").boundingBox())!;
  await page.mouse.click(edge.x + edge.width / 2, edge.y + edge.height / 2);
  await expect(frame.getByText("Ce am văzut")).toBeVisible({ timeout: 90_000 });

  // 4. Kitul (butonul e jos în panou: clicul cere derulare), apoi aplicația îl preia într-un tab normal.
  await frame.getByRole("button", { name: "Fă campania", exact: true }).click();
  const opened = context.waitForEvent("page");
  const open = frame.getByRole("button", { name: "Deschide în Spire" }).or(frame.getByRole("button", { name: "Salvează campania" }));
  await open.click({ timeout: 150_000 });
  const legacy = frame.getByRole("link", { name: "Deschide în Campanii" });
  await legacy.waitFor({ timeout: 15_000 }).then(() => legacy.click()).catch(() => undefined);
  const tab = await opened;
  await tab.waitForURL(/\/campanii\/[0-9a-f-]{36}$/);
  const id = new URL(tab.url()).pathname.split("/").pop()!;
  try {
    await expect(tab.getByText("Campania nu mai există")).toHaveCount(0);
    const download = tab.waitForEvent("download");
    await tab.getByRole("button", { name: "Descarcă PNG" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
    await tab.goto("/campanii");
    await expect(tab.locator(`a[href="/campanii/${id}"]`).first()).toBeVisible();
  } finally {
    await removeCampaign(id);
  }
});
