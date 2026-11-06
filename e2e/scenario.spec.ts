import { expect, type Page, test } from "@playwright/test";

// Fluxul scenariului cap-coadă, fără internet: tile-urile și geocodarea sunt simulate.
async function offline(page: Page) {
  page.on("pageerror", (err) => {
    throw err;
  });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
  await page.route("**/api/geocode**", (r) => r.fulfill({ json: { lat: 44.4465, lng: 26.1195, label: "Calea Moșilor, București" } }));
}

test.beforeEach(async ({ page }) => offline(page));

async function fresh(page: Page, as: string) {
  await page.goto(`/harta?demo=1&ca=${as}`);
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await expect(page.getByText("8 cereri")).toBeVisible();
}

test("bucla: vecinul acceptă și livrează, vârstnicul confirmă", async ({ page }) => {
  await fresh(page, "andrei");
  const list = page.getByTestId("request-list");
  await list.getByRole("button", { name: /Apă plată, 6 sticle/ }).click();
  const steps = page.getByTestId("steps");
  await steps.getByRole("button", { name: "Mă ocup eu" }).click();
  await expect(list.locator("li", { hasText: "Apă plată, 6 sticle" })).toContainText("acceptat");
  await steps.getByRole("button", { name: "Am lăsat la ușă" }).click();
  await expect(steps).toContainText("Așteaptă: cel care a cerut");

  // același laptop, celălalt rol
  await page.getByTestId("role-switcher").selectOption("doamna-vasilescu");
  await steps.getByRole("button", { name: "Am primit", exact: true }).click();
  await expect(list.locator("li", { hasText: "Apă plată, 6 sticle" })).toContainText("confirmat");
  await expect(page.getByTestId("timeline")).toContainText("Doamna Vasilescu a confirmat primirea");
});

test("bucla: „nu am primit” contestă livrarea", async ({ page }) => {
  await fresh(page, "domnul-georgescu");
  const list = page.getByTestId("request-list");
  await list.getByRole("button", { name: /Apă pentru weekend/ }).click();
  await page.getByTestId("steps").getByRole("button", { name: "Nu am primit" }).click();
  await expect(list.locator("li", { hasText: "Apă pentru weekend" })).toContainText("contestat");
  await expect(page.getByTestId("timeline")).toContainText("spune: „nu am primit”");
});

test("cererea scrisă în grabă: AI-ul o structurează, omul verifică", async ({ page }) => {
  await fresh(page, "doamna-vasilescu");
  await page.getByLabel(/Ce îți lipsește/).fill("Sunt la etajul 4 pe Calea Moșilor, nu mai am apă, îmi trebuie 6 sticle până diseară");
  await page.getByRole("button", { name: "Pregătește cererea" }).click();
  await expect(page.getByText("Verifică înainte să salvezi")).toBeVisible();
  await expect(page.getByLabel("Cantitate")).toHaveValue("6");
  await expect(page.getByLabel("Categorie")).toHaveValue("apa");
  await page.getByRole("button", { name: "Salvează pe hartă" }).click();
  await expect(page.getByText("9 cereri")).toBeVisible();
});

test("potrivire pentru cine dă: scor determinist + explicație", async ({ page }) => {
  await fresh(page, "andrei");
  await page.getByRole("button", { name: "Găsește potriviri" }).click();
  await expect(page.getByText(/\/100/).first()).toBeVisible();
});

test("două tab-uri: ce acceptă vecinul apare la vârstnic fără refresh", async ({ context, page }) => {
  await fresh(page, "andrei");
  const other = await context.newPage();
  await offline(other);
  await other.goto("/harta?demo=1&ca=doamna-vasilescu");
  await expect(other.getByText("8 cereri")).toBeVisible();
  await page.getByTestId("request-list").getByRole("button", { name: /Apă plată, 6 sticle/ }).click();
  await page.getByTestId("steps").getByRole("button", { name: "Mă ocup eu" }).click();
  await expect(other.getByTestId("request-list").locator("li", { hasText: "Apă plată, 6 sticle" })).toContainText("acceptat", { timeout: 8000 });
});

