import { defineConfig, devices } from "@playwright/test";

// Teste de fum: pornesc aplicația cu AI în mod mock și o cameră falsă,
// apoi verifică că fiecare pagină se încarcă și fluxurile principale merg.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npx vite --port 5199 --strictPort",
    url: "http://localhost:5199",
    reuseExistingServer: false,
    env: { AI_PROVIDER: "mock", GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "", VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" },
  },
});
