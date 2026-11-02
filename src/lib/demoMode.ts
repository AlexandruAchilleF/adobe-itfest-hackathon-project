// „Mod demo": toate apelurile AI folosesc răspunsuri simulate (provider=mock).
// Util când pică internetul sau se termină cota API chiar înainte de pitch.
// Se activează din UI sau cu ?demo=1 în URL.

const KEY = "hackathon:demo-mode";

export function isDemoMode(): boolean {
  try {
    const param = new URLSearchParams(location.search).get("demo");
    if (param === "1") localStorage.setItem(KEY, "1");
    if (param === "0") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocat: ignorăm */
  }
}
