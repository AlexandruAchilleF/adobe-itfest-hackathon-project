import { defineConfig } from "@playwright/test";

// Proba de producție: Chrome real, cu partiționarea storage-ului pornită. Playwright o oprește implicit,
// iar argumentul de mai jos îi înlocuiește lista, deci aici iframe-ul se comportă ca la un om.
// Nu intră în `npm run check`: folosește AI real și scrie în baza de date.
const baseURL = process.env.BASE_URL || "https://adobe-itfest-hackathon-project.vercel.app";
// Pe localhost, Chrome blochează altfel iframe-ul pus de un site public (Local Network Access).
const off = /localhost/.test(baseURL) ? "Translate,LocalNetworkAccessChecks" : "Translate";

export default defineConfig({
  testDir: "e2e",
  testMatch: ["productie.spec.ts", "integrare.spec.ts"],
  timeout: 180_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    launchOptions: { args: [`--disable-features=${off}`] },
  },
});
