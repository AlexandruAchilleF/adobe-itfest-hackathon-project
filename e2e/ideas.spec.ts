// Verifică piesele de care au nevoie ideile „editor fără mâini" și „mockup în lumea reală".
import { expect, test } from "@playwright/test";

// modulul e servit de Vite; îl importăm în pagină după URL
const POINTER_MODULE = "/src/modules/pointer/virtualPointer.ts";
type PointerModule = typeof import("../src/modules/pointer/virtualPointer");

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (err) => {
    throw err;
  });
});

test("cursorul virtual trage un obiect pe pânza Fabric și apasă butoane", async ({ page }) => {
  await page.goto("/canvas");
  const json = page.locator("textarea");
  await expect(json).toContainText('"id": "dot"');
  const before = JSON.parse(await json.inputValue()).elements.find((e: { id: string }) => e.id === "dot");

  // centrul cercului „dot" în coordonate de ecran
  const box = (await page.locator("canvas.upper-canvas").boundingBox())!;
  const scale = box.width / 1080;
  const start = { x: box.x + before.x * scale, y: box.y + before.y * scale };

  await page.evaluate(async ({ start, url }) => {
    const { VirtualPointer } = (await import(/* @vite-ignore */ url)) as PointerModule;
    const vp = new VirtualPointer();
    vp.move(start.x, start.y);
    vp.down();
    for (let i = 1; i <= 10; i++) vp.move(start.x - i * 12, start.y + i * 10);
    vp.up();
  }, { start, url: POINTER_MODULE });

  await expect
    .poll(async () => JSON.parse(await json.inputValue()).elements.find((e: { id: string }) => e.id === "dot").x)
    .toBeLessThan(before.x - 50);

  // același cursor apasă un buton HTML obișnuit
  const btn = (await page.getByRole("button", { name: "+ Cerc" }).boundingBox())!;
  await page.evaluate(async ({ x, y, url }) => {
    const { VirtualPointer } = (await import(/* @vite-ignore */ url)) as PointerModule;
    const vp = new VirtualPointer();
    vp.move(x, y);
    vp.click();
  }, { x: btn.x + btn.width / 2, y: btn.y + btn.height / 2, url: POINTER_MODULE });
  await expect.poll(async () => ((await json.inputValue()).match(/"type": "circle"/g) ?? []).length).toBe(2);
});

test("mockup: designul apare în perspectivă, auditul și critica AI (demo) funcționează", async ({ page }) => {
  await page.goto("/mockup?demo=1");
  const canvas = page.getByTestId("mockup");
  await expect(canvas).toBeVisible();
  // pixelul din centrul zonei de afiș nu mai e gri (zidul), ci culoarea designului
  await expect
    .poll(() =>
      canvas.evaluate((c: HTMLCanvasElement) => {
        const [r, g, b] = c.getContext("2d")!.getImageData(650, 400, 1, 1).data;
        return Math.abs(r - g) + Math.abs(g - b) > 10 || r < 60;
      }),
    )
    .toBe(true);
  await expect(page.getByText(/contrast \d+(\.\d+)?:1/).first()).toBeVisible();
  await page.getByRole("combobox").selectOption("achromatopsia");
  await expect
    .poll(() =>
      canvas.evaluate((c: HTMLCanvasElement) => {
        const [r, g, b] = c.getContext("2d")!.getImageData(800, 200, 1, 1).data;
        return r === g && g === b;
      }),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Părerea AI" }).click();
  await expect(page.getByText(/textul secundar se pierde/)).toBeVisible();
});
