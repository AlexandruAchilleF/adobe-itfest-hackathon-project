import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
});

test("home arată starea și modulele", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Piese gata de asamblat" })).toBeVisible();
  await expect(page.getByText("AI: mock")).toBeVisible();
});

test("/api/health răspunde", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).active).toBe("mock");
});

test("AI structurat întoarce JSON validat", async ({ page }) => {
  await page.goto("/ai");
  await page.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText(/"ideas": \[/)).toBeVisible();
  await expect(page.getByText(/mock · mock · \d+ ms/)).toBeVisible();
});

test("fluxul complet generează un design editabil și un QR", async ({ page }) => {
  await page.goto("/pipeline");
  await page.getByRole("textbox").first().fill("Concert caritabil vineri seara");
  await page.getByRole("button", { name: /Generează/ }).click();
  await expect(page.getByText("Generez…")).toBeHidden();
  await page.getByRole("button", { name: "QR" }).click();
  await expect(page.getByAltText(/Cod QR/)).toBeVisible();
  const href = await page.locator("a[href*='/view#']").getAttribute("href");
  expect(href).toBeTruthy();

  // linkul din QR deschide designul
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: "Concert caritabil vineri seara" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Descarcă PNG" })).toBeVisible();
});

test("canvas: adaugă și șterge elemente, exportă JSON", async ({ page }) => {
  await page.goto("/canvas");
  const json = page.locator("textarea");
  await expect(json).toContainText('"id": "title"');
  await page.getByRole("button", { name: "+ Cerc" }).click();
  const count = async () => ((await json.inputValue()).match(/"type": "circle"/g) ?? []).length;
  await expect.poll(count).toBe(2);
  await page.getByRole("button", { name: "Șterge" }).click();
  await expect.poll(count).toBe(1);
});

test("camera pornește și încarcă modelul de mâini", async ({ page }) => {
  await page.goto("/camera");
  await expect(page.locator("video")).toHaveJSProperty("paused", false, { timeout: 15000 });
  await expect(page.getByText("running")).toBeVisible({ timeout: 30000 });
});

test("multiplayer local: două tab-uri se văd și împart starea", async ({ context }) => {
  const a = await context.newPage();
  await a.goto("/room?code=TEST");
  const b = await context.newPage();
  await b.goto("/room?code=TEST");
  await expect(a.getByText("Jucători (2)")).toBeVisible({ timeout: 10000 });
  await expect(b.getByText("Jucători (2)")).toBeVisible({ timeout: 10000 });
  await b.getByRole("button", { name: "APASĂ!" }).click();
  await expect(a.getByText(/a fost primul/)).toBeVisible({ timeout: 5000 });
});

test("pagina PDF se încarcă fără Client ID", async ({ page }) => {
  await page.goto("/pdf");
  await expect(page.getByText("Alege un PDF")).toBeVisible();
});

test("pagina de voce se încarcă", async ({ page }) => {
  await page.goto("/voice");
  await expect(page.getByRole("button", { name: /Citește/ })).toBeVisible();
});
