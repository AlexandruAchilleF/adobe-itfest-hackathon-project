import { expect, type Page, test } from "@playwright/test";

// Scenariul de birou: bonul intră haotic, AI-ul (mock) îl citește, codul îl verifică,
// managerul aprobă, contabilul plătește, angajatul confirmă din SMS.
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
});

async function fresh(page: Page, as: string) {
  await page.goto(`/harta?demo=1&dev=1&ca=${as}`);
  await page.getByRole("button", { name: "Resetează datele demo" }).click();
  await expect(page.getByText("8 deconturi")).toBeVisible();
}

test("bonul cu total greșit e prins de cod, omul corectează, apoi trimite", async ({ page }) => {
  await fresh(page, "andrei");
  const intake = page.getByTestId("doc-intake");
  await intake.getByRole("button", { name: "Folosește exemplul" }).click();
  await intake.getByRole("button", { name: "Citește documentul" }).click();
  const checks = page.getByTestId("doc-checks");
  await expect(checks).toContainText("✗ Suma: Liniile fac 78,00 lei, dar totalul scris e 87,00 lei");
  await expect(checks).toContainText("✓ Cod fiscal: 31845676 e un cod fiscal valid");
  await expect(intake.getByRole("button", { name: "Corectează câmpul cu ✗" })).toBeDisabled();
  await expect(page.getByTestId("mascot")).toHaveAttribute("data-mood", "worried");

  await intake.getByLabel("Total").fill("78");
  await expect(checks).toContainText("✓ Suma");
  await intake.getByRole("button", { name: "Trimite" }).click();
  await expect(page.getByText("9 deconturi")).toBeVisible();
  await expect(page.getByTestId("notice")).toContainText("78.00 lei");
});

test("același bon trimis de două ori e prins ca duplicat", async ({ page }) => {
  await fresh(page, "ioana");
  const intake = page.getByTestId("doc-intake");
  await intake.getByLabel("Textul documentului").fill("TAXI RAPID EXEMPLU SRL\nCUI 31845676\nNr. bon 0377\nCursă Victoriei - Pipera 46,50 lei\nTOTAL 46,50");
  await intake.getByRole("button", { name: "Citește documentul" }).click();
  await expect(page.getByTestId("doc-checks")).toContainText("✗ Duplicat: Același document a mai fost trimis o dată.");
});

test("trei roluri: managerul trimite înapoi cu motiv, aprobă, contabilul plătește, angajatul confirmă din SMS", async ({ page }) => {
  await fresh(page, "maria");
  const list = page.getByTestId("request-list");
  const steps = page.getByTestId("steps");
  await list.getByRole("button", { name: /Prânz cu clientul/ }).click();
  await expect(page.getByTestId("doc-checks")).toContainText("⚠ Plafon");
  await expect(steps.getByRole("button", { name: "Trimite înapoi" })).toBeDisabled();
  await steps.getByLabel("Motiv").fill("Scrie numele clientului");
  await steps.getByRole("button", { name: "Trimite înapoi" }).click();
  await expect(page.getByTestId("notice")).toContainText("SMS simulat către Andrei Munteanu");

  await page.getByTestId("role-switcher").selectOption("andrei");
  await steps.getByRole("button", { name: "Am corectat, retrimite" }).click();
  await page.getByTestId("role-switcher").selectOption("victor");
  await expect(steps).not.toContainText("Aprobă");
  await page.getByTestId("role-switcher").selectOption("maria");
  await steps.getByRole("button", { name: "Aprobă" }).click();
  await page.getByTestId("role-switcher").selectOption("irina");
  await steps.getByRole("button", { name: "Marchează plătit" }).click();

  const sms = page.getByTestId("outbox").locator("li").first();
  await expect(sms).toContainText("Ți-am virat 236 lei");
  const link = (await sms.textContent())!.match(/https?:\/\/\S+\/c\/[\w-]+/)![0];
  await page.goto(link);
  await page.getByRole("button", { name: /Am primit banii/ }).click();
  await expect(page.getByTestId("confirm-result")).toContainText("Încheiată: a confirmat că a primit banii");

  await page.goto("/harta?demo=1");
  await list.getByRole("button", { name: /Prânz cu clientul/ }).click();
  await expect(page.getByTestId("timeline")).toContainText("Maria Constantin a trimis înapoi — Scrie numele clientului");
  await expect(page.getByTestId("timeline")).toContainText("Andrei Munteanu a confirmat că a primit banii");
});

