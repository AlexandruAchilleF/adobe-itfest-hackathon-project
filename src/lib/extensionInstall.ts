// Cum se instalează extensia de pe landing page. Un singur loc de schimbat când apare în magazin.
// Gol: butonul descarcă ZIP-ul din public/. Completat: butonul duce la pagina din Chrome Web Store.
export const CHROME_STORE_URL = "";

export const EXTENSION_ZIP = "/spire-extensie.zip";
export const UNPACKED_HINT = "Dezarhivează, apoi în chrome://extensions pornește Developer mode și alege Load unpacked.";

export type InstallAction = { kind: "download"; label: string; href: string; hint: string } | { kind: "store"; label: string; href: string };

export function installAction(storeUrl: string = CHROME_STORE_URL): InstallAction {
  const url = storeUrl.trim();
  if (url) return { kind: "store", label: "Adaugă în Chrome", href: url };
  return { kind: "download", label: "Descarcă extensia", href: EXTENSION_ZIP, hint: UNPACKED_HINT };
}
