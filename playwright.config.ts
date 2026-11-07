import { defineConfig, devices } from "@playwright/test";

// Teste de fum: pornesc aplicația cu AI în mod mock, apoi verifică fluxul cap-coadă.
const env = { AI_PROVIDER: "mock", GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "", VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" };

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [
    { name: "spire", testMatch: ["spire.spec.ts"], use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5195" } },
    // Extensia Spire: testul își pornește singur Chromium cu extensia (launchPersistentContext)
    // și servește fixture-ul prin context.route, deci nu are nevoie de server propriu.
    { name: "extension", testMatch: ["extension.spec.ts"] },
  ],
  webServer: [
    { command: "npx vite --port 5195 --strictPort", url: "http://localhost:5195", reuseExistingServer: false, env: { ...env, VITE_SCENARIO: "spire" } },
  ],
});
