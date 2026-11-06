import { expect, test } from "@playwright/test";

// Repetiția pe brief-ul ITFest × Adobe 2023 (ResourceWise), în modul de pitch: doar config, niciun cod nou.
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
  await page.route("**/tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204, body: "" }));
});

test("modul de pitch: fără unelte de echipă în fața juriului", async ({ page }) => {
  await page.goto("/?demo=1");
  await expect(page.getByRole("heading", { name: /Mâncarea de azi, la masa de diseară/ })).toBeVisible();
  await expect(page.getByText("Mod demo")).toHaveCount(0);
  await expect(page.getByText("Pentru echipă")).toHaveCount(0);
  await page.getByRole("button", { name: /Sunt adăpost/ }).click();
  await expect(page.getByRole("button", { name: /Resetează/ })).toHaveCount(0);
});

test("bucla din brief: adăpostul confirmă, restaurantul primește puncte și rang", async ({ page }) => {
  await page.goto("/harta?demo=1&ca=adapost-grivitei");
  await page.getByTestId("request-list").getByRole("button", { name: /Tocăniță pentru 30/ }).click();
  await page.getByTestId("steps").getByRole("button", { name: "Am primit", exact: true }).click();
  await expect(page.getByTestId("notice")).toContainText("+100 puncte pentru Bistro Piața Romană. Rang nou: Donator de încredere!");
  await expect(page.getByTestId("notice")).toContainText("SMS simulat către Bistro Piața Romană");

  // cererea neluată de nimeni: mascota nu dă vina pe un restaurant anume
  await page.getByTestId("request-list").getByRole("button", { name: /25 de porții calde/ }).click();
  await expect(page.getByTestId("request-list")).toContainText("caută donator");
});
