// Drumul filmat, cu extensia reală și aplicația reală: uliu → critică → brief → panou → decupare → kit
// → aplicația, într-un tab normal. Partiționarea e pornită, ca la un om (Playwright o oprește implicit).
// Rulează prin `npm run e2e:prod` (aplicația de la BASE_URL; local cu AI_PROVIDER=mock).
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
  const context = await chromium.launchPersistentContext(profile, {
    // Chrome-ul oficial nu mai încarcă extensii din linia de comandă; Chromium da.
    channel: "chromium",
    headless: !process.env.HEADED,
    viewport: { width: 1280, height: 800 },
    acceptDownloads: true,
    // Lista noastră înlocuiește --disable-features al Playwright, deci partiționarea rămâne pornită.
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, `--disable-features=${/localhost/.test(appUrl) ? "Translate,LocalNetworkAccessChecks" : "Translate"}`],
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

async function drag(page: Page, from: [number, number], to: [number, number]) {
  await page.mouse.move(...from);
  await page.mouse.down();
  await page.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, { steps: 4 });
  await page.mouse.move(...to, { steps: 4 });
  await page.mouse.up();
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
  // Serverul de dev compilează modulele la prima cerere; extensia așteaptă aplicația doar 8 s.
  const warm = await context.newPage();
  await warm.goto(`${app.origin}/nou?din=extensie`);
  await expect(warm.getByRole("button", { name: "Scanează pagina" })).toBeVisible({ timeout: 60_000 });
  await warm.close();
});

