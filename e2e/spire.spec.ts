import { existsSync, readFileSync, statSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { MAX_CRITIQUES } from "../src/lib/critique";
import { critiqueStops } from "../src/lib/landingCritique";

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

test("landing: critica și extensia apar după noapte, în ordinea poveștii", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#extensie")).toBeAttached();
  const order = await page.locator("main section").evaluateAll((all) => all.map((s) => s.querySelector("h1,h2")?.textContent ?? s.id));
  const at = (t: string) => order.findIndex((o) => o.includes(t));
  expect(at("Stilul altcuiva")).toBeLessThan(at("Ochi de uliu"));
  expect(at("Ochi de uliu")).toBeLessThan(at("Ce te inspiră"));
  expect(at("Ce te inspiră")).toBeLessThan(at("N-ai designer"));
  await expect(page.locator("#extensie")).toContainText("inSPIRE");
  await expect(page.locator("#critica")).toContainText("părere despre ierarhie și mesaj");
  await expect(page.locator("#critica")).toContainText(`cel mult ${MAX_CRITIQUES} observații`);
  await expect(page.locator("main")).not.toContainText("audit complet");
});

test("landing: linkul din meniu duce la extensie, iar butonul descarcă ZIP-ul", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Extensia" }).click();
  await expect(page).toHaveURL(/#extensie$/);
  await expect(page.locator("#extensie")).toBeInViewport();
  await expect(page.locator("#extensie")).toContainText("Developer mode");
  await expect(page.locator("main")).not.toContainText("Chrome Web Store");
  const download = page.waitForEvent("download");
  await page.locator("#extensie").getByRole("link", { name: "Descarcă extensia" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("spire-extensie.zip");
  const path = await file.path();
  expect(existsSync(path) && statSync(path).size).toBeGreaterThan(1000);
});

test("landing: macheta criticii afișează textele reale, unul după altul", async ({ page }) => {
  const stops = critiqueStops();
  await page.goto("/#critica");
  await page.locator("#critica .land-stage").scrollIntoViewIfNeeded();
  const balon = page.getByTestId("critica-balon");
  await expect(balon).toContainText(stops[0].critique.title, { timeout: 8000 });
  await expect(balon).toContainText("Important");
  await expect(balon).toContainText(stops[0].critique.fix);
  await expect(balon).toContainText(stops[1].critique.title, { timeout: 10000 });
  await expect(balon).toContainText("De îmbunătățit");
  await expect(page.locator("#critica .land-outline")).toHaveCount(1);
});

test("landing: cu mișcare redusă, critica arată toate observațiile, fără zbor", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const stop of critiqueStops()) await expect(page.locator("#critica").getByText(stop.critique.title)).toBeAttached();
  await expect(page.locator("#critica .land-outline")).toHaveCount(critiqueStops().length);
  await expect(page.getByTestId("critica-balon")).toHaveCount(0);
});

test("landing pe telefon: fără scroll orizontal, fără descărcare, cu link spre aplicație", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.locator("#extensie");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("Extensia se instalează pe calculator, în Chrome")).toBeVisible();
  await expect(section.getByRole("link", { name: "Descarcă extensia" })).toBeHidden();
  await expect(section.getByText("Developer mode")).toBeHidden();
  await page.locator("#critica .land-stage").scrollIntoViewIfNeeded();
  await expect(page.locator("#critica").getByTestId("critica-text").filter({ hasText: critiqueStops()[0].critique.title })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  await section.getByRole("link", { name: "Încearcă Spire în browser" }).click();
  await expect(page).toHaveURL(/\/nou$/);
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
async function reloadEmbedded(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    const iframe = document.querySelector('#spire') as HTMLIFrameElement;
    const ready = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || event.data?.type !== 'spire:brief-ready') return;
      window.removeEventListener('message', ready); resolve();
    };
    window.addEventListener('message', ready);
    iframe.contentWindow!.location.reload();
  }));
}

test("din extensie: panoul rămâne îngust, fără fundal, fără header și fără pași", async ({ page }) => {
  await page.goto("/nou?din=extensie");
  await expect(page.getByRole("button", { name: "Scanează pagina" })).toBeVisible();
  await expect(page.getByTestId("app-sky")).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveCount(0);
  await expect(page.getByTestId("pasii")).toHaveCount(0);
  await expect(page.getByTestId("reference-drop")).toHaveCount(0);
});

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

