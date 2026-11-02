import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
});

test("comenzi vocale (text, mod demo) execută acțiuni pe pânză", async ({ page }) => {
  await page.goto("/agent?demo=1");
  await page.getByPlaceholder(/pune un cerc/).fill("pune un cerc roșu");
  await page.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText("✓ add_shape")).toBeVisible();
  await page.getByPlaceholder(/pune un cerc/).fill("anulează");
  await page.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText("✓ undo")).toBeVisible();
});

test("telefonul ca controller: layout-ul se schimbă de pe ecran și voturile se numără", async ({ context }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  const href = await screen.locator("a[href*='/controller?code=']").getAttribute("href");
  const phone = await context.newPage();
  await phone.goto(href!);
  await phone.getByPlaceholder("Numele tău").fill("Ana");
  await phone.getByRole("button", { name: "Intră" }).click();
  await expect(screen.getByText("1 telefoane")).toBeVisible({ timeout: 10000 });
  await expect(phone.getByRole("button", { name: "A", exact: true })).toBeVisible({ timeout: 10000 });

  await screen.getByRole("button", { name: /Vot/ }).click();
  await phone.getByRole("button", { name: "Joc cu gesturi" }).click();
  await expect(screen.getByText("Joc cu gesturi").locator("..").getByText("1")).toBeVisible({ timeout: 5000 });

  await screen.getByRole("button", { name: /Text/ }).click();
  await phone.getByPlaceholder("Scrie aici…").fill("Merge și offline?");
  await phone.getByRole("button", { name: "Trimite" }).click();
  await expect(screen.getByText("Merge și offline?")).toBeVisible();
});

test("business canvas → sondaj live → rezultate pentru pitch", async ({ context }) => {
  const host = await context.newPage();
  await host.goto("/business?demo=1");
  await host.getByRole("button", { name: "Generează canvas" }).click();
  await expect(host.getByText("Cine folosește, cine plătește")).toBeVisible();
  await host.getByRole("button", { name: /Validează cu un sondaj live/ }).click();
  await expect(host.getByRole("heading", { name: "Sondaj live de validare" })).toBeVisible();

  const href = await host.locator("a[href*='/s?code=']").getAttribute("href");
  for (const yes of [true, false]) {
    const phone = await context.newPage();
    await phone.goto(href!);
    await phone.getByRole("button", { name: yes ? "Da" : "Nu" }).click();
    await phone.getByRole("button", { name: "4" }).click();
    await phone.getByRole("button", { name: "15 €" }).click();
    await expect(phone.getByText("Mulțumim!")).toBeVisible();
    await phone.close();
  }
  await expect(host.getByText("1 din 2 (50%) au răspuns „Da”")).toBeVisible({ timeout: 5000 });
  await expect(host.getByText("cel mai ales: „15 €” (2 din 2, 100%)")).toBeVisible();
  await expect(host.getByText("2 respondenți")).toBeVisible();
});

test("față: modelul se încarcă și afișează expresiile", async ({ page }) => {
  await page.goto("/body");
  await expect(page.getByText("zâmbet")).toBeVisible();
  await page.getByRole("button", { name: /Corp/ }).click();
  await expect(page.getByText("Model: running")).toBeVisible({ timeout: 30000 });
});

test("sunet: microfonul (fals) pornește și raportează volumul", async ({ page }) => {
  await page.goto("/sound");
  await page.getByRole("button", { name: /Pornește microfonul/ }).click();
  await expect(page.getByRole("button", { name: /Oprește microfonul/ })).toBeVisible();
  await expect(page.getByText(/bass \d\.\d\d/)).toBeVisible();
});

test("mod kiosk: ecran de start, apoi aplicația fără meniu și contorul de sesiuni", async ({ page }) => {
  await page.goto("/pipeline?kiosk=1");
  await expect(page.getByText("Atinge oriunde ca să începi")).toBeVisible();
  await page.getByText("Atinge oriunde ca să începi").click();
  await expect(page.getByRole("heading", { name: "Flux complet" })).toBeVisible();
  await expect(page.getByText(/🔥 \d+ oameni au încercat azi/)).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("link", { name: "Design editabil" })).toHaveCount(0);
});
