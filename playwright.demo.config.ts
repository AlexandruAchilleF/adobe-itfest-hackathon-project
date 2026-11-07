import { defineConfig } from "@playwright/test";

// Filmarea video-ului demo (scripts/demo/). Nu intră în `npm run check`: e headed, cu Gemini real și scrie în Supabase.
// AI_PROVIDER vine din mediu sau din .env.local; `AI_PROVIDER=mock npm run demo:film` e rularea de probă.
export const PORT = 5196;

export default defineConfig({
  testDir: "scripts/demo",
  testMatch: "film.ts",
  outputDir: "test-results/demo-playwright",
  timeout: 600_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_SCENARIO: "spire", ...(process.env.AI_PROVIDER ? { AI_PROVIDER: process.env.AI_PROVIDER } : {}) },
  },
});
