import { existsSync, statSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { critiqueStops } from "../src/lib/landingCritique";

const REFERENCE = "public/samples/spire/referinta.png";

/** Parcurge fluxul pe mock până la campania salvată. */
async function makeCampaign(page: Page) {
  await page.goto("/nou");
  await page.setInputFiles("input[type=file]", REFERENCE);
  await expect(page.getByText("Ce am văzut")).toBeVisible();
  await page.getByRole("button", { name: "Gelato" }).click();
  await page.getByRole("button", { name: "Fă campania" }).click();
  await expect(page.getByText("Prețul e cel din ofertă")).toBeVisible();
  await page.getByRole("button", { name: "Salvează campania" }).click();
  await expect(page).toHaveURL(/\/campanii\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("referință → întrebări → kit verificat → campanie salvată", async ({ page }) => {
  await makeCampaign(page);
  await page.goto("/campanii");
  await expect(page.getByRole("link", { name: /Gelato/ })).toBeVisible();
});

test("prețul schimbat de mână face bifa roșie", async ({ page }) => {
  await makeCampaign(page);
  await expect(page.getByTestId("check-price")).toContainText("trece");
  await page.getByLabel("Ofertă").fill("59 lei");
  await expect(page.getByTestId("check-price")).toContainText("nu trece");
  await expect(page.getByTestId("check-price")).toContainText("59 lei");
});

test("mutarea unui strat pe pânză păstrează fontul mărcii", async ({ page }) => {
  await makeCampaign(page);
  await expect(page.getByTestId("check-fonts")).not.toContainText("nu trece");
  await page.waitForTimeout(500);
  const box = (await page.locator(".upper-canvas").boundingBox())!;
  const x = box.x + box.width * 0.25;
  const y = box.y + box.height * 0.1;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y + 10, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(page.getByTestId("check-fonts")).not.toContainText("nu trece");
});

test("exportul PNG descarcă designul", async ({ page }) => {
  await makeCampaign(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("landing: critica și extensia apar după noapte, în ordinea poveștii", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#extensie")).toBeAttached();
  const order = await page.locator("main section").evaluateAll((all) => all.map((s) => s.querySelector("h1,h2")?.textContent ?? s.id));
  const at = (t: string) => order.findIndex((o) => o.includes(t));
  expect(at("Stilul altcuiva")).toBeLessThan(at("Ochi de uliu"));
  expect(at("Ochi de uliu")).toBeLessThan(at("inSPIRĂ"));
  expect(at("inSPIRĂ")).toBeLessThan(at("N-ai designer"));
  await expect(page.locator("#critica")).toContainText("părere despre ierarhie și mesaj");
  await expect(page.locator("#critica")).toContainText("cel mult 8 observații");
  await expect(page.locator("main")).not.toContainText("audit complet");
});

test("landing: linkul din meniu duce la extensie, iar butonul descarcă ZIP-ul", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Extensia" }).click();
  await expect(page).toHaveURL(/#extensie$/);
  await expect(page.locator("#extensie")).toBeInViewport();
  await expect(page.locator("#extensie")).toContainText("Developer mode");
  await expect(page.locator("main")).not.toContainText("Chrome Web Store");
  const download = page.waitForEvent("download");
  await page.locator("#extensie").getByRole("link", { name: "Descarcă extensia" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("spire-extensie.zip");
  const path = await file.path();
  expect(existsSync(path) && statSync(path).size).toBeGreaterThan(1000);
});

test("landing: macheta criticii afișează textele reale, unul după altul", async ({ page }) => {
  const stops = critiqueStops();
  await page.goto("/#critica");
  await page.locator("#critica .land-stage").scrollIntoViewIfNeeded();
  const balon = page.getByTestId("critica-balon");
  await expect(balon).toContainText(stops[0].critique.title, { timeout: 8000 });
  await expect(balon).toContainText("Important");
  await expect(balon).toContainText(stops[0].critique.fix);
  await expect(balon).toContainText(stops[1].critique.title, { timeout: 10000 });
  await expect(balon).toContainText("De îmbunătățit");
  await expect(page.locator("#critica .land-outline")).toHaveCount(1);
});

test("landing: cu mișcare redusă, critica arată toate observațiile, fără zbor", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const stop of critiqueStops()) await expect(page.locator("#critica").getByText(stop.critique.title)).toBeAttached();
  await expect(page.locator("#critica .land-outline")).toHaveCount(critiqueStops().length);
  await expect(page.getByTestId("critica-balon")).toHaveCount(0);
});

test("landing pe telefon: fără scroll orizontal, fără descărcare, cu link spre aplicație", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.locator("#extensie");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("Extensia se instalează pe calculator, în Chrome")).toBeVisible();
  await expect(section.getByRole("link", { name: "Descarcă extensia" })).toBeHidden();
  await expect(section.getByText("Developer mode")).toBeHidden();
  await page.locator("#critica .land-stage").scrollIntoViewIfNeeded();
  await expect(page.locator("#critica").getByTestId("critica-text").filter({ hasText: critiqueStops()[0].critique.title })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  await section.getByRole("link", { name: "Încearcă Spire în browser" }).click();
  await expect(page).toHaveURL(/\/nou$/);
});

/** Aplicația într-un iframe, ca în extensie. */
async function embedded(page: Page) {
  const base = new URL(page.url()).origin;
  await page.setContent(`<iframe id="spire" src="${base}/nou?din=extensie" width="420" height="800"></iframe>`);
  const frame = page.frameLocator("#spire");
  await expect(frame.getByRole("img", { name: /Spire/ }).first()).toBeVisible();
  return frame;
}
const IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test("din extensie: mesajul cu referința deschide analiza", async ({ page }) => {
  const frame = await embedded(page);
  await page.evaluate((image) => {
    (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:reference", image, elementIds: [] }, "*");
  }, IMAGE);
  await expect(frame.getByText("Ce am văzut")).toBeVisible();
});

test("din extensie: mesajul spire:page primește spire:picks și un rezumat în balon", async ({ page }) => {
  const frame = await embedded(page);
  const picks = page.evaluate(
    () =>
      new Promise((resolve) => {
        window.addEventListener("message", (e) => e.data?.type === "spire:picks" && resolve(e.data.picks));
        const element = { id: "h", tag: "h1", text: "Reducere -20%", box: { x: 0, y: 0, w: 1400, h: 500 }, styles: { color: "#000", background: "#fff", fontFamily: "Arial", fontSize: "60px", fontWeight: "700" }, inFirstScreen: true };
        const page = { url: "https://exemplu.ro", title: "Exemplu", headings: ["Reducere -20%"], ctas: [], colors: ["#000000"], fonts: ["Arial"] };
        (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:page", page, elements: [element] }, "*");
      }),
  );
  expect(await picks).toMatchObject([{ elementId: "h", kind: "hero" }]);
  await expect(frame.getByText(/Am găsit 1/)).toBeVisible();
});

test("din extensie: mesajele care nu vin de la fereastra părinte sunt ignorate", async ({ page }) => {
  const frame = await embedded(page);
  await frame.locator("body").evaluate((_, image) => {
    window.postMessage({ type: "spire:reference", image, elementIds: [] }, "*");
  }, IMAGE);
  await page.waitForTimeout(800);
  await expect(frame.getByText("Ce am văzut")).toHaveCount(0);
});

test("marca se schimbă din formular și rămâne salvată", async ({ page }) => {
  await page.goto("/marca");
  await page.getByLabel("Numele mărcii").fill("Altă marcă");
  await page.getByRole("button", { name: "Salvează marca" }).click();
  await expect(page.getByText("Marca e salvată")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Numele mărcii")).toHaveValue("Altă marcă");
});

test("landing page-ul spune ce face Spire și duce la campania nouă", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Spire îl face pe marca ta.");
  // verdictul gărzii, calculat de cod pe campania de exemplu (macheta din secțiunea „Garda”)
  await expect(page.locator("#garda").getByText(/^\d+ din \d+ verificări trec$/)).toBeAttached();
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Încearcă acum" }).click();
  await expect(page).toHaveURL(/\/nou$/);
});