test("landing page-ul spune ce face Spire și duce la Acasă", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Spire îl face pe marca ta.");
  // verdictul gărzii, calculat de cod pe campania de exemplu (macheta din secțiunea „Garda”)
  await expect(page.locator("#garda").getByText(/^\d+ din \d+ verificări trec$/)).toBeAttached();
  // subsolul își păstrează textele, deși meniul aplicației s-a schimbat
  await expect(page.getByRole("navigation", { name: "Subsol" }).getByRole("link", { name: "Campanie nouă" })).toHaveAttribute("href", "/nou");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Încearcă acum" }).click();
  await expect(page).toHaveURL(/\/acasa$/);
});

test("meniul: Acasă, Campanii, Marca; „Campanie nouă” e butonul din dreapta", async ({ page }) => {
  await page.goto("/acasa");
  const nav = page.getByRole("navigation", { name: "Principal" });
  await expect(nav.getByRole("link")).toHaveText(["Acasă", "Campanii", "Marca"]);
  await expect(nav.getByRole("link", { name: "Acasă" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("banner").getByRole("link", { name: "Campanie nouă" }).click();
  await expect(page).toHaveURL(/\/nou$/);
  await expect(page.getByTestId("pasii").locator('[aria-current="step"]')).toContainText("Referință");
  await page.getByRole("banner").getByRole("link", { name: "Spire" }).click();
  await expect(page).toHaveURL(/\/acasa$/);
});

test("pe telefon: meniul se deschide, se închide și nu apare scroll orizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/acasa", "/campanii", "/nou", "/marca"]) {
    await page.goto(path);
    await expect(page.getByRole("banner").getByRole("link", { name: "Campanie nouă" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBe(0);
  }
  const menu = page.getByRole("button", { name: "Meniu" });
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await page.getByRole("banner").getByRole("link", { name: "Campanii" }).click();
  await expect(page).toHaveURL(/\/campanii$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("fundalul apare doar în ecranele de lucru", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (r) => requested.push(r.url()));
  for (const path of ["/", "/pitch", "/view", "/s", "/nou?din=extensie"]) {
    await page.goto(path);
    await expect(page.locator("#root > *").first()).toBeAttached();
    await expect(page.getByTestId("app-sky"), path).toHaveCount(0);
  }
  expect(requested.filter((u) => u.includes("workspace.webp"))).toEqual([]);
  for (const path of ["/acasa", "/campanii", "/nou", "/marca"]) {
    await page.goto(path);
    await expect(page.getByTestId("app-sky"), path).toHaveCount(1);
  }
});

test("pe fundal, textul secundar are contrast de cel puțin 4,5:1", async ({ page }) => {
  await page.goto("/acasa");
  const minContrast = await page.evaluate(async () => {
    const img = new Image();
    img.src = "/landing/workspace.webp";
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const luminance = (r: number, g: number, b: number) => {
      const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const muted = luminance(0x64, 0x69, 0x85);
    let min = 21;
    for (let i = 0; i < data.length; i += 4) min = Math.min(min, (luminance(data[i], data[i + 1], data[i + 2]) + 0.05) / (muted + 0.05));
    return min;
  });
  expect(minContrast).toBeGreaterThanOrEqual(4.5);
});

test("Acasă: duce la o campanie recentă și la Toate campaniile", async ({ page }) => {
  await page.goto("/acasa");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("De la ce pornim?");
  await expect(page.getByRole("heading", { name: "Gelateria Pip" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Culorile mărcii" }).getByRole("listitem")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "Editează" })).toHaveAttribute("href", "/marca");
  await page.getByRole("link", { name: /Weekend cu 2 cupe/ }).click();
  await expect(page).toHaveURL(/\/campanii\/.+/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Weekend cu 2 cupe");
  await page.goto("/acasa");
  await page.getByRole("link", { name: "Toate campaniile" }).click();
  await expect(page).toHaveURL(/\/campanii$/);
});

test("Acasă: arată cel mult 4 campanii, cele mai noi, în ordine", async ({ page }) => {
  await page.goto("/acasa");
  await expect(page.getByRole("link", { name: /Weekend cu 2 cupe/ })).toBeVisible();
  await page.evaluate(() => {
    const key = "hackathon:db:spire:campanii";
    const [base] = JSON.parse(localStorage.getItem(key)!);
    const rows = ["Unu", "Doi", "Trei", "Patru", "Cinci"].map((title, i) => ({ id: title, created_at: "", data: { ...base.data, title, createdAt: `2026-12-0${i + 1}T10:00:00.000Z` } }));
    localStorage.setItem(key, JSON.stringify(rows));
  });
  await page.reload();
  await expect(page.locator("main li a span.truncate.font-medium")).toHaveText(["Cinci", "Patru", "Trei", "Doi"]);
});

test("Acasă: exemplul și imaginea trasă ajung în fluxul din /nou", async ({ page }) => {
  await page.goto("/acasa");
  await page.getByRole("button", { name: "Folosește exemplul" }).click();
  await expect(page).toHaveURL(/\/nou$/);
  await expect(page.getByText("Ce am văzut")).toBeVisible();
  await expect(page.getByTestId("pasii").locator('[aria-current="step"]')).toContainText("Întrebări");

  await page.goto("/acasa");
  await page.setInputFiles("input[type=file]", REFERENCE);
  await expect(page).toHaveURL(/\/nou$/);
  await expect(page.getByText("Ce am văzut")).toBeVisible();

  await page.goto("/acasa");
  const drop = async (name: string, type: string) => {
    const transfer = await page.evaluateHandle(
      ([n, t]) => {
        const data = new DataTransfer();
        // un PNG de 1×1
        const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
        data.items.add(new File([bytes], n, { type: t }));
        return data;
      },
      [name, type],
    );
    await page.getByTestId("reference-drop").dispatchEvent("drop", { dataTransfer: transfer });
  };
  await drop("note.txt", "text/plain");
  await expect(page.getByRole("alert")).toContainText("nu e o imagine");
  await expect(page).toHaveURL(/\/acasa$/);
  await drop("ref.png", "image/png");
  await expect(page).toHaveURL(/\/nou$/);
  await expect(page.getByText("Ce am văzut")).toBeVisible();
});

test("Campanii: miniatura e designul, iar clicul duce la pagina de lucru", async ({ page }) => {
  await page.goto("/campanii");
  const card = page.getByRole("link", { name: /Weekend cu 2 cupe/ });
  await expect(card.locator("svg image")).toHaveAttribute("href", "/samples/spire/pip-in-stil.png");
  await expect(card.locator('img[src*="referinta"]')).toHaveCount(0);
  // totul trece: pe card nu apare nicio stare
  await expect(card).not.toContainText("revăzut");
  await expect(card).not.toContainText("verificat");
  await card.click();
  await expect(page).toHaveURL(/\/campanii\/.+/);
  await expect(page.getByRole("button", { name: "Descarcă PNG" })).toBeVisible();
});

test("Campanii: starea apare doar când cere ceva", async ({ page }) => {
  await page.goto("/campanii");
  await expect(page.getByRole("link", { name: /Weekend cu 2 cupe/ })).toBeVisible();
  await page.evaluate(() => {
    const key = "hackathon:db:spire:campanii";
    const rows = JSON.parse(localStorage.getItem(key)!);
    rows[0].data.checks[0].ok = false;
    rows[0].data.checks[1].ok = false;
    localStorage.setItem(key, JSON.stringify(rows));
  });
  await page.reload();
  await expect(page.getByRole("link", { name: /Weekend cu 2 cupe/ })).toContainText("2 verificări de revăzut");
});

test("Campanii: ștergerea are undo, iar lista goală are text pe Campanii și pe Acasă", async ({ page }) => {
  await page.goto("/campanii");
  await page.getByRole("button", { name: "Șterge Weekend cu 2 cupe" }).click();
  await expect(page.getByTestId("campanii-gol")).toBeVisible();
  await page.getByRole("button", { name: "Anulează" }).click();
  await expect(page.getByRole("link", { name: /Weekend cu 2 cupe/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Anulează" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("link", { name: /Weekend cu 2 cupe/ })).toBeVisible();

  await page.getByRole("button", { name: "Șterge Weekend cu 2 cupe" }).click();
  await expect(page.getByRole("button", { name: "Anulează" })).toBeVisible();
  // fără undo, bara dispare singură, iar ștergerea rămâne
  await expect(page.getByRole("button", { name: "Anulează" })).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByTestId("campanii-gol")).toBeVisible();
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Acasă" }).click();
  await expect(page.getByTestId("acasa-gol")).toBeVisible();
});

test("pagina de lucru: designul încape pe ecran, iar exportul e la mărime reală", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/campanii");
  await page.getByRole("link", { name: /Weekend cu 2 cupe/ }).click();
  const canvas = page.locator(".upper-canvas");
  await expect(canvas).toBeVisible();
  const fits = async () => {
    await page.waitForTimeout(300);
    const box = (await canvas.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(900);
    return box;
  };
  const size = async () => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descarcă PNG" }).click();
    const png = readFileSync(await (await download).path());
    return [png.readUInt32BE(16), png.readUInt32BE(20)];
  };
  const post = await fits();
  expect(post.height / post.width).toBeCloseTo(1350 / 1080, 1);
  expect(await size()).toEqual([1080, 1350]);
  await page.getByRole("button", { name: "Story" }).click();
  await expect(page.getByRole("button", { name: "Story" })).toHaveAttribute("aria-pressed", "true");
  const story = await fits();
  expect(story.height / story.width).toBeCloseTo(1920 / 1080, 1);
  expect(await size()).toEqual([1080, 1920]);
  await expect(page.getByRole("button", { name: "Descarcă PNG" })).toBeInViewport();
});

test("pagina de lucru: un strat tras pe pânza micșorată se mută cât trebuie în design", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/campanii");
  await page.getByRole("link", { name: /Weekend cu 2 cupe/ }).click();
  const canvas = page.locator(".upper-canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const box = (await canvas.boundingBox())!;
  const stored = () =>
    page.evaluate(() => {
      const id = location.pathname.split("/").pop();
      const rows = JSON.parse(localStorage.getItem("hackathon:db:spire:campanii")!);
      const design = rows.find((r: { id: string }) => r.id === id).data.designs.post;
      const cta = design.elements.find((e: { id: string }) => e.id === "cta-bg");
      return { x: cta.x as number, y: cta.y as number };
    });
  const before = await stored();
  const scale = box.width / 1080;
  // mijlocul butonului din design, în pixeli de ecran
  const x = box.x + (before.x + 40) * scale;
  const y = box.y + (before.y + 10) * scale;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 30, y + 20, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  const after = await stored();
  expect(after.x - before.x).toBeCloseTo(30 / scale, -1);
  expect(after.y - before.y).toBeCloseTo(20 / scale, -1);
});

test("pagina de lucru: garda e o linie care se deschide la cerere și singură când pică ceva", async ({ page }) => {
  await page.goto("/campanii");
  await page.getByRole("link", { name: /Weekend cu 2 cupe/ }).click();
  const guard = page.getByTestId("guard");
  await expect(guard.locator("summary")).toContainText(/\d+ din \d+ trec/);
  await expect(page.getByTestId("check-price")).toBeHidden();
  await guard.locator("summary").click();
  await expect(page.getByTestId("check-price")).toBeVisible();
  await guard.locator("summary").click();
  await expect(page.getByTestId("check-price")).toBeHidden();
  await page.getByLabel("Ofertă").fill("59 lei");
  await expect(page.getByTestId("check-price")).toBeVisible();
  await expect(page.getByTestId("check-price")).toContainText("nu trece");
});

test("marca: postarea de exemplu urmărește formularul, iar butoanele sunt în română", async ({ page }) => {
  await page.goto("/marca");
  const sample = page.getByTestId("marca-exemplu");
  await expect(sample).toBeVisible();
  await page.getByLabel("Culoarea Principală").fill("#112233");
  await expect(sample.locator('rect[fill="#112233"]')).toHaveCount(1);
  await page.getByLabel("Mențiuni obligatorii").fill("Doar azi, cât ține stocul.");
  await expect(sample).toContainText("Doar azi, cât ține stocul.");
  await page.getByLabel("Numele mărcii").fill("Altă marcă");
  await expect(sample).toContainText("Altă marcă");
  await expect(page.getByText("Alege un logo")).toBeVisible();
  await expect(page.getByText("Schimbă poza")).toBeVisible();
  // inputurile native sunt ascunse sub butoane
  for (const input of await page.locator("input[type=file]").all()) expect(await input.evaluate((e) => e.clientWidth)).toBeLessThanOrEqual(1);
  await page.setInputFiles('input[aria-label="Poza mascotei"]', REFERENCE);
  await expect(sample.locator("svg image")).toHaveAttribute("href", /^data:image\/png/);
});

test("brief-ul rămâne editabil după analiză și intră în generare și salvare", async ({ page }) => {
  const prompts: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/ai')) prompts.push(request.postData() ?? '');
  });
  const frame = await embedded(page);
  const brief = {source:{url:new URL(page.url()).origin+'/',title:'Cupe'},answers:{product:'Cană',audience:'Părinți',goal:'Comenzi',cta:'Comandă'}};
  await page.evaluate(brief => (document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief}, '*'), brief);
  await expect(frame.getByRole('heading',{name:'Brief-ul tău'})).toBeVisible();
  const audience = frame.getByRole('textbox', {name:'Cui te adresezi? Scrie tu'});
  await expect(audience).toHaveValue('Părinți');
  await audience.fill('Profesori');
  await page.evaluate(brief => (document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief}, '*'), brief);
  await expect(audience).toHaveValue('Profesori');
  await frame.getByRole('button',{name:'Folosește exemplul'}).click();
  await expect(frame.getByText('Ce am văzut')).toBeVisible();
  await expect(audience).toHaveValue('Profesori');
  await frame.getByRole('button',{name:'Fă campania',exact:true}).click();
  await expect(frame.getByRole('button',{name:'Salvează campania'})).toBeVisible();
  expect(prompts.some(prompt=>prompt.includes('Profesori') && prompt.includes('Comenzi'))).toBe(true);
  await frame.getByRole('button',{name:'Salvează campania'}).click();
  await expect(frame.getByRole('link',{name:'Deschide în Campanii'})).toBeVisible();
  const saved = await page.evaluate(()=>JSON.stringify(localStorage));
  expect(saved).toContain('Profesori');
  expect(saved).toContain('Comenzi');
});

test('panoul fără referrer primește brief doar de la originea gazdei declarate', async ({page}) => {
  const base=new URL(page.url()).origin;
  await page.setContent(`<iframe id="spire" referrerpolicy="no-referrer" src="${base}/nou?din=extensie&hostOrigin=${encodeURIComponent(base)}"></iframe>`);
  const frame=page.frameLocator('#spire');
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  const brief={source:{url:base+'/',title:'Fără referrer'},answers:{product:'Cană'}};
  await frame.locator('body').evaluate((_,brief)=>window.dispatchEvent(new MessageEvent('message',{source:window.parent,origin:'https://evil.test',data:{type:'spire:brief',brief}})),brief);
  await expect(frame.getByRole('heading',{name:'Brief-ul tău'})).toHaveCount(0);
  await page.evaluate(brief=>(document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief},'*'),brief);
  await expect(frame.getByRole('heading',{name:'Brief-ul tău'})).toBeVisible();
});

test('aplicația răspunde o singură dată cu analiza AI mock pentru ID duplicat', async ({page}) => {
  let calls=0;
  page.on('request',r=>{if(r.url().endsWith('/api/ai')) calls++;});
  await embedded(page);
  const input={page:{url:new URL(page.url()).origin,title:'Cupe',lang:'ro',metaDescription:'',jsonLdTypes:[],h1Count:1,imagesWithoutAlt:0},elements:[],viewport:{w:1280,h:720}};
  const result=await page.evaluate(input=>new Promise<{mode:string}>(resolve=>{
    window.addEventListener('message',e=>{if(e.data?.type==='spire:critique-result') resolve(e.data.result);});
    const win=(document.querySelector('#spire') as HTMLIFrameElement).contentWindow!;
    win.postMessage({type:'spire:critique-request',requestId:'single',input},'*');
    win.postMessage({type:'spire:critique-request',requestId:'single',input},'*');
  }),input);
  expect(result.mode).toBe('mock');expect(calls).toBe(1);
});

test('sidebar: constatări, căutări AI, brief păstrat și materiale la cerere', async ({page}) => {
  const frame=await embedded(page);
  const brief={source:{url:new URL(page.url()).origin+'/',title:'Magazin'},answers:{product:'Cană'},critique:{mode:'mock',items:[{id:'c1',title:'Produs neclar',observation:'Titlul nu numește produsul.',proposal:'Aș numi cana în titlu.',elementId:null}],searchOptimization:[{title:'Context pentru căutare',query:'cană ceramică',proposal:'Aș explica materialul produsului.',status:'needs-check',evidence:''}]}};
  const send=()=>page.evaluate(brief=>(document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief},'*'),brief);
  await send();
  const workspace=frame.getByTestId('campaign-workspace');
  await expect(workspace.getByText('Aș numi cana în titlu.')).toBeVisible();
  await expect(workspace.getByRole('heading',{name:'Vizibilitate în căutările cu AI'})).toBeVisible();
  await expect(workspace.getByText('De verificat',{exact:true})).toBeVisible();
  await expect(workspace.getByRole('button',{name:'Generează imagine'})).toBeDisabled();
  await workspace.getByLabel('Ce vrei să creăm?').fill('O imagine cu o cană pentru profesori');
  await workspace.getByRole('button',{name:'Păstrează brief-ul'}).click();
  await expect(workspace.getByRole('status')).toContainText('Păstrat în acest browser');
  await workspace.getByRole('button',{name:'Mai clarificăm'}).click();
  await expect(workspace.getByText('Întrebări simulate din contextul brief-ului')).toBeVisible();
  await expect(workspace.getByTestId('clarification-answer')).toHaveCount(1);
  await expect(workspace.getByRole('button',{name:'Răspunde',exact:true})).toBeDisabled();
  await expect(workspace.getByRole('button',{name:'Generează imagine'})).toBeDisabled();
  for(let i=0;i<3 && await workspace.getByTestId('clarification-answer').count();i++) {
    await workspace.getByTestId('clarification-answer').fill('Răspuns '+(i+1));
    await workspace.getByRole('button',{name:'Răspunde',exact:true}).click();
  }
  await expect(workspace.getByTestId('clarification-answer')).toHaveCount(0);
  await workspace.getByRole('button',{name:'Generează imagine'}).click();
  await expect(workspace.getByText('Rezultat simulat · fără generare de imagine')).toBeVisible();
  await workspace.getByRole('button',{name:'Pregătește video'}).click();
  await expect(workspace.getByText('Nu există încă un video de demo pentru acest site.')).toBeVisible();
  await reloadEmbedded(page);
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  await send();
  await expect(workspace.getByLabel('Ce vrei să creăm?')).toHaveValue('O imagine cu o cană pentru profesori');
  await expect(workspace.getByText('Rezultat simulat · fără generare de imagine')).toBeVisible();
  await reloadEmbedded(page);
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  brief.answers.product = 'Farfurie';
  await send();
  await expect(workspace.getByLabel('Produs sau serviciu',{exact:true})).toHaveValue('Farfurie');
  await expect(workspace.getByLabel('Ce vrei să creăm?')).toHaveValue('O imagine cu o cană pentru profesori');
});

test('sidebar: Marina Park redă clipul local cu proveniență de demo', async ({page}) => {
  const base = new URL(page.url()).origin;
  await page.setContent(`<iframe id="spire" src="${base}/nou?din=extensie&hostOrigin=${encodeURIComponent('https://www.marinapark.ro')}"></iframe>`);
  const frame = page.frameLocator('#spire');
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  await frame.locator('body').evaluate(() => window.dispatchEvent(new MessageEvent('message',{
    source: window.parent, origin: 'https://www.marinapark.ro', data: { type: 'spire:brief', brief: {
      source: {url:'https://www.marinapark.ro/',title:'Marina Park'}, answers: {product:'Cazare'},
    }},
  })));
  const workspace = frame.getByTestId('campaign-workspace');
  await workspace.getByLabel('Ce vrei să creăm?').fill('Un video de prezentare pentru Marina Park');
  await workspace.getByRole('button',{name:'Pregătește video'}).click();
  await expect(workspace.getByText('Video de demo · clip pregătit anterior')).toBeVisible();
  const video = workspace.locator('video');
  await expect(video).toHaveAttribute('src','/samples/spire/demo-videos/marina-park.mp4');
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).duration)).toBeGreaterThan(39);
  expect(await video.evaluate(el => (el as HTMLVideoElement).duration)).toBeLessThan(41);
});


test("scanarea completează brief-ul și păstrează ce a editat omul", async ({ page }) => {
  const frame = await embedded(page);
  const send = () => page.evaluate(() => {
    const element = { id: "h", tag: "h1", text: "Cazare pentru familii", box: { x: 0, y: 0, w: 1400, h: 500 }, styles: { color: "#000", background: "#fff", fontFamily: "Arial", fontSize: "60px", fontWeight: "700" }, inFirstScreen: true };
    const summary = { url: new URL(location.href).origin + "/", title: "Marina Park", headings: [element.text], ctas: [], colors: [], fonts: [] };
    (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:page", page: summary, elements: [element] }, "*");
  });
  await send();
  const product = frame.getByTestId("campaign-workspace").getByLabel("Produs sau serviciu");
  await expect(product).toHaveValue("Cazare pentru familii");
  await product.fill("Produs ales de om");
  await send();
  await expect(frame.getByText(/Am găsit 1/)).toBeVisible();
  await expect(product).toHaveValue("Produs ales de om");
});
