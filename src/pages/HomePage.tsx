// Ghidul template-ului (/start), pentru echipă, nu pentru juriu: cum treci de la brief la config,
// ce module opționale există și starea cheilor. Juriul vede ScenarioHome pe „/”.

import { Link } from "wouter";
import type { AppStatus } from "../App";
import { Card, Code, Pill } from "../components/ui";
import { validateScenario } from "../scenario/model";
import { scenario } from "../scenario/config";

// Cerințele tipice din briefurile ITFest × Adobe → piesa din template care le acoperă.
const BRIEF_MAP = [
  { need: "un proces între oameni: cine cere, cine aprobă, cine execută", piece: "scenario.roles + scenario.flow (pași, retur cu motiv, „n-a mers”)", href: "/harta" },
  { need: "documente, bonuri, facturi, formulare", piece: "scenario.documents → AI citește, codul verifică (sumă, CUI, dată, duplicate, plafoane)", href: "/harta" },
  { need: "eficiență, „cât durează”, optimizarea unui proces", piece: "/cronometru: timp pe pas, blocaje, reminder, cost din cifre spuse de oameni", href: "/cronometru" },
  { need: "un document final, raport, proces-verbal", piece: "/fisa/:id: fapte din date + rezumat editabil, tipărit ca PDF", href: "/harta" },
  { need: "Interactive Mapping, găsește în apropiere", piece: "/harta: cereri pe hartă + potrivire cu scor determinist", href: "/harta" },
  { need: "Gamification, puncte, recompense", piece: "scenario.points + ranks → /profil, /clasament", href: "/clasament" },
  { need: "raportare în timp real, la locația curentă", piece: "scenario.reports → /raport pe telefon, live pe hartă", href: "/raport" },
  { need: "încredere: a ajuns sau nu?", piece: "ciclul cererii, „nu am primit”, suspendare, SMS cu link /c/:id", href: "/harta" },
];

const MODULES = [
  { href: "/docs", title: "Documente → răspunsuri verificate", flow: "PDF → structură → întrebare → răspuns cu citate verificate în text" },
  { href: "/design", title: "Input haotic → design editabil", flow: "text / voce / poză → design → audit de lizibilitate și contrast → QR" },
  { href: "/assistant", title: "Asistent cu confirmare", flow: "cerere în limbaj natural → acțiuni pe cererile scenariului → omul aprobă" },
  { href: "/business", title: "Business canvas + sondaj", flow: "problemă, cine plătește, piață → sondaj prin QR → cifre pentru pitch" },
];

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

      <Card title="Brief → piesa din template">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Dacă brief-ul cere…</th>
                <th>Ce schimbați</th>
              </tr>
            </thead>
            <tbody>
              {BRIEF_MAP.map((t) => (
                <tr key={t.need} className="border-t border-slate-800">
                  <td className="py-2 pr-4">{t.need}</td>
                  <td>
                    <Link href={t.href} className="text-accent hover:underline">
                      {t.piece}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Altceva în brief? Scrieți-l în tabelul de cerințe din docs/BRIEF.md și căutați modulul opțional cel mai apropiat.</p>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">Module opționale</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {MODULES.map((r) => (
            <Link key={r.href} href={r.href} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-accent/60">
              <h3 className="font-semibold group-hover:text-accent">{r.title} →</h3>
              <p className="mt-1 text-sm text-slate-300">{r.flow}</p>
            </Link>
          ))}
        </div>
      </section>

      <Card title="Stare configurare">
        <div className="flex flex-wrap gap-2">
          <Pill ok={ai ? ai.configured.gemini : null}>Gemini {ai?.configured.gemini ? `(${ai.models.gemini})` : "– fără cheie"}</Pill>
          <Pill ok={ai ? ai.configured.anthropic : null}>Claude {ai?.configured.anthropic ? `(${ai.models.anthropic})` : "– fără cheie"}</Pill>
          <Pill ok={status.supabase}>Supabase {status.supabase ? "conectat" : "– date locale (doar tab-urile aceluiași browser)"}</Pill>
          <Pill ok={status.adobePdf}>Adobe PDF {status.adobePdf ? "configurat" : "– viewer pdf.js"}</Pill>
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
