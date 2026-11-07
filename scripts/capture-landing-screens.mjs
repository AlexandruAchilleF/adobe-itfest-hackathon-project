import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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
  let serverProcess = null;

  try {
    const res = await fetch(url).catch(() => null);
    if (!res || !res.ok) {
      console.log("Starting vite server on port", port);
      serverProcess = spawn("npx", ["vite", "--port", String(port), "--strictPort"], {
        env: {
          ...process.env,
          VITE_SCENARIO: "spire",
          AI_PROVIDER: "mock",
        },
        stdio: "inherit",
      });
      await waitForServer(url);
    }

    const browser = await chromium.launch();

    const widths = [390, 1340, 1680];
    const results = {};

    for (const w of widths) {
      const context = await browser.newContext({
        viewport: { width: w, height: 900 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      // Check horizontal overflow
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
        const clientW = doc.clientWidth;
        const hasOverflow = scrollW > clientW;

        // Find elements causing overflow if any
        let offenders = [];
        if (hasOverflow) {
          const all = document.querySelectorAll("*");
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > clientW + 1) {
              offenders.push({
                tag: el.tagName,
                class: el.className,
                right: rect.right,
                width: rect.width,
              });
            }
          }
        }
        return { scrollW, clientW, hasOverflow, offenders: offenders.slice(0, 5) };
      });

      console.log(`Viewport ${w}px: overflow = ${overflow.hasOverflow}`, overflow);
      results[w] = overflow;

      // Full page screenshot
      const fullPath = path.join(OUT_DIR, `landing-${w}px.png`);
      await page.screenshot({ path: fullPath, fullPage: true });

      // Sections screenshot (How it works & Garda & BeforeAfter)
      const cumEl = page.locator("#cum");
      if (await cumEl.count()) {
        await cumEl.screenshot({ path: path.join(OUT_DIR, `cum-${w}px.png`) });
      }
      const gardaEl = page.locator("#garda");
      if (await gardaEl.count()) {
        await gardaEl.screenshot({ path: path.join(OUT_DIR, `garda-${w}px.png`) });
      }

      await context.close();
    }

    await browser.close();

    console.log("Screenshots captured successfully in", OUT_DIR);
    console.log(JSON.stringify(results, null, 2));
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
