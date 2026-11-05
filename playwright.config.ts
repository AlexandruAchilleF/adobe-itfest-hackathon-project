import { defineConfig, devices } from "@playwright/test";

// Teste de fum: pornesc aplicația cu AI în mod mock și o cameră falsă, câte un server pe scenariu
// (VITE_SCENARIO), apoi verifică fluxurile principale cap-coadă.
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
    { name: "vecini", testMatch: ["scenario.spec.ts", "recipes.spec.ts"], use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5199" } },
    { name: "deconturi", testMatch: ["birou.spec.ts"], use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:5198" } },
  ],
  webServer: [
    { command: "npx vite --port 5199 --strictPort", url: "http://localhost:5199", reuseExistingServer: false, env: { ...env, VITE_SCENARIO: "vecini" } },
    { command: "npx vite --port 5198 --strictPort", url: "http://localhost:5198", reuseExistingServer: false, env: { ...env, VITE_SCENARIO: "deconturi" } },
  ],
});