test.afterAll(async () => {
  await context?.close();
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

test("drumul filmat: din extensie până la PNG-ul din aplicație", async ({ baseURL }) => {
  const app = new URL(baseURL!).origin;
  const page = await context.newPage();
  page.on("console", (m) => console.log("CONSOLE", m.type(), m.location().url.slice(0, 60), m.text().slice(0, 200)));
  page.on("frameattached", (f) => console.log("FRAME+", f.url()));
  page.on("framenavigated", (f) => console.log("NAV", f.url().slice(0, 120)));
  context.on("request", (r) => r.url().includes("/api/") && console.log("REQ", r.method(), r.url()));
  context.on("response", (r) => r.url().includes("/api/") && console.log("RES", r.status(), r.url()));
  await page.goto(`${SITE}/site`);
  // Critica trece prin aplicația din iframe, cu AI (sau mock); fără ea, uliul cade pe verificări locale.
  await inject(sw);
  const root = page.locator("#spire-root");

  // 1. Uliul critică pagina, apoi întreabă brief-ul pe rând.
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
  await expect(frame.getByText("Am păstrat brief-ul")).toBeVisible({ timeout: 30_000 });

  // Partiționarea e pornită: ce scrie panoul în localStorage nu se vede într-un tab al aplicației.
  await frame.evaluate(() => localStorage.setItem("spire:proba-partitie", "panou"));
  const check = await context.newPage();
  await check.goto(`${app}/marca`);
  expect(await check.evaluate(() => localStorage.getItem("spire:proba-partitie"))).toBeNull();
  await check.close();
  await page.bringToFront();

  {
    await frame.evaluate(() => { (window as any).__ev0 = []; addEventListener("click", (e) => (window as any).__ev0.push((e.target as Element).tagName), true); });
    const chip = frame.getByRole("button", { name: "Clienți noi" });
    await chip.click({ timeout: 10_000 }).catch((e) => console.log("CHIPERR", String(e).slice(0, 150)));
    console.log("EV0 inainte de decupare", JSON.stringify(await frame.evaluate(() => (window as any).__ev0)));
    const probe = async (label: string, fn: string) => {
      await page.evaluate(fn);
      await page.waitForTimeout(300);
      await frame.evaluate(() => ((window as any).__ev0 = []));
      const b = (await frame.getByRole("button", { name: "Clienți existenți" }).boundingBox())!;
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(300);
      console.log("PROBE", label, JSON.stringify(await frame.evaluate(() => (window as any).__ev0)));
    };
    const P = 'document.querySelector("#spire-root").shadowRoot.querySelector(".spire-panel")';
    const H = 'document.querySelector("#spire-root")';
    await probe("nimic", "0");
    await probe("pointer-events none->remove", `${P}.style.setProperty("pointer-events","none"); ${P}.style.removeProperty("pointer-events")`);
    await probe("pointer-events none, apoi remove după 1 cadru", `new Promise(r => { ${P}.style.setProperty("pointer-events","none"); requestAnimationFrame(() => requestAnimationFrame(() => { ${P}.style.removeProperty("pointer-events"); r(0); })); })`);
    await root.getByRole("button", { name: "Decupează" }).click(); await page.keyboard.press("Escape");
    await probe("decupare pornită și oprită cu Esc", "0");
    await root.getByRole("button", { name: "Decupează" }).click(); await drag(page, [80, 120], [90, 128]); await page.keyboard.press("Escape");
    await probe("tragere prea mică, apoi Esc", "0");
    await probe("visibility hidden->remove după 2 cadre", `new Promise(r => { ${H}.style.setProperty("visibility","hidden","important"); requestAnimationFrame(() => requestAnimationFrame(() => { ${H}.style.removeProperty("visibility"); r(0); })); })`);
  }
  // 3. Decuparea unei referințe de pe pagină.
  await root.getByRole("button", { name: "Decupează" }).click();
  await drag(page, [80, 120], [520, 460]);
  await expect(frame.getByText("Ce am văzut")).toBeVisible({ timeout: 90_000 });
  {
    await frame.evaluate(() => { (window as any).__ev1 = []; addEventListener("click", (e) => (window as any).__ev1.push((e.target as Element).tagName), true); });
    const b = (await frame.getByRole("button", { name: "Clienți existenți" }).boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(300);
    console.log("PROBE după decupare completă", JSON.stringify(await frame.evaluate(() => (window as any).__ev1)));
    await page.mouse.move(10, 10); await page.mouse.move(b.x + 5, b.y + 5); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(300);
    console.log("PROBE după mișcare de mouse", JSON.stringify(await frame.evaluate(() => (window as any).__ev1)));
    const tryClick = async (label: string) => {
      await frame.evaluate(() => ((window as any).__ev1 = []));
      const c = (await frame.getByRole("button", { name: "Clienți existenți" }).boundingBox())!;
      await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
      await page.waitForTimeout(300);
      console.log("PROBE", label, JSON.stringify(c), JSON.stringify(await frame.evaluate(() => (window as any).__ev1)));
    };
    await page.evaluate(() => window.scrollTo(0, 383)); await page.waitForTimeout(300);
    await tryClick("pagina-gazdă derulată 383");
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    await tryClick("pagina-gazdă înapoi la 0");
    await frame.evaluate(() => window.scrollTo(0, 200)); await page.waitForTimeout(300);
    await tryClick("panoul derulat 200");
    await frame.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
    const where = async () => {
      const ifr = await page.evaluate(() => { const r = document.querySelector("#spire-root")!.shadowRoot!.querySelector("iframe")!.getBoundingClientRect(); return { x: r.x, y: r.y }; });
      const r = await frame.getByRole("button", { name: "Fă campania", exact: true }).evaluate((b) => { const q = b.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, sy: scrollY, se: document.scrollingElement!.scrollTop, ih: innerHeight }; });
      return { ...r, x: ifr.x + r.x, y: ifr.y + r.y };
    };
    console.log("WHERE start", JSON.stringify(await where()));
    await page.mouse.move(1000, 400);
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(30); }
    await page.waitForTimeout(800);
    const w = await where();
    console.log("WHERE după rotiță", JSON.stringify(w));
    await frame.evaluate(() => ((window as any).__ev1 = []));
    if (w.y > 40 && w.y < 800) { await page.mouse.move(w.x, w.y); await page.mouse.click(w.x, w.y); }
    await page.waitForTimeout(1500);
    console.log("PROBE rotiță + clic pe Fă campania", JSON.stringify(await frame.evaluate(() => (window as any).__ev1)), (await frame.locator("body").innerText()).slice(0, 60).replace(/\n/g, " "));
  }

  // 4. Kitul, apoi aplicația îl preia într-un tab normal.
  const shot = async (n: string) => { await page.screenshot({ path: test.info().outputPath(n + ".png") }); console.log("SHOT", n, (await frame.locator("body").innerText()).slice(0, 300).replace(/\n+/g, " | ")); };
  await shot("1-vazut");
  console.log("PRIMUL", await frame.getByRole("button", { name: "Fă campania", exact: true }).boundingBox(), await page.evaluate(() => scrollY));
  await frame.getByRole("button", { name: "Fă campania", exact: true }).click({ trial: true });
  await page.mouse.click(5, 5).catch(() => undefined);
  await shot("2-dupa-clic");
  await page.waitForTimeout(4000);
  await shot("3-dupa-4s");
  const t = await frame.locator("body").innerText(); console.log("JOS:\n" + t.slice(t.indexOf("Ce am văzut")).slice(0, 2500));
  await frame.evaluate(() => { (window as any).__ev = []; for (const t of ["pointerdown", "mousedown", "click"]) addEventListener(t, (e) => (window as any).__ev.push(t + "@" + Math.round((e as MouseEvent).clientX) + "," + Math.round((e as MouseEvent).clientY) + " " + (e.target as Element).tagName), true); });
  const btn = frame.getByRole("button", { name: "Fă campania", exact: true });
  await btn.scrollIntoViewIfNeeded();
  const bb = (await btn.boundingBox())!;
  console.log("BB", JSON.stringify(bb), "inframe", JSON.stringify(await btn.evaluate((b) => b.getBoundingClientRect())), "iframe", JSON.stringify(await page.evaluate(() => document.querySelector("#spire-root")!.shadowRoot!.querySelector("iframe")!.getBoundingClientRect())));
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  console.log("TOP", await page.evaluate(([x, y]) => { const d = document.elementFromPoint(x, y); const sr = document.querySelector("#spire-root")!.shadowRoot!; const all = sr.elementsFromPoint(x, y).map((e) => e.tagName + "." + e.className + " pe=" + getComputedStyle(e).pointerEvents + " hidden=" + (e as HTMLElement).hidden); return (d ? d.tagName + "#" + d.id : "nimic") + " || " + all.join(" > "); }, [cx, cy]));
  await page.evaluate(() => { (window as any).__pev = []; for (const t of ["pointerdown", "click"]) addEventListener(t, (e) => (window as any).__pev.push(t + " " + (e.composedPath()[0] as Element).tagName + "." + (e.composedPath()[0] as Element).className), true); });
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(500);
  console.log("PEV", JSON.stringify(await page.evaluate(() => (window as any).__pev)));
  console.log("EV", JSON.stringify(await frame.evaluate(() => (window as any).__ev)));
  const box = (await frame.getByRole("button", { name: "Fă campania", exact: true }).boundingBox())!;
  console.log("SUS", await page.evaluate(([x, y]) => { const r = document.querySelector("#spire-root")!.shadowRoot!; const e = r.elementFromPoint(x, y) ?? document.elementFromPoint(x, y); return e ? e.outerHTML.slice(0, 200) : "nimic"; }, [box.x + box.width / 2, box.y + box.height / 2]));
  await frame.getByRole("button", { name: "Fă campania", exact: true }).click();
  await page.waitForTimeout(3000); await shot("4-click-js");
  console.log("BUTON", await frame.getByRole("button", { name: "Fă campania", exact: true }).evaluate((b) => (b as HTMLButtonElement).disabled + " " + b.outerHTML.slice(0, 300)));
  const opened = context.waitForEvent("page");
  const open = frame.getByRole("button", { name: "Deschide în Spire" }).or(frame.getByRole("button", { name: "Salvează campania" }));
  await open.click({ timeout: 30_000 }).catch(async (e) => { console.log("PANOU:\n" + (await frame.locator("body").innerText()).slice(0, 2500)); await page.screenshot({ path: test.info().outputPath("kit.png") }); throw e; });
  const legacy = frame.getByRole("link", { name: "Deschide în Campanii" });
  await legacy.waitFor({ timeout: 15_000 }).then(() => legacy.click()).catch(() => undefined);
  const tab = await opened;
  await tab.waitForURL(/\/campanii\/[0-9a-f-]{36}$/);
  const id = new URL(tab.url()).pathname.split("/").pop()!;
  try {
    await expect(tab.getByText("Campania nu mai există")).toHaveCount(0);
    // Brief-ul din extensie a ajuns în campanie.
    await expect(tab.getByText("Cazare la munte").first()).toBeVisible();
    const download = tab.waitForEvent("download");
    await tab.getByRole("button", { name: "Descarcă PNG" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
    await tab.goto("/campanii");
    await expect(tab.locator(`a[href="/campanii/${id}"]`).first()).toBeVisible();
  } finally {
    await removeCampaign(id);
  }
});
