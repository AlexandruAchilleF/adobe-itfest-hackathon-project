import { expect, type Page, test } from "@playwright/test";

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
