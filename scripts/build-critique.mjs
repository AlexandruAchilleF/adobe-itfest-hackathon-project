// Împachetează src/lib/critique.ts ca IIFE pentru extensie: chrome-extension/critique.js.
// Pachetul pune pe globalThis.SpireCritique funcțiile { critiquePage, summarySentence, modificationSuggestions }.
// Folosește rolldown (vine cu Vite 8), deci extensia rămâne fără build la încărcare.
//   node scripts/build-critique.mjs           scrie fișierul
//   node scripts/build-critique.mjs --stdout  doar îl afișează (pentru testul de prospețime)
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rolldown } from "rolldown";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(root, "src/lib/critique.ts");
const OUT = resolve(root, "chrome-extension/critique.js");
const HEADER = "// Generat din src/lib/critique.ts; nu-l edita de mână. Rulează: npm run ext:critique\n";
const ENTRY = "\0spire-critique-entry";

export async function buildCritiqueBundle() {
  const bundle = await rolldown({
    input: ENTRY,
    cwd: root,
    platform: "browser",
    logLevel: "silent",
    plugins: [
      {
        name: "spire-critique-entry",
        resolveId: (id) => (id === ENTRY ? id : null),
        load: (id) =>
          id === ENTRY
            ? `import { critiquePage, summarySentence, modificationSuggestions } from ${JSON.stringify(SOURCE)};\n` +
              `import { acceptAiCritiques, critiqueAiRequest, mergeAiCritiques } from ${JSON.stringify(resolve(root, "src/lib/critiqueAi.ts"))};\n` +
              `import { briefQuestions } from ${JSON.stringify(resolve(root, "src/lib/gaps.ts"))};\n` +
              "globalThis.SpireCritique = { critiquePage, summarySentence, modificationSuggestions, briefQuestions, acceptAiCritiques, critiqueAiRequest, mergeAiCritiques };\n"
            : null,
      },
    ],
  });
  try {
    const { output } = await bundle.generate({ format: "iife", comments: { legal: false, annotation: false, jsdoc: true } });
    const code = output[0].code;
    if (/^\s*(import|export)\s/m.test(code) || code.includes("import.meta")) {
      throw new Error("Pachetul criticii are importuri rămase.");
    }
    return HEADER + code;
  } finally {
    await bundle.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await buildCritiqueBundle();
  if (process.argv.includes("--stdout")) process.stdout.write(code);
  else {
    writeFileSync(OUT, code);
    console.log(`Scris ${OUT.slice(root.length + 1)} (${code.length} caractere)`);
  }
}
