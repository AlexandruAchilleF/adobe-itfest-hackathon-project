import { expect, type Page, test } from "@playwright/test";

// Fără internet: tile-urile hărții și geocodarea sunt simulate.
async function offline(page: Page) {
  page.on("pageerror", (err) => {
    throw err;
  });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("**/api/geocode**", (r) => r.fulfill({ json: { lat: 44.416, lng: 26.173, label: "Titan, București" } }));
}

test.beforeEach(async ({ page }) => offline(page));

test("start: tema → rețeta potrivită", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Un om, un input haotic/ })).toBeVisible();
  await page.getByRole("link", { name: "Documente → răspunsuri verificate →" }).first().click();
  await expect(page).toHaveURL(/\/docs$/);
});

test("documente: structură JSON, răspuns cu citat verificat, salt la pagină, persona", async ({ page }) => {
  await page.goto("/docs?demo=1");
  await page.getByRole("button", { name: "Folosește exemplul" }).click();
  const outline = page.getByTestId("outline");
  await expect(outline).toContainText("2.2 Capacitatea tehnică");
  await expect(outline).toContainText("4. Documente de depus");

  await page.getByRole("button", { name: "Întreabă" }).click();
  const answer = page.getByTestId("answer");
  await expect(answer).toContainText("✓ verificat în text");
  // mascota reacționează: sursa a fost verificată
  await expect(page.getByTestId("mascot")).toHaveAttribute("data-mood", "happy");
  await expect(page.getByTestId("mascot")).toContainText("Am verificat sursa");

  // click pe un titlu de pe pagina 3 → viewer-ul pdf.js sare acolo
  await outline.getByText("5.1 Depunerea ofertelor").click();
  await expect(page.getByTestId("pdf-page")).toHaveText("Pagina 3 / 3");

  await page.getByRole("button", { name: "Ierarhizează secțiunile" }).click();
  await expect(page.getByText(/% · p\. \d/).first()).toBeVisible();
});

test("design: generează, auditul găsește probleme, repararea le rezolvă, QR", async ({ page }) => {
  await page.goto("/design?demo=1");
  await page.getByRole("button", { name: /Generează/ }).click();
  await expect(page.getByText("Generez…")).toBeHidden();
  await expect(page.getByText(/— \d+ probleme/)).toBeVisible();
  await expect(page.getByTestId("mascot")).toHaveAttribute("data-mood", "worried");
  await page.getByRole("button", { name: /Repară automat/ }).click();
  await expect(page.getByText(/Se citește\? — ✓/)).toBeVisible();
  await expect(page.getByTestId("mascot")).toHaveAttribute("data-mood", "celebrate");
  await expect(page.getByText(/font \d+px → \d+px/).first()).toBeVisible();
  await page.getByRole("button", { name: "QR" }).click();
  await expect(page.getByAltText(/Cod QR/)).toBeVisible();
});

test("hartă: datele de seed, adăugare în limbaj natural cu verificare, potrivire", async ({ page }) => {
  await page.goto("/map?demo=1");
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await expect(page.getByText("8 înregistrări")).toBeVisible();
  await expect(page.locator(".leaflet-interactive")).toHaveCount(8);

  await page.getByPlaceholder(/La cantina de pe Calea Moșilor/).fill("Școala din Titan are nevoie de 10 laptopuri pentru elevi");
  await page.getByRole("button", { name: "Structurează" }).click();
  await expect(page.getByText("Verifică înainte să salvezi:")).toBeVisible();
  await page.getByLabel("Categorie").selectOption("educație");
  await page.getByRole("button", { name: "Salvează pe hartă" }).click();
  await expect(page.getByText("9 înregistrări")).toBeVisible();

  await page.getByRole("button", { name: "Găsește potriviri" }).click();
  await expect(page.getByText(/\/100/).first()).toBeVisible();
});

test("asistent: citește direct, modificarea cere aprobare", async ({ page }) => {
  await page.goto("/map?demo=1");
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await expect(page.getByText("8 înregistrări")).toBeVisible();
  await page.goto("/assistant?demo=1");
  const input = page.getByPlaceholder(/marchează păturile/);

  await input.fill("arată-mi nevoile urgente");
  await page.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText("✓ find_needs")).toBeVisible();
  await expect(page.getByText(/Rezultate \(\d+\)/)).toBeVisible();

  await input.fill("marchează păturile ca rezolvat");
  await page.getByRole("button", { name: "Trimite" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmă acțiunile" });
  await expect(dialog).toContainText("„Pături și saci de dormit” → rezolvat");
  await dialog.getByRole("button", { name: "Aprobă" }).click();
  await expect(page.getByText("✓ set_status")).toBeVisible();
  await page.getByRole("button", { name: "Arată tot" }).click();
  await expect(page.getByTestId("needs-list").locator("li", { hasText: "Pături și saci de dormit" })).toContainText("rezolvat");
});

test("validare: business canvas → sondaj → rezultate pentru pitch", async ({ context, page }) => {
  await page.goto("/business?demo=1");
  await page.getByRole("button", { name: "Generează canvas" }).click();
  await expect(page.getByText("Cine folosește, cine plătește")).toBeVisible();
  await page.getByRole("button", { name: /Validează cu un sondaj live/ }).click();
  const href = await page.locator("a[href*='/s?code=']").getAttribute("href");
  const phone = await context.newPage();
  await offline(phone);
  await phone.goto(href!);
  await phone.getByRole("button", { name: "Da" }).click();
  await phone.getByRole("button", { name: "4" }).click();
  await phone.getByRole("button", { name: "50 €" }).click();
  await expect(phone.getByText("Mulțumim!")).toBeVisible();
  await expect(page.getByText("1 din 1 (100%) au răspuns „Da”")).toBeVisible({ timeout: 8000 });
});

test("/api/health și AI structurat", async ({ page, request }) => {
  expect((await (await request.get("/api/health")).json()).active).toBe("mock");
  await page.goto("/ai");
  await page.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText(/"ideas": \[/)).toBeVisible();
});

test("tipărire: fără meniu și fără antetul paginii", async ({ page }) => {
  await page.goto("/docs?demo=1");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("link", { name: "Business canvas" })).toBeHidden();
  await expect(page.getByRole("heading", { name: /Documente → răspunsuri verificate/ })).toBeHidden();
});
