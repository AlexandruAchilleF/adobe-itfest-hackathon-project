// Filmarea video-ului demo, cu extensia reală și aplicația reală. Regia stă în director.js și mouse.ts.
// Scenele folosesc doar mouse-ul virtual; timpii reali ajung în docs/demo/demo-run.json, de unde îi ia montajul.
// Ordinea: site → critică → aplicarea ajustărilor → scanare → clip → Google → Inspire → afiș → dashboard.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type BrowserContext, chromium, expect, type Frame, type Locator, type Page, test, type Worker } from "@playwright/test";
import { loadEnv } from "vite";
import { DemoMouse, type Rect } from "./mouse";

const PORT = 5196;
const APP = `http://localhost:${PORT}`;
const SITE = `http://127.0.0.1:${PORT}`;
const CAMPAIGN_ID = "5d1f0a7e-3c52-4b8e-9a61-0d3c7e5a2b10";
const LIVE_SITE = "https://www.marinapark.ro";
const OPENING_PHOTO = `${LIVE_SITE}/wp-content/uploads/2022/01/IMG_20210501_222151-scaled.jpg`;
const PUBLIC_ADDRESS = "adobe-itfest-hackathon-project.vercel.app";
const CLIP = `${APP}/samples/spire/demo-videos/marina-park.mp4`;
const CLIP_FROM = 0; // clipul întreg, de la titlu până la numele Marina Park
const CLIP_MS = 40_000;
const POSTER = `${APP}/samples/spire/demo-videos/afis-marina-park.png`;
const REFERENCE = `${APP}/samples/spire/marina-park/referinta-camping.png`;
/** Descărcarea clipului durează câteva milisecunde pe localhost; rețeaua încetinită face bara reală vizibilă. */
const DOWNLOAD_BYTES_PER_SECOND = 5_000_000;
/** Zborul uliului, doar în copia filmării: durata scenelor lasă cam 2 s pe oprire. */
const BIRD_SPEED = 0.35;

const ROOT = process.cwd();
const RAW = join(ROOT, "test-results-demo");
const RUN_JSON = join(ROOT, "docs/demo/demo-run.json");
const FORBIDDEN_ALWAYS = /AI indisponibil|Nu am putut|N-am reușit|Campania nu mai există|Nu primesc nimic|Afiș pregătit pentru demo|Scenariu simulat|Demo simulat/;
const FORBIDDEN_REAL = /Analiză simulată|Rezultat simulat|Verificări locale/;

type Wait = { label: string; start: number; end: number };
type Scene = { id: number; tab: string; start: number; end: number; waits: Wait[]; wipeIn: boolean; marks: Record<string, number> };
type Tab = { id: string; page: Page; opened: number; closed?: number };

const directorSource = readFileSync(join(ROOT, "scripts/demo/director.js"), "utf8");
const now = () => performance.now();
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rectOf = async (l: Locator): Promise<Rect> => {
  const box = await l.boundingBox();
  if (!box) throw new Error("Elementul nu are casetă.");
  return box;
};

function swap(source: string, from: string, to: string): string {
  if (!source.includes(from)) throw new Error(`Copia filmării nu mai găsește în content.js: ${from}`);
  return source.replace(from, to);
}

/**
 * Copia extensiei: APP_URL spre localhost, permisiunile care înlocuiesc clicul pe iconiță și semnalul de filmare.
 * Tot aici, doar în copie: uliul intră în zbor de pe marginea ecranului și are ritmul scenelor.
 */
function prepareExtension(dirs: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), "spire-demo-ext-"));
  dirs.push(dir);
  cpSync(join(ROOT, "chrome-extension"), dir, { recursive: true });
  const manifestPath = join(dir, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  // <all_urls> e cerut de captureVisibleTab când nu există un clic real pe iconiță (ca în e2e/integrare.spec.ts)
  manifest.host_permissions = [`${LIVE_SITE}/*`, "http://127.0.0.1/*", "http://localhost/*", "<all_urls>"];
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const configPath = join(dir, "config.js");
  const config = readFileSync(configPath, "utf8");
  const rewritten = config.replace(/var APP_URL = "[^"]*";/, `var APP_URL = ${JSON.stringify(APP)};`);
  if (rewritten === config) throw new Error("Nu găsesc APP_URL în config.js");
  writeFileSync(configPath, swap(rewritten, "APP_URL: APP_URL,", `APP_URL: APP_URL,\n    DEMO_INSPIRE_RESULT: ${JSON.stringify(POSTER)},`));
  const contentPath = join(dir, "content.js");
  let content = readFileSync(contentPath, "utf8");
  content = swap(content, "var S = 140, pos = { x: innerWidth - 180, y: 140 }", "var S = 140, pos = { x: innerWidth + 120, y: 90 }");
  content = swap(content, "(4000+Math.random()*4000)*speed", "(globalThis.__demoRoamed ? 7000 : (globalThis.__demoRoamed = true, 250))");
  writeFileSync(contentPath, `globalThis.__spireTestSpeed = ${BIRD_SPEED};\n${content}`);
  return dir;
}

