import { expect, type Page, test } from "@playwright/test";

// Formatul 2024: raportezi de pe telefon la locația curentă; raportul devine sesizare cu flux,
// echipa primăriei o preia și o rezolvă, cetățeanul confirmă din SMS sau spune „nu s-a rezolvat”.
async function offline(page: Page) {
  page.on("pageerror", (err) => {
    throw err;
  });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
}

test("telefon → sesizare → echipa o rezolvă → cetățeanul spune „nu s-a rezolvat” → echipa reia", async ({ context, page }) => {
  await offline(page);
  await page.goto("/cereri?demo=1&dev=1&ca=echipa-drumuri");
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await expect(page.getByText("8 sesizări")).toBeVisible();

  // juriul, cu telefonul (alt identitate: devine automat „Cetățean N”)
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 44.4371, longitude: 26.1289 });
  const phone = await context.newPage();
  await offline(phone);
  await phone.setViewportSize({ width: 390, height: 800 });
  await phone.goto("/raport?demo=1");
  await expect(phone.getByTestId("report-location")).toContainText("precizie");
  await phone.getByLabel("Detaliu").fill("în fața școlii");
  await phone.getByRole("button", { name: /Groapă în carosabil/ }).click();
  await phone.getByRole("link", { name: /Urmărește/ }).click();
  await expect(phone.getByTestId("confirm-waiting")).toContainText("Acum așteaptă: echipă primărie");

  // laptopul echipei o vede live, fără refresh
  const list = page.getByTestId("request-list");
  await expect(page.getByText("9 sesizări")).toBeVisible({ timeout: 8000 });
  await list.getByRole("button", { name: /Groapă în carosabil: în fața școlii/ }).click();
  await expect(page.getByText("GPS 44.43710, 26.12890")).toBeVisible();
  const steps = page.getByTestId("steps");
  await steps.getByRole("button", { name: "Preiau" }).click();
  await steps.getByRole("button", { name: "Marchează rezolvat" }).click();
  const sms = page.getByTestId("outbox").locator("li").first();
  await expect(sms).toContainText("Echipa Drumuri spune că „Groapă în carosabil: în fața școlii” e rezolvat. Ai verificat?");

  // cetățeanul, din linkul din SMS
  await phone.reload();
  await phone.getByLabel("Ce s-a întâmplat").fill("Au pus doar nisip");
  await phone.getByRole("button", { name: /Nu s-a rezolvat/ }).click();
  await expect(phone.getByTestId("confirm-result")).toContainText("SMS simulat către Echipa Drumuri");

  await expect(list.locator("li", { hasText: "în fața școlii" })).toContainText("nerezolvat", { timeout: 8000 });
  await list.getByRole("button", { name: /în fața școlii/ }).click();
  await steps.getByRole("button", { name: "Reiau lucrarea" }).click();
  await expect(page.getByTestId("timeline")).toContainText("spune că nu s-a rezolvat — Au pus doar nisip");
});

test("cronometrul arată cât stau sesizările nepreluate", async ({ page }) => {
  await offline(page);
  await page.goto("/cereri?demo=1&dev=1&ca=echipa-iluminat");
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await page.goto("/cronometru?demo=1");
  await expect(page.getByTestId("process-waiting")).toContainText("Bec stins pe toată aleea");
  await expect(page.getByTestId("process-waiting")).toContainText("nepreluată încă (echipă primărie)");
});