test("gamificare: confirmarea dă puncte, profilul și clasamentul se schimbă", async ({ page }) => {
  await fresh(page, "elena");
  await page.goto("/clasament?demo=1");
  const board = page.getByTestId("leaderboard");
  await expect(board.locator("li").first()).toContainText("Mihai Stan");
  await expect(board.locator("li", { hasText: "Elena Dobre" })).toContainText("0");

  // Elena a livrat apa pentru weekend; domnul Georgescu confirmă
  await page.goto("/harta?demo=1&ca=domnul-georgescu");
  await page.getByTestId("request-list").getByRole("button", { name: /Apă pentru weekend/ }).click();
  await page.getByTestId("steps").getByRole("button", { name: "Am primit", exact: true }).click();
  await expect(page.getByTestId("notice")).toContainText("+44 puncte pentru Elena Dobre. Rang nou: Vecin de încredere!");

  await page.goto("/clasament?demo=1");
  await expect(board.locator("li").first()).toContainText("Elena Dobre");
  await page.goto("/profil?demo=1&ca=elena");
  await expect(page.getByTestId("profile-points")).toContainText("44");
  await expect(page.getByTestId("profile-rank")).toContainText("Vecin de încredere");
});

test("raport rapid de pe telefon: locația curentă, ora, apare live pe hartă", async ({ context, page }) => {
  await fresh(page, "andrei");
  await expect(page.getByTestId("live-reports").locator("li")).toHaveCount(3);
  const pins = page.locator(".leaflet-interactive");
  const before = await pins.count();

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 44.4355, longitude: 26.1025 });
  const phone = await context.newPage();
  await offline(phone);
  await phone.setViewportSize({ width: 390, height: 800 });
  await phone.goto("/raport");
  await expect(phone.getByTestId("report-location")).toContainText("precizie");
  await phone.getByLabel("Detaliu").fill("Lângă Universitate");
  await phone.getByRole("button", { name: /Apă gratuită/ }).click();
  await expect(phone.getByRole("status")).toContainText("trimis la");
  await expect(phone.getByTestId("recent-reports").locator("li").first()).toContainText("Lângă Universitate");

  // harta de pe laptop îl primește fără refresh
  await expect(page.getByTestId("live-reports").locator("li").first()).toContainText("Lângă Universitate", { timeout: 8000 });
  await expect(page.getByTestId("live-reports").locator("li").first()).toContainText("acum");
  await expect(pins).toHaveCount(before + 1);
});

test("notificare: la livrare pleacă SMS (mock) cu link; din link, „nu am primit”", async ({ page }) => {
  await fresh(page, "ioana");
  await page.getByTestId("request-list").getByRole("button", { name: /Apă și sucuri/ }).click();
  await page.getByTestId("steps").getByRole("button", { name: "Am lăsat la ușă" }).click();
  await expect(page.getByTestId("notice")).toContainText("SMS simulat către Domnul Ionescu");
  const sms = page.getByTestId("outbox").locator("li").first();
  await expect(sms).toContainText("Ioana Marin spune că a lăsat 8 sticle la ușă. Ați primit?");
  await expect(sms).toContainText("simulat");

  // domnul Ionescu deschide linkul din SMS pe telefon
  const link = (await sms.textContent())!.match(/https?:\/\/\S+\/c\/[\w-]+/)![0];
  await page.goto(link);
  await page.getByLabel("Ce s-a întâmplat").fill("N-a sunat nimeni la ușă");
  await page.getByRole("button", { name: /Nu am primit/ }).click();
  await expect(page.getByTestId("confirm-result")).toContainText("Ioana Marin pierde 15 puncte");
  await expect(page.getByTestId("confirm-result")).toContainText("SMS simulat către Ioana Marin");

  await page.goto("/harta?demo=1");
  await page.getByTestId("request-list").getByRole("button", { name: /Apă și sucuri/ }).click();
  await expect(page.getByTestId("timeline")).toContainText("N-a sunat nimeni la ușă");
});
