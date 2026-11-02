import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { apiRoutes } from "./server/vite-api-plugin.ts";

export default defineConfig(({ mode }) => {
  // Încarcă și variabilele fără prefix VITE_ (cheile AI) în process.env,
  // dar DOAR pentru codul de server din /api. Nu ajung în bundle-ul din browser.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), tailwindcss(), apiRoutes()],
    server: { host: true, port: 5173 },
    build: { chunkSizeWarningLimit: 1500 },
    test: {
      include: ["tests/**/*.test.ts"],
      environment: "node",
    },
  };
});
