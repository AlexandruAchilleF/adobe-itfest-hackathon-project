// Pagina echipei (/start), nu pentru juriu: verificarea scenariului și starea cheilor.

import type { AppStatus } from "../App";
import { Card, Code, Pill } from "../components/ui";
import { validateScenario } from "../scenario/model";
import { scenario } from "../scenario/config";

export function HomePage({ status }: { status: AppStatus }) {
  const ai = status.ai;
  const problems = validateScenario(scenario);
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Ghidul template-ului</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Pagina asta e pentru echipă. Brief-ul se mută în <Code>src/scenario/scenarios/&lt;nume&gt;.ts</Code>, activat în <Code>src/scenario/config.ts</Code>. Pașii sunt în <Code>docs/BRIEF.md</Code>, iar cronometrarea pe brief-ul din 2023 în <Code>docs/REPETITIE-2023.md</Code>.
        </p>
      </section>

      <Card title={`Scenariul activ: ${scenario.app.name} (${scenario.id})`}>
        <dl className="mb-3 space-y-1 text-sm" data-testid="scenario-business">
          <dt className="text-xs uppercase text-slate-500">Problema</dt>
          <dd>{scenario.business.problem}</dd>
          <dt className="text-xs uppercase text-slate-500">Cine plătește</dt>
          <dd>{scenario.business.payer}</dd>
          <dt className="text-xs uppercase text-slate-500">Dovezi de la oameni reali</dt>
          <dd className={scenario.business.evidence.length ? "" : "text-amber-200"}>{scenario.business.evidence.length ? scenario.business.evidence.join(" · ") : "Niciuna încă: cifrele de mai sus sunt ipoteze. Faceți interviurile."}</dd>
        </dl>
        {problems.length ? (
          <ul className="space-y-1 text-sm text-rose-300" data-testid="scenario-problems">
            {problems.map((p) => (
              <li key={p}>✗ {p}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-emerald-300">✓ Config-ul trece verificările (roluri, categorii, ranguri, seed).</p>
        )}
      </Card>

      <Card title="Stare configurare">
        <div className="flex flex-wrap gap-2">
          <Pill ok={ai ? ai.configured.gemini : null}>Gemini {ai?.configured.gemini ? `(${ai.models.gemini})` : "– fără cheie"}</Pill>
          <Pill ok={ai ? ai.configured.anthropic : null}>Claude {ai?.configured.anthropic ? `(${ai.models.anthropic})` : "– fără cheie"}</Pill>
          <Pill ok={status.supabase}>Supabase {status.supabase ? "conectat" : "– date locale (doar tab-urile aceluiași browser)"}</Pill>
          {status.demo && <Pill ok={null}>Mod demo activ</Pill>}
          {!ai && <Pill ok={false}>/api indisponibil — rulezi cu `npm run dev`?</Pill>}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Fără chei totul merge în mod demo. Telefoane diferite se văd între ele doar cu Supabase. <Code>⏺ Rec</Code> din meniu înregistrează video-ul de rezervă.
        </p>
      </Card>
    </div>
  );
}