/** Pagina de căutare și resursele cardurilor, servite local, din repo. */
const DEMO_FILES: Record<string, { file: string; type: string }> = {
  "cautare.html": { file: "scripts/demo/cautare.html", type: "text/html; charset=utf-8" },
  "deschidere.html": { file: "scripts/demo/deschidere.html", type: "text/html; charset=utf-8" },
  "cautare-google.png": { file: "public/samples/spire/marina-park/cautare-google.png", type: "image/png" },
  "referinta-camping.png": { file: "public/samples/spire/marina-park/referinta-camping.png", type: "image/png" },
  "logo.png": { file: "public/samples/spire/marina-park/logo.png", type: "image/png" },
  "geist.woff2": { file: "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2", type: "font/woff2" },
};

async function launch(dirs: string[]): Promise<{ context: BrowserContext; sw: Worker }> {
  const ext = prepareExtension(dirs);
  const profile = mkdtempSync(join(tmpdir(), "spire-demo-profile-"));
  dirs.push(profile);
  const context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: false,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, "--disable-features=Translate,LocalNetworkAccessChecks", "--autoplay-policy=no-user-gesture-required", "--hide-crash-restore-bubble"],
  });
  await context.addInitScript(directorSource);
  // Semnalul pentru clipul din repo: doar pe originea aplicației, inclusiv în iframe-ul panoului.
  await context.addInitScript((origin: string) => {
    if (location.origin === origin) localStorage.setItem("spire:demo-rezultate", "1");
  }, APP);
  await context.route(`${SITE}/demo/**`, (route) => {
    const name = new URL(route.request().url()).pathname.replace("/demo/", "");
    const known = DEMO_FILES[name];
    if (!known) return route.fulfill({ status: 404 });
    return route.fulfill({ contentType: known.type, body: readFileSync(join(ROOT, known.file)) });
  });
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  return { context, sw };
}

/**
 * Marca: `useBrand` citește primul rând din `spire:marca`, iar în baza comună e încă Gelateria Pip.
 * Garda de pe pagina campaniei trebuie să verifice față de Marina Park, deci numai browserul filmării
 * primește marca Marina Park (src/lib/brand.ts). Baza de date nu se atinge.
 */
async function useMarinaParkBrand(context: BrowserContext, brand: unknown) {
  await context.route(/\/rest\/v1\/records\?.*collection=eq\.spire(%3A|:)marca/, async (route) => {
    if (route.request().method() !== "GET") return route.abort();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify([{ id: "00000000-0000-4000-8000-00000000d3a0", data: brand, created_at: "2026-11-07T15:00:00.000Z" }]),
    });
  });
}