test("cronometrul: unde se blochează, cine așteaptă, reminder, cost din cifre introduse", async ({ page }) => {
  await fresh(page, "irina");
  await page.goto("/cronometru?demo=1");
  await expect(page.getByTestId("process-summary")).toContainText("în medie de la cerere la încheiere (2 încheiate)");
  await expect(page.getByTestId("process-summary")).toContainText("pasul unde se pierde cel mai mult timp");
  const waiting = page.getByTestId("process-waiting").locator("li");
  // aprobat acum 3 zile, încă neplătit: contabilul e cel așteptat
  await expect(waiting.first()).toContainText("Taxi aeroport");
  await expect(waiting.first()).toContainText("de 3 zile, nepreluată încă (contabil)");
  await waiting.first().getByRole("button", { name: "Trimite reminder" }).click();
  await expect(page.getByText("Reminder simulat către Irina Vasile.")).toBeVisible();
  await expect(page.getByTestId("process-waiting")).toContainText("la Bianca Stoica");

  await expect(page.getByTestId("process-cost")).toContainText("Nu le ghiciți");
  await page.getByLabel("deconturi pe lună").fill("120");
  await page.getByLabel(/minute de lucru manual/).fill("15");
  await page.getByLabel("cost orar (lei)").fill("60");
  await expect(page.getByTestId("process-cost")).toContainText("30 ore și 1.800 lei pe lună");
});

test("mascota: „aprobă decontul lui Andrei” cere confirmarea, apoi aprobă", async ({ page }) => {
  await fresh(page, "maria");
  await page.getByTestId("mascot").getByRole("button", { name: /Vorbește cu Bonița/ }).click();
  const box = page.getByRole("dialog", { name: /Vorbește cu Bonița/ });
  await box.getByLabel(/Mesaj pentru/).fill("aprobă decontul lui Andrei");
  await box.getByRole("button", { name: "↵" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirmă acțiunile" });
  await expect(confirm).toContainText("Aprobă: „Prânz cu clientul” (236 lei, Andrei Munteanu)");
  await confirm.getByRole("button", { name: "Aprobă" }).click();
  await expect(page.getByTestId("request-list").locator("li", { hasText: "Prânz cu clientul" })).toContainText("aprobat, de plătit");
});

test("cererea care stă de mult: mascota spune la cine; reminder din conversație", async ({ page }) => {
  await fresh(page, "irina");
  await page.getByTestId("request-list").getByRole("button", { name: /Taxi aeroport/ }).click();
  await expect(page.getByTestId("mascot")).toContainText("„Taxi aeroport” așteaptă de 3 zile și n-a preluat-o încă nimeni (contabil)");

  await page.goto("/cronometru?demo=1");
  await expect(page.getByTestId("process-waiting")).toContainText("Taxi aeroport");
  await page.getByTestId("mascot").getByRole("button", { name: /Vorbește cu Bonița/ }).click();
  const box = page.getByRole("dialog", { name: /Vorbește cu Bonița/ });
  await box.getByLabel(/Mesaj pentru/).fill("trimite un reminder la contabil");
  await box.getByRole("button", { name: "↵" }).click();
  const confirm = page.getByRole("dialog", { name: "Confirmă acțiunile" });
  await expect(confirm).toContainText("Trimite SMS către Contabil: „Taxi aeroport” așteaptă de 3 zile");
  await confirm.getByRole("button", { name: "Aprobă" }).click();
  await expect(page.getByText("Reminder simulat către Irina Vasile.")).toBeVisible();
});

test("fișa pentru tipărit: faptele din date, rezumatul propus și editabil", async ({ page }) => {
  await fresh(page, "ioana");
  await page.getByTestId("request-list").getByRole("button", { name: /Benzină deplasare/ }).click();
  await page.getByRole("link", { name: /Fișa pentru tipărit/ }).click();
  const rec = page.getByTestId("record");
  await expect(rec).toContainText("Valoare: 210 lei");
  await expect(rec).toContainText("Manager: Maria Constantin");
  await expect(rec).toContainText("✓ Cod fiscal");
  const summary = rec.getByLabel("Rezumat");
  await expect(summary).toHaveValue(/Ioana Petrescu a solicitat „Benzină deplasare Ploiești”/);
  await summary.fill("Deplasare aprobată pentru clientul din Ploiești.");
  await page.emulateMedia({ media: "print" });
  await expect(rec.getByRole("button", { name: /Tipărește/ })).toBeHidden();
  await expect(rec).toContainText("Ioana Petrescu a confirmat că a primit banii");
});
