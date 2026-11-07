// npm run ext:zip: pachetul extensiei pentru descărcare, public/spire-extensie.zip.
// Lucrează pe o copie: doar acolo APP_URL devine adresa publică, iar README-ul și testele rămân pe dinafară.
// Datele fișierelor sunt fixe, ca aceeași sursă să dea același ZIP.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_URL = "https://spire-coral.vercel.app";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public", "spire-extensie.zip");
const SKIP = /(^readme(\.|$)|\.md$|\.(test|spec)\.|^tests?$|^__tests__$)/i;
const STAMP = new Date(2026, 10, 7, 12, 0, 0);

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));

const temp = mkdtempSync(join(tmpdir(), "spire-zip-"));
try {
  cpSync(join(root, "chrome-extension"), temp, { recursive: true, filter: (src) => !SKIP.test(src.split(/[\\/]/).pop()) });

  const configPath = join(temp, "config.js");
  const config = readFileSync(configPath, "utf8");
  const rewritten = config.replace(/var APP_URL = "[^"]*";/, `var APP_URL = ${JSON.stringify(APP_URL)};`);
  if (rewritten === config) throw new Error("Nu găsesc APP_URL în config.js (s-a schimbat forma?)");
  writeFileSync(configPath, rewritten);

  const files = walk(temp).map((f) => relative(temp, f)).sort();
  for (const f of files) utimesSync(join(temp, f), STAMP, STAMP);
  rmSync(output, { force: true });
  execFileSync("zip", ["-X", "-q", "-D", output, ...files], { cwd: temp });
  console.log(`public/spire-extensie.zip: ${files.length} fișiere, ${statSync(output).size} octeți, APP_URL = ${APP_URL}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
