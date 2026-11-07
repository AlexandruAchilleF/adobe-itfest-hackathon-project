import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const OUT_DIR = path.resolve("docs/screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function main() {
  const port = 5195;
  const url = `http://localhost:${port}/`;
  let serverProcess = spawn("npx", ["vite", "--port", String(port), "--strictPort"], {
    env: { ...process.env, VITE_SCENARIO: "spire", AI_PROVIDER: "mock" },
    stdio: "inherit",
  });

  try {
    await waitForServer(url);
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1340, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    const mockContainer = page.locator(".sticky.top-\\[max\\(6\\.5rem\\,calc\\(50vh-15rem\\)\\)\\]");

    // Mockup 1: Scan
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(1400);
    if (await mockContainer.count()) {
      await mockContainer.screenshot({ path: path.join(OUT_DIR, "mockup-1-scan.png") });
    }

    // Mockup 2: Ask
    await page.evaluate(() => window.scrollTo(0, 2300));
    await page.waitForTimeout(1400);
    if (await mockContainer.count()) {
      await mockContainer.screenshot({ path: path.join(OUT_DIR, "mockup-2-ask.png") });
    }

    // Mockup 3: Kit
    await page.evaluate(() => window.scrollTo(0, 3100));
    await page.waitForTimeout(1400);
    if (await mockContainer.count()) {
      await mockContainer.screenshot({ path: path.join(OUT_DIR, "mockup-3-kit.png") });
    }

    // Mockup 5: Export
    await page.evaluate(() => window.scrollTo(0, 3900));
    await page.waitForTimeout(1400);
    if (await mockContainer.count()) {
      await mockContainer.screenshot({ path: path.join(OUT_DIR, "mockup-5-export.png") });
    }

    // Mockup 4: Garda
    const gardaStage = page.locator("#garda .land-stage");
    if (await gardaStage.count()) {
      await gardaStage.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
      await gardaStage.screenshot({ path: path.join(OUT_DIR, "mockup-4-guard.png") });
    }

    // Before & After
    const beforeAfter = page.locator("section:has-text('Înainte și după') .land-stage");
    if (await beforeAfter.count()) {
      await beforeAfter.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      await beforeAfter.screenshot({ path: path.join(OUT_DIR, "mockup-before-after.png") });
    }

    await browser.close();
    console.log("Mockups 1-5 and before/after captured successfully.");
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
