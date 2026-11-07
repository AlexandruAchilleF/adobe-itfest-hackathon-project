// Extensia și aplicația împart datele? Panoul e un iframe pe alt site, deci aici contează partiționarea.
import { expect, type Page, test } from "@playwright/test";
import { loadEnv } from "vite";

const HOST = "https://site-gazda.test";
const env = loadEnv("production", process.cwd(), "VITE_SUPABASE");

/** Un site oarecare, cu Spire într-un iframe, ca în extensie. */
async function hostWith(page: Page, baseURL: string, path: string) {
  await page.route(`${HOST}/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: `<iframe id="spire" src="${baseURL}${path}" width="420" height="900"></iframe>` }),
  );
  await page.goto(`${HOST}/`);
  return page.frameLocator("#spire");
}

async function removeCampaign(id: string) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/records?id=eq.${id}`, {
    method: "DELETE",
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` },
  });
  expect(res.ok).toBe(true);
}

test("marca schimbată în tab se vede în panou", async ({ page, context, baseURL }) => {
  const tab = await context.newPage();
  await tab.goto("/marca");
  const name = tab.getByLabel("Numele mărcii");
  await expect(name).not.toHaveValue("");
  const original = await name.inputValue();
  const changed = `Probă ${Date.now()}`;
  await name.fill(changed);
  await tab.getByRole("button", { name: "Salvează marca" }).click();
  await expect(tab.getByText(/salvat/i).first()).toBeVisible();

  try {
    const frame = await hostWith(page, baseURL!, "/marca");
    await expect(frame.getByLabel("Numele mărcii")).toHaveValue(changed);
  } finally {
    await tab.bringToFront();
    await name.fill(original);
    await tab.getByRole("button", { name: "Salvează marca" }).click();
    await expect(tab.getByText(/salvat/i).first()).toBeVisible();
  }
});

test("campania făcută în panou se deschide în tab și apare în Campanii", async ({ page, context, baseURL }) => {
  const frame = await hostWith(page, baseURL!, `/nou?din=extensie&hostOrigin=${encodeURIComponent(HOST)}`);
  await expect(frame.getByRole("img", { name: /Spire/ }).first()).toBeVisible();
  const brief = { source: { url: `${HOST}/`, title: "Site gazdă" }, answers: { product: "Gelato de vară", audience: "Familii", goal: "Vizite", cta: "Vino azi" } };
  await page.evaluate((b) => (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:brief", brief: b }, "*"), brief);
  await frame.getByRole("button", { name: "Folosește exemplul" }).click();
  // pe producție, analiza trece prin AI-ul real
  await expect(frame.getByText("Ce am văzut")).toBeVisible({ timeout: 90_000 });
  await frame.getByRole("button", { name: "Fă campania", exact: true }).click();

  const opened = context.waitForEvent("page");
  // „Deschide în Spire” vine în Task 5 (David); până atunci, perechea veche de butoane
  const open = frame.getByRole("button", { name: "Deschide în Spire" }).or(frame.getByRole("button", { name: "Salvează campania" }));
  await open.click({ timeout: 150_000 });
  const old = frame.getByRole("link", { name: "Deschide în Campanii" });
  await old.waitFor({ timeout: 15_000 }).then(() => old.click()).catch(() => undefined);

  const tab = await opened;
  await tab.waitForURL(/\/campanii\/[0-9a-f-]{36}$/);
  await expect(tab.getByText("Campania nu mai există")).toHaveCount(0);
  await expect(tab.getByRole("button", { name: "Descarcă PNG" })).toBeVisible();

  const id = new URL(tab.url()).pathname.split("/").pop()!;
  try {
    await tab.goto("/campanii");
    await expect(tab.locator(`a[href="/campanii/${id}"]`).first()).toBeVisible();
  } finally {
    await removeCampaign(id);
  }
});

test("baza de date nu răspunde: tabul spune asta, nu că lipsește campania", async ({ page }) => {
  await page.route("**/rest/v1/**", (route) => route.abort());
  await page.goto("/campanii/00000000-0000-4000-8000-000000000000");
  // supabase-js reîncearcă de câteva ori înainte să întoarcă eroarea
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Campania nu mai există")).toHaveCount(0);
});
