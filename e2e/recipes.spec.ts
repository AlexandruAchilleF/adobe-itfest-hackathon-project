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

test("start: produsul pentru juriu, ghidul pentru echipă", async ({ page }) => {
  await page.goto("/?demo=1");
  await expect(page.getByRole("heading", { name: /Vecinii aduc, bunicii confirmă/ })).toBeVisible();
  await expect(page.getByTestId("impact")).toContainText("cereri încheiate și confirmate");
  await page.getByRole("button", { name: /Sunt vârstnic/ }).click();
  await expect(page).toHaveURL(/\/cereri$/);
  await expect(page.getByLabel(/Ce îți lipsește/)).toBeVisible();

  await page.goto("/start");
  await expect(page.getByText("✓ Config-ul trece verificările")).toBeVisible();
  await page.getByRole("link", { name: "Documente → răspunsuri verificate →" }).click();
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
  await expect(page.getByText(/— (o problemă|\d+ probleme)/)).toBeVisible();
  await expect(page.getByTestId("mascot")).toHaveAttribute("data-mood", "worried");
  await page.getByRole("button", { name: /Repară automat/ }).click();
  await expect(page.getByText(/Se citește\? — ✓/)).toBeVisible();
  await expect(page.getByTestId("mascot")).toHaveAttribute("data-mood", "celebrate");
  await expect(page.getByText(/font \d+px → \d+px/).first()).toBeVisible();
  await page.getByRole("button", { name: "QR" }).click();
  await expect(page.getByAltText(/Cod QR/)).toBeVisible();
});

test("asistent: citește direct, modificarea cere aprobare", async ({ page }) => {
  await page.goto("/harta?demo=1&ca=andrei");
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await expect(page.getByText("8 cereri")).toBeVisible();
  await page.goto("/assistant?demo=1");
  const input = page.getByPlaceholder(/cererile urgente/);

  await input.fill("arată-mi cererile urgente");
  await page.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText("✓ find_requests")).toBeVisible();
  await expect(page.getByText(/Rezultate \(\d+\)/)).toBeVisible();

  await input.fill("mă ocup eu de apă plată");
  await page.getByRole("button", { name: "Trimite" }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmă acțiunile" });
  await expect(dialog).toContainText("„Apă plată, 6 sticle” → Mă ocup eu");
  await dialog.getByRole("button", { name: "Aprobă" }).click();
  await expect(page.getByText("✓ request_step")).toBeVisible();
  await page.getByRole("button", { name: "Arată tot" }).click();
  await expect(page.getByTestId("assistant-list").locator("li", { hasText: "Apă plată, 6 sticle" })).toContainText("acceptat");
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
  await expect(page.getByRole("link", { name: "Profilul meu" })).toBeHidden();
  await expect(page.getByRole("heading", { name: /Documente → răspunsuri verificate/ })).toBeHidden();
});

test("mascota: vorbești cu ea și face lucruri în aplicație", async ({ page }) => {
  await page.goto("/docs?demo=1");
  // pagina se încarcă leneș: mascota primește acțiunile paginii abia după ce apare
  await expect(page.getByRole("button", { name: "Folosește exemplul" })).toBeVisible();
  await page.getByTestId("mascot").getByRole("button", { name: /Vorbește cu/ }).click();
  const box = page.getByRole("dialog", { name: /Vorbește cu/ });
  await box.getByLabel(/Mesaj pentru/).fill("deschide exemplul");
  await box.getByRole("button", { name: "↵" }).click();
  await expect(page.getByTestId("outline")).toContainText("2.2 Capacitatea tehnică");

  await box.getByLabel(/Mesaj pentru/).fill("du-mă la hartă");
  await box.getByRole("button", { name: "↵" }).click();
  await expect(page).toHaveURL(/\/cereri/);
});

test("mascota: turul ghidat evidențiază pașii (?tour=1 pentru pitch)", async ({ page }) => {
  await page.goto("/design?demo=1&tour=1");
  const tour = page.getByTestId("mascot-tour");
  await expect(tour).toContainText("pasul 1 din 4");
  await expect(page.locator('[data-tour="design-brief"]')).toHaveClass(/mascot-highlight/);
  await tour.getByRole("button", { name: "Mai departe" }).click();
  await expect(tour).toContainText("pasul 2 din 4");
  await expect(page.locator('[data-tour="design-canvas"]')).toHaveClass(/mascot-highlight/);
  await expect(page.locator('[data-tour="design-brief"]')).not.toHaveClass(/mascot-highlight/);
  await tour.getByRole("button", { name: "Închide" }).click();
  await expect(tour).toBeHidden();
});
