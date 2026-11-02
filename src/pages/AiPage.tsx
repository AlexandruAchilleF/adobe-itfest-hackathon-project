import { useState } from "react";
import { z } from "zod";
import { Button, Card, Code, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { AiError, ask, askText } from "../lib/ai";

// Exemple de scheme. La hackathon scrieți schema pentru ideea voastră.
const EXAMPLES = {
  text: { label: "Text liber", schema: null, prompt: "Explică în 2 propoziții ce e un hackathon." },
  ideas: {
    label: "Listă de idei",
    prompt: "Dă-mi 3 idei de aplicații interactive pentru un hackathon Adobe cu tema „oraș inteligent”.",
    schema: z.object({
      ideas: z.array(
        z.object({
          title: z.string(),
          pitch: z.string().describe("o propoziție"),
          wow: z.string().describe("momentul wow din demo"),
          difficulty: z.enum(["ușor", "mediu", "greu"]),
        }),
      ),
    }),
  },
  image: {
    label: "Analiză imagine",
    prompt: "Descrie imaginea și propune o paletă de 4 culori inspirată din ea.",
    schema: z.object({
      description: z.string(),
      palette: z.array(z.object({ name: z.string(), hex: z.string() })),
      mood: z.string(),
    }),
  },
} as const;
type ExampleKey = keyof typeof EXAMPLES;

export function AiPage() {
  const [key, setKey] = useState<ExampleKey>("ideas");
  const [prompt, setPrompt] = useState<string>(EXAMPLES.ideas.prompt);
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<{ value: unknown; meta: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    const started = performance.now();
    try {
      const example = EXAMPLES[key];
      if (example.schema) {
        const { data, raw } = await ask({ prompt, schema: example.schema as z.ZodType<unknown>, files });
        setResult({ value: data, meta: `${raw.provider} · ${raw.model} · ${raw.ms} ms` });
      } else {
        const text = await askText({ prompt, files });
        setResult({ value: text, meta: `${Math.round(performance.now() - started)} ms` });
      }
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  const example = EXAMPLES[key];
  return (
    <div>
      <PageHeader
        title="AI structurat"
        description="Un singur apel: prompt (+ imagini sau PDF) → JSON validat cu Zod. Cheile stau pe server, în /api/ai."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Cerere">
          <div className="mb-3 flex flex-wrap gap-2">
            {(Object.keys(EXAMPLES) as ExampleKey[]).map((k) => (
              <Button
                key={k}
                variant={k === key ? "primary" : "secondary"}
                onClick={() => {
                  setKey(k);
                  setPrompt(EXAMPLES[k].prompt);
                }}
              >
                {EXAMPLES[k].label}
              </Button>
            ))}
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
          <label className="mt-3 block text-sm text-slate-400">
            Fișiere (imagini / PDF):
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
            />
          </label>
          <Button variant="primary" className="mt-4" onClick={run} disabled={busy || !prompt.trim()}>
            {busy && <Spinner />} Trimite
          </Button>
          {example.schema && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-slate-400">Schema JSON trimisă</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">
                {JSON.stringify(z.toJSONSchema(example.schema), null, 2)}
              </pre>
            </details>
          )}
        </Card>
        <Card title="Răspuns" actions={result && <span className="text-xs text-slate-500">{result.meta}</span>}>
          <ErrorNote error={error?.msg} hint={error?.hint} />
          {result ? (
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-sm text-slate-200">
              {typeof result.value === "string" ? result.value : JSON.stringify(result.value, null, 2)}
            </pre>
          ) : (
            !error && <p className="text-sm text-slate-500">Nimic încă.</p>
          )}
          <p className="mt-4 text-sm text-slate-400">
            În cod: <Code>const {"{ data }"} = await ask({"{ prompt, schema, files }"})</Code> — <Code>data</Code> are tipul schemei Zod.
          </p>
        </Card>
      </div>
    </div>
  );
}