function readBrand(): unknown {
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", `
    import { createServer } from "vite";
    const vite = await createServer({ configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
    const { marinaParkBrand } = await vite.ssrLoadModule("/src/lib/brand.ts");
    console.log(JSON.stringify(marinaParkBrand));
    await vite.close();
    process.exit(0);
  `], { cwd: ROOT, encoding: "utf8" });
  return JSON.parse(out.trim().split("\n").pop()!);
}

/** Uliul în zbor, desenul real al extensiei, pentru tranziția dintre tab-uri. */
function flyingBird(): string {
  const scope: { SPIRE_POSES?: Record<string, { flying: string }> } = {};
  new Function("globalThis", readFileSync(join(ROOT, "chrome-extension/mascot-poses.js"), "utf8"))(scope);
  const svg = scope.SPIRE_POSES?.happy?.flying ?? scope.SPIRE_POSES?.idle?.flying;
  if (!svg) throw new Error("Nu găsesc desenul uliului în mascot-poses.js");
  return svg;
}

/** Întrebările de brief din balonul uliului nu intră în film: balonul rămâne cu previzualizarea. Doar stil, logica nu se schimbă. */
const addFilmStyle = (page: Page) =>
  page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = ".spire-stage,.spire-meta>.spire-steps{display:none!important}";
    document.getElementById("spire-root")!.shadowRoot!.append(style);
  });

test("filmarea video-ului demo", async () => {
  test.setTimeout(600_000);
  rmSync(RAW, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });
  mkdirSync(join(ROOT, "docs/demo"), { recursive: true });

  const provider = process.env.AI_PROVIDER ?? loadEnv("production", ROOT, "AI_PROVIDER").AI_PROVIDER ?? "mock";
  const real = provider !== "mock";
  const forbidden = real ? new RegExp(`${FORBIDDEN_ALWAYS.source}|${FORBIDDEN_REAL.source}`) : FORBIDDEN_ALWAYS;
  execFileSync(process.execPath, ["scripts/demo-seed.mjs"], { cwd: ROOT, stdio: "inherit" });

  const dirs: string[] = [];
  const { context, sw } = await launch(dirs);
  await useMarinaParkBrand(context, readBrand());
  const birdSvg = flyingBird();

  const scenes: Scene[] = [];
  const tabs: Tab[] = [];
  const aiCalls: Array<{ status: number; at: number; kind: string; provider?: string; model?: string }> = [];
  let findings: Array<{ level: string; title: string; body: string }> = [];
  let briefRead: Record<string, string> = {};
  let fatal: string | null = null;

  context.on("response", (res) => {
    if (!res.url().includes("/api/ai")) return;
    const body = res.request().postData() ?? "";
    const kind = body.includes("critic de design") ? "critica" : body.includes("Te uiți la o pagină web") ? "citirea paginii (scanare)" : "alt apel";
    const call: (typeof aiCalls)[number] = { status: res.status(), at: now(), kind };
    aiCalls.push(call);
    if (res.status() !== 200) {
      fatal = `/api/ai a răspuns ${res.status()} (${kind}). Oprit, fără reîncercare.`;
      void res.text().then((text) => console.error(`Răspunsul /api/ai (${kind}): ${text.slice(0, 500)}`), () => undefined);
      return;
    }
    void res.json().then(
      (json: { provider?: string; model?: string }) => {
        call.provider = json.provider;
        call.model = json.model;
        if (real && json.provider === "mock") fatal = `Filmarea e cu ${provider}, dar ${kind} a răspuns din mock.`;
      },
      () => undefined,
    );
  });
  context.on("request", (req) => {
    if (req.url().includes("/api/image")) fatal = "Apel /api/image în filmare: afișul și clipul vin din repo.";
  });

  const guard = () => {
    if (fatal) throw new Error(fatal);
  };

  const assertClean = async (page: Page) => {
    guard();
    for (const frame of page.frames()) {
      const text = await frame.evaluate(() => document.body?.innerText ?? "").catch(() => "");
      const hit = text.match(forbidden);
      if (hit) throw new Error(`Pe ecran a apărut „${hit[0]}” (${frame.url()}). Se refilmează.`);
    }
    const shadow = await page.evaluate(() => document.getElementById("spire-root")?.shadowRoot?.textContent ?? "");
    const hit = shadow.match(forbidden);
    if (hit) throw new Error(`În stratul Spire a apărut „${hit[0]}”. Se refilmează.`);
  };

  const openTab = async (id: string, existing?: Page): Promise<Page> => {
    const opened = now();
    const page = existing ?? (await context.newPage());
    tabs.push({ id, page, opened });
    page.on("dialog", (d) => void d.dismiss());
    return page;
  };

  let current: Scene | null = null;
  const scene = async (id: number, tab: string, run: () => Promise<void>, { wipeIn = false } = {}) => {
    current = { id, tab, start: now(), end: 0, waits: [], wipeIn, marks: {} };
    await run();
    current.end = now();
    scenes.push(current);
    current = null;
    guard();
  };
  /** Așteptarea (AI, încărcare): montajul o accelerează până încape în 2 s. */
  const wait = async <T,>(label: string, run: () => Promise<T>): Promise<T> => {
    const start = now();
    const result = await run();
    current?.waits.push({ label, start, end: now() });
    guard();
    return result;
  };
  const mark = (name: string) => {
    if (current) current.marks[name] = now();
  };
  const demo = (page: Page) => ({
    ring: (r: Rect) => page.evaluate((x) => (window as any).__demo.ring(x), r),
    spotlight: (r: Rect, ms: number) => page.evaluate(([x, m]) => { (window as any).__demo.spotlight(x, m); }, [r, ms] as const),
    card: (html: string, ms: number, opts?: { stay?: boolean }) => page.evaluate(([h, m, o]) => (window as any).__demo.card(h, m, o), [html, ms, opts ?? {}] as const),
    media: (src: string, opts: { from: number; ms: number; origin?: Rect }) => page.evaluate(([s, o]) => (window as any).__demo.media(s, o), [src, opts] as const),
    split: (left: string, right: string, ms: number) => page.evaluate(([l, r, m]) => (window as any).__demo.split(l, r, m), [left, right, ms] as const),
    wipe: (phase: "out" | "in" | "cover") => page.evaluate(([p, svg]) => (window as any).__demo.birdWipe(p, svg), [phase, birdSvg] as const),
    cursorVisible: (on: boolean) => page.evaluate((v) => (window as any).__demo.cursorVisible(v), on),
    watchSpire: () => page.evaluate(() => (window as any).__demo.watchSpire()),
    scrollY: () => page.evaluate(() => window.scrollY),
  });

  /** Derulare lină a paginii, până la capăt sau până la un element, cu 40 px sub marginea de sus. */
  const smoothScroll = async (page: Page, target: number | string) => {
    await page.evaluate((t) => {
      const top = typeof t === "number" ? t : document.querySelector(t)!.getBoundingClientRect().top + window.scrollY - 40;
      window.scrollTo({ top, behavior: "smooth" });
    }, target);
    let last = -1;
    for (let i = 0; i < 40; i++) {
      await pause(60);
      const y = await demo(page).scrollY();
      if (y === last) break;
      last = y;
    }
  };

  /** Injectarea caută tab-ul după adresa exactă, altfel nimerește alt tab de pe aceeași gazdă. */
  const inject = async (page: Page, pattern: string) => {
    const ok = await sw.evaluate(async (site: string) => {
      const g = globalThis as unknown as { chrome: { tabs: { query(q: { url: string }): Promise<Array<{ id?: number }>> } }; injectSpire(id: number): Promise<boolean> };
      const [tab] = await g.chrome.tabs.query({ url: site });
      return g.injectSpire(tab.id!);
    }, pattern);
    expect(ok).toBe(true);
    await expect.poll(() => demo(page).watchSpire()).toBe(true);
    await addFilmStyle(page);
  };
  /** Uliul intră de pe margine; cursorul pleacă spre el abia după ce a aterizat. */
  const birdLanded = async (page: Page) => {
    const bird = page.locator("#spire-root").getByRole("button", { name: "Spire, deschide meniul" });
    await bird.waitFor({ state: "visible", timeout: 15_000 });
    await expect.poll(() => bird.evaluate((el) => !el.classList.contains("perched")), { timeout: 8000, intervals: [50] }).toBe(true);
    await expect.poll(() => bird.evaluate((el) => el.classList.contains("perched")), { timeout: 8000, intervals: [50] }).toBe(true);
    await pause(250);
    return bird;
  };

  try {
    // ── Scena 0: cardul de deschidere, peste o fotografie de pe site, întunecată ──
    const openingPage = await openTab("deschidere", context.pages()[0]);
    const mouse = new DemoMouse(openingPage);
    await openingPage.goto(`${SITE}/demo/deschidere.html`);
    await openingPage.bringToFront();
    await pause(300);
    await demo(openingPage).cursorVisible(false);
    await scene(0, "deschidere", async () => {
      await demo(openingPage).card(
        `<style>
           @font-face{font-family:"Geist Variable";src:url(/demo/geist.woff2) format("woff2");font-weight:100 900}
           @keyframes open-photo{from{transform:scale(1)}to{transform:scale(1.09)}}
           @keyframes open-up{from{transform:translateY(46px);opacity:0}to{transform:none;opacity:1}}
         </style>
         <img src="${OPENING_PHOTO}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.34);animation:open-photo 3.6s ease-out forwards">
         <div style="position:relative;text-align:center;font-family:'Geist Variable',sans-serif">
           <img src="/demo/logo.png" alt="" style="width:260px;height:260px;border-radius:24px;object-fit:contain;display:block;margin:0 auto 34px;animation:open-up .8s cubic-bezier(.2,.7,.2,1) both .15s">
           <div style="font-size:52px;font-weight:600;letter-spacing:-.01em;color:#fff;animation:open-up .8s cubic-bezier(.2,.7,.2,1) both .3s">Camping &amp; Motel · Vama Veche</div>
         </div>`,
        2000,
      );
    });

    // ── Scena 1: site-ul lor, live. Uliul intră în zbor, omul deschide meniul și pornește critica. ──
    const sitePage = await openTab("site");
    await sitePage.goto(LIVE_SITE, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await sitePage.bringToFront();
    await mouse.attach(sitePage);
    await demo(sitePage).cursorVisible(true);
    // Înainte de scenă, deci în afara video-ului: site-ul se așază, iar bannerele nu stau peste poze.
    await sitePage.locator("img.main-logo").first().waitFor({ state: "visible", timeout: 30_000 });
    await pause(2500);
    await sitePage.getByText("ACCEPT", { exact: true }).click({ timeout: 4000 }).catch(() => undefined);
    await sitePage.locator(".ti-close-lg, [class*=close]").filter({ visible: true }).first().click({ timeout: 800 }).catch(() => undefined);
    await pause(700);
    await sitePage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await pause(1500);
    await sitePage.evaluate(() => window.scrollTo(0, 0));
    await pause(1200);
    const root = sitePage.locator("#spire-root");
    const siteBird = root.getByRole("button", { name: "Spire, deschide meniul" });
    await mouse.hover({ x: 1180, y: 300, width: 30, height: 30 });
    await scene(1, "site", async () => {
      await inject(sitePage, `${LIVE_SITE}/*`);
      const bird = await birdLanded(sitePage);
      await demo(sitePage).ring(await rectOf(bird));
      await mouse.click(bird);
      await mouse.idle(120);
      await mouse.click(root.getByRole("button", { name: "Critică pagina" }));
      await mouse.idle(150);
    });

    // ── Scena 2: „Analizez pagina…”, apoi uliul zboară din zonă în zonă. Dacă pică, oprim filmarea. ──
    const nextButton = root.getByRole("button", { name: "Următorul" });
    const applyButton = root.getByRole("button", { name: "Aplică ajustările" });
    await scene(2, "site", async () => {
      await wait("Spire analizează pagina", () => nextButton.or(applyButton).first().waitFor({ state: "visible", timeout: 60_000 }));
      await assertClean(sitePage);
      for (let stop = 0; stop < 7; stop++) {
        if (await applyButton.isVisible()) break;
        if (!(await nextButton.isVisible())) {
          await nextButton.or(applyButton).first().waitFor({ state: "visible", timeout: 12_000 });
          continue;
        }
        const bubble = root.locator(".spire-bubble");
        findings.push({
          level: await bubble.locator(".spire-level").innerText().catch(() => ""),
          title: await bubble.locator("h2").innerText().catch(() => ""),
          body: await bubble.locator("p").first().innerText().catch(() => ""),
        });
        await mouse.idle(450);
        await mouse.click(nextButton);
        await pause(250);
      }
      if (!findings.length) throw new Error("Critica n-a găsit nimic pe ecran: scenele 2 și 3 nu se sar.");
      await applyButton.waitFor({ state: "visible", timeout: 15_000 });
      await assertClean(sitePage);
    });

    // ── Scena 3: rezumatul. Omul cere rezolvarea și compară. Dacă pică, oprim filmarea. ──
    await scene(3, "site", async () => {
      const controls = root.locator(".spire-preview-controls");
      await demo(sitePage).spotlight(await rectOf(controls), 900);
      // Cursorul rămâne pe balon, ca pozele să nu primească filtrul de hover. Balonul ține rotița pentru el,
      // iar drumul până în capul paginii e lung, deci derularea lină o face pagina.
      await mouse.hover(controls);
      await smoothScroll(sitePage, 0);
      await demo(sitePage).ring(await rectOf(applyButton));
      await mouse.click(applyButton);
      mark("ajustari");
      await expect.poll(() => sitePage.evaluate(() => document.querySelector<HTMLStyleElement>("style[data-spire-marina-preview]")?.media)).toBe("all");
      await mouse.idle(1000);
      const before = root.getByRole("button", { name: "Vezi înainte" });
      await demo(sitePage).ring(await rectOf(before));
      await mouse.click(before);
      await mouse.idle(500);
      const after = root.getByRole("button", { name: "Vezi după" });
      await demo(sitePage).ring(await rectOf(after));
      await mouse.click(after);
      await mouse.idle(300);
      await smoothScroll(sitePage, ".homepage-rooms");
      await mouse.idle(2000);
    });
    await assertClean(sitePage);

    // ── Scena 4: panoul alunecă din dreapta, pagina e scanată, contextul intră în brief ──
    let panel!: Frame;
    await scene(4, "site", async () => {
      await mouse.click(siteBird);
      await mouse.idle(100);
      await mouse.click(root.getByRole("button", { name: "Fă o campanie", exact: true }));
      panel = await wait("panoul Spire se încarcă", async () => {
        await expect.poll(() => sitePage.frames().some((f) => f.url().startsWith(`${APP}/nou`)), { timeout: 30_000 }).toBe(true);
        const f = sitePage.frames().find((x) => x.url().startsWith(`${APP}/nou`))!;
        await f.getByRole("button", { name: "Scanează pagina" }).waitFor({ state: "visible", timeout: 30_000 });
        return f;
      });
      const styleMedia = await sitePage.evaluate(() => document.querySelector<HTMLStyleElement>("style[data-spire-marina-preview]")?.media);
      if (styleMedia !== "all") throw new Error("Deschiderea panoului a anulat ajustările.");
      await mouse.click(panel.getByRole("button", { name: "Scanează pagina" }));
      await pause(250);
      await wait("Spire citește pagina", () => panel.getByRole("button", { name: "Scanează din nou" }).waitFor({ state: "visible", timeout: 60_000 }));
      await assertClean(sitePage);
      await mouse.click(panel.getByRole("link", { name: "Brief", exact: true }));
      await pause(450);
      const fields = panel.locator("[data-testid=campaign-workspace] #brief, #brief").first();
      const product = panel.getByLabel("Produs sau serviciu");
      await product.waitFor({ state: "visible" });
      briefRead = {
        product: await product.inputValue(),
        audience: await panel.getByLabel("Public").inputValue(),
        goal: await panel.getByLabel("Obiectiv").inputValue(),
        cta: await panel.getByLabel("Acțiunea dorită").inputValue(),
      };
      if (!briefRead.product.trim()) throw new Error("Gemini n-a propus un produs: scena 4 are nevoie de brief.");
      await demo(sitePage).spotlight(await rectOf(fields), 1800);
      await mouse.idle(1800);
    });

    // ── Scena 5: omul cere un clip din panou și îl primește acolo ──
    await scene(5, "site", async () => {
      const description = panel.getByLabel("Ce vrei să creăm?");
      await description.waitFor({ state: "visible" });
      await mouse.type(description, "Un clip scurt pentru vară", 0.55);
      const prepare = panel.getByRole("button", { name: "Pregătește video" });
      await expect(prepare).toBeEnabled();
      await demo(sitePage).ring(await rectOf(prepare));
      const cdp = await context.newCDPSession(panel);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: DOWNLOAD_BYTES_PER_SECOND, uploadThroughput: -1 });
      await mouse.click(prepare);
      const clip = panel.locator("video").first();
      await clip.waitFor({ state: "visible", timeout: 30_000 });
      mark("clip");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await cdp.detach();
      await mouse.scrollTo(clip, { top: 360 });
      await mouse.idle(250);
      await demo(sitePage).cursorVisible(false);
      await demo(sitePage).media(CLIP, { from: CLIP_FROM, ms: CLIP_MS, origin: await rectOf(clip) });
      await demo(sitePage).wipe("out");
    });
    await assertClean(sitePage).catch((err) => {
      throw err;
    });

    // ── Scena 6: tranziția cu uliul și afișul găsit pe Google ──
    const searchPage = await openTab("cautare");
    await searchPage.goto(`${SITE}/demo/cautare.html`);
    await searchPage.bringToFront();
    await demo(searchPage).wipe("cover");
    await mouse.attach(searchPage);
    const posterImg = searchPage.getByAltText("Camping Adventure Poster");
    await posterImg.waitFor({ state: "visible" });
    await pause(400);
    await scene(6, "cautare", async () => {
      await demo(searchPage).wipe("in");
      const vw = 1920;
      await mouse.hover({ x: vw * 0.3, y: 500, width: 240, height: 220 });
      const r = await rectOf(posterImg);
      await mouse.hover({ x: r.x - 90, y: r.y + r.height * 0.45, width: 60, height: 60 });
      await demo(searchPage).spotlight(r, 1700);
      await mouse.idle(1700);
    }, { wipeIn: true });

    // ── Scena 7: uliul coboară pe pagină, omul selectează afișul cu Inspire ──
    const searchRoot = searchPage.locator("#spire-root");
    await scene(7, "cautare", async () => {
      await inject(searchPage, "http://127.0.0.1/demo/cautare.html");
      const bird = await birdLanded(searchPage);
      await mouse.click(bird);
      await mouse.idle(100);
      const inspire = searchRoot.getByRole("button", { name: "Inspire", exact: true }).filter({ visible: true }).first();
      await demo(searchPage).ring(await rectOf(inspire));
      await mouse.click(inspire);
      await mouse.idle(150);
      const r = await rectOf(posterImg);
      // uliul aterizează unde vrea, iar balonul lui nu lasă selecția să pornească de sub el: alegem un colț liber
      const blockers = await Promise.all([bird, searchRoot.locator(".spire-bubble")].map((l) => l.boundingBox()));
      const free = (p: { x: number; y: number }) => !blockers.some((b) => b && p.x > b.x - 8 && p.x < b.x + b.width + 8 && p.y > b.y - 8 && p.y < b.y + b.height + 8);
      const [left, right, top, bottom] = [r.x + 4, r.x + r.width - 4, r.y + 4, r.y + r.height - 4];
      const corners = [[{ x: left, y: top }, { x: right, y: bottom }], [{ x: right, y: top }, { x: left, y: bottom }], [{ x: left, y: bottom }, { x: right, y: top }], [{ x: right, y: bottom }, { x: left, y: top }]];
      const path = corners.find(([from]) => free(from));
      if (!path) throw new Error("Toate colțurile afișului sunt acoperite de uliu sau de balon.");
      await mouse.drag(path[0], path[1]);
    });

    // ── Scena 8: afișul Marina Park în panoul Inspire, apoi comparația cu referința ──
    await scene(8, "cautare", async () => {
      const result = searchRoot.getByRole("img", { name: "Afișul rezultat" });
      await wait("captura selecției", () => result.waitFor({ state: "visible", timeout: 20_000 }));
      await pause(300);
      await mouse.hover({ x: 1300, y: 900, width: 40, height: 40 });
      const shown = await rectOf(result);
      await demo(searchPage).spotlight(shown, 1000);
      await mouse.idle(1000);
      await demo(searchPage).cursorVisible(false);
      await demo(searchPage).split(REFERENCE, POSTER, 4000);
      await demo(searchPage).wipe("out");
    });
    await assertClean(searchPage);

    // ── Scena 9: dashboard-ul. Tot ce a făcut stă în campanii. ──
    const campaignPage = await openTab("campanie");
    await campaignPage.goto(`${APP}/campanii?dev=0`);
    await campaignPage.bringToFront();
    await demo(campaignPage).wipe("cover");
    await mouse.attach(campaignPage);
    const card = campaignPage.locator(`li:has(a[href="/campanii/${CAMPAIGN_ID}"])`).first();
    await card.waitFor({ state: "visible", timeout: 30_000 });
    await expect(card).toContainText("Afiș + clip");
    await pause(1200); // miniaturile intră în pânză
    await scene(9, "campanie", async () => {
      await campaignPage.addStyleTag({ content: `@keyframes demo-card-in{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}} main li.card{animation:demo-card-in .55s cubic-bezier(.2,.7,.2,1) both} ${Array.from({ length: 12 }, (_, i) => `main li.card:nth-child(${i + 1}){animation-delay:${80 + i * 90}ms}`).join("")}` });
      await demo(campaignPage).wipe("in");
      await demo(campaignPage).ring(await rectOf(card));
      await mouse.click(card.locator("a").first());
      const canvas = campaignPage.locator(".work-stage canvas").first();
      await wait("pagina campaniei se încarcă", async () => {
        await canvas.waitFor({ state: "visible", timeout: 30_000 });
        await expect(campaignPage.getByRole("button", { name: "Descarcă PNG" })).toBeEnabled({ timeout: 30_000 });
      });
      await pause(700); // imaginea și fonturile intră în pânză
      const guardBox = campaignPage.getByTestId("guard");
      await expect(guardBox.locator("summary")).toContainText("trec");
      const failed = await guardBox.locator("summary").innerText();
      const counts = failed.match(/(\d+) din (\d+)/);
      if (!counts || counts[1] !== counts[2]) throw new Error(`Garda nu e verde pe pagina campaniei: ${failed}`);
      const stage = await rectOf(canvas);
      await mouse.hover({ x: stage.x + stage.width + 20, y: stage.y + stage.height * 0.5, width: 20, height: 20 });
      await demo(campaignPage).spotlight(stage, 800);
      await mouse.idle(800);
      const video = campaignPage.getByTestId("campaign-video");
      await demo(campaignPage).spotlight(await rectOf(video), 800);
      await mouse.idle(800);
      await mouse.click(guardBox.locator("summary"));
      await mouse.idle(1700);
    });
    await assertClean(campaignPage);

    // ── Scena 10: cardul final, care rămâne ultimul cadru ──
    await scene(10, "campanie", async () => {
      await demo(campaignPage).cursorVisible(false);
      await demo(campaignPage).card(
        `<style>@keyframes end-land{0%{transform:translate(-260px,-180px) rotate(-14deg);opacity:0}70%{transform:translate(8px,6px) rotate(3deg);opacity:1}100%{transform:none;opacity:1}}</style>
         <div style="text-align:center">
           <div style="display:flex;align-items:center;justify-content:center;gap:28px;margin-bottom:26px">
             <img src="/landing/hawk-mark.svg" alt="" style="width:170px;height:170px;display:block;animation:end-land .95s cubic-bezier(.2,.8,.3,1) both .2s">
             <div style="font-size:110px;font-weight:600;letter-spacing:-.02em">Spire</div>
           </div>
           <div style="font-size:42px;color:#f4f1ea">${PUBLIC_ADDRESS}</div>
         </div>`,
        2500,
        { stay: true },
      );
    });
    guard();

    // Închiderea e reperul de timp: video-ul se termină atunci, iar durata lui dă începutul.
    for (const tab of [...tabs].reverse()) {
      tab.closed = now();
      await tab.page.close();
    }

    const toFile = await Promise.all(
      tabs.map(async (tab) => {
        const path = await tab.page.video()!.path();
        const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path], { encoding: "utf8" }).trim());
        return { ...tab, path, duration, videoStart: tab.closed! - duration * 1000 };
      }),
    );
    const startOf = new Map(toFile.map((t) => [t.id, t.videoStart]));
    const relative = (tab: string, t: number) => Math.round(t - startOf.get(tab)!);
    const lastEnd = new Map(scenes.map((s) => [s.tab, s.end]));
    writeFileSync(
      RUN_JSON,
      `${JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          provider,
          seed: Number(process.env.DEMO_SEED ?? 1107),
          clip: { src: CLIP.replace(APP, ""), from: CLIP_FROM, ms: CLIP_MS },
          brandNote: "Marca Marina Park a fost dată doar browserului filmării (context.route pe citirea spire:marca); în baza comună prima marcă era alta. Baza nu a fost atinsă.",
          filmNotes: [
            ...(real ? [] : ["Filmat cu mock, la cererea echipei: Gemini a fost supraîncărcat pe 7 noiembrie (3 încercări, 502; gemini-3.8-flash n-a răspuns în 40 s, gemini-3.5-flash a dat 503). Critica și scanarea sunt simulate, iar pe ecran scrie „Analiză simulată”."]),
            `Copia extensiei are zborul uliului la ×${(1 / BIRD_SPEED).toFixed(2)} (__spireTestSpeed = ${BIRD_SPEED}) și intrarea de pe marginea ecranului. Nu e accelerare de montaj.`,
            "Fără zoom, la cererea echipei: accentul îl pun spotlight-ul și inelele.",
            "Întrebările de brief din balonul uliului sunt ascunse cu un stil pus de filmare în shadow root; logica lor rulează neschimbată.",
            `Descărcarea clipului e încetinită la ${(DOWNLOAD_BYTES_PER_SECOND / 1e6).toFixed(1)} MB/s din CDP, ca bara reală să se vadă.`,
          ],
          skipped: [],
          critique: findings,
          brief: briefRead,
          aiCalls: aiCalls.map(({ status, kind, provider: from, model }) => ({ status, kind, provider: from, model })),
          tabs: toFile.map((t) => ({ id: t.id, file: resolve(t.path), durationMs: Math.round(t.duration * 1000), lastSceneEndMs: Math.round(lastEnd.get(t.id)! - t.videoStart) })),
          scenes: scenes.map((s) => ({
            id: s.id,
            tab: s.tab,
            wipeIn: s.wipeIn,
            start: relative(s.tab, s.start),
            end: relative(s.tab, s.end),
            realMs: Math.round(s.end - s.start),
            marks: Object.fromEntries(Object.entries(s.marks).map(([k, v]) => [k, relative(s.tab, v)])),
            waits: s.waits.map((w) => ({ label: w.label, start: relative(s.tab, w.start), end: relative(s.tab, w.end) })),
          })),
        },
        null,
        2,
      )}\n`,
    );
    expect(existsSync(RUN_JSON)).toBe(true);
    console.log(`Apeluri AI: ${aiCalls.length} (${aiCalls.map((c) => `${c.kind}: ${c.provider ?? "?"}`).join(", ")}). Provider cerut: ${provider}.`);
    console.log(`Critica: ${findings.map((f) => f.title).join(" | ")}`);
    console.log(`Brief: ${JSON.stringify(briefRead)}`);
    console.log(scenes.map((s) => `${s.id}:${((s.end - s.start) / 1000).toFixed(1)}s`).join(" "));
  } finally {
    await context.close().catch(() => undefined);
    execFileSync(process.execPath, ["scripts/demo-seed.mjs", "--remove"], { cwd: ROOT, stdio: "inherit" });
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  }
});
