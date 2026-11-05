import { Link } from "wouter";
import type { AppStatus } from "../App";
import { Card, Code, Pill } from "../components/ui";
import { useMascotPage } from "../modules/mascot/page";

// Teme probabile (estimare din cercetare, vezi docs/PLAN-12H.md) → rețeta de pornire.
const THEMES = [
  { theme: "Asistent AI / agenți / „vorbește cu aplicația”", odds: "~25%", recipe: "/assistant", name: "Asistent cu confirmare" },
  { theme: "Documente, PDF, „Rethink Reading”, educație", odds: "~20% + 5%", recipe: "/docs", name: "Documente → răspunsuri verificate" },
  { theme: "Civic: Smart City, resurse, comunitate", odds: "~20%", recipe: "/harta", name: "Harta cererilor" },
  { theme: "Accesibilitate, design incluziv, conținut creativ", odds: "~10% + 7%", recipe: "/design", name: "Input haotic → design editabil" },
];

const RECIPES = [
  { href: "/docs", title: "Documente → răspunsuri verificate", flow: "PDF → structură JSON (local) → întrebare → răspuns cu citate verificate în text → salt la pagină", who: "ex: firma mică ce pierde o zi citind un caiet de sarcini ca să afle dacă poate licita" },
  { href: "/design", title: "Input haotic → design editabil", flow: "text / voce / poză → design propus de AI → editare → audit de lizibilitate + reparare → QR", who: "ex: magazinul online care trebuie să respecte cerințele de accesibilitate din 2025" },
  { href: "/assistant", title: "Asistent cu confirmare", flow: "cerere în limbaj natural → acțiuni pe date → omul aprobă orice modificare", who: "ex: coordonatorul de voluntari care lucrează din telefon" },
  { href: "/harta", title: "Harta cererilor", flow: "nevoi pe hartă → adăugare în limbaj natural → potrivire ofertă ↔ nevoie cu scor", who: "ex: ONG-ul care nu știe cine poate ajuta, unde" },
];

export function HomePage({ status }: { status: AppStatus }) {
  const ai = status.ai;
  useMascotPage({
    title: "Start",
    tour: [
      { target: "home-themes", text: "Când se anunță tema, caută-o aici: îți spun din ce rețetă să pornești." },
      { target: "home-recipes", text: "Fiecare rețetă e un flux complet care merge deja. Schimbi doar domeniul: schema, datele, prompturile." },
      { target: "home-validation", text: "Primele 90 de minute: vorbește cu oameni. Business canvas-ul și sondajul îți dau cifrele pentru pitch." },
    ],
  });
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Un om, un input haotic, un rezultat editabil</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Așa arată proiectele care câștigă în 12 ore. Ordinea zilei: <b className="text-slate-200">validare</b> (primele 90 de minute, cu oameni reali) →{" "}
          <b className="text-slate-200">o singură rețetă</b>, adaptată temei → <b className="text-slate-200">pitch</b>. Planul complet e în <Code>docs/PLAN-12H.md</Code>.
        </p>
      </section>

      <Card title="Tema anunțată → de unde porniți" tour="home-themes">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Dacă tema e despre…</th>
                <th>Șanse (estimare)</th>
                <th>Porniți de la</th>
              </tr>
            </thead>
            <tbody>
              {THEMES.map((t) => (
                <tr key={t.theme} className="border-t border-slate-800">
                  <td className="py-2 pr-4">{t.theme}</td>
                  <td className="pr-4 text-slate-400">{t.odds}</td>
                  <td>
                    <Link href={t.recipe} className="text-accent hover:underline">
                      {t.name} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Altă temă? Alegeți rețeta al cărei flux seamănă cel mai mult și schimbați doar domeniul (schema, datele de seed, prompturile).</p>
      </Card>

      <section>
        <h2 className="text-lg font-semibold" data-tour="home-recipes">Rețete (fluxuri complete, gata de adaptat)</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {RECIPES.map((r) => (
            <Link key={r.href} href={r.href} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-accent/60">
              <h3 className="font-semibold group-hover:text-accent">{r.title} →</h3>
              <p className="mt-1 text-sm text-slate-300">{r.flow}</p>
              <p className="mt-2 text-xs text-slate-500">{r.who}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Înainte de cod: validarea" tour="home-validation">
          <ul className="space-y-1 text-sm text-slate-300">
            <li>
              <Link href="/business" className="text-accent">
                Business canvas
              </Link>{" "}
              — problemă, cine folosește vs. cine plătește, preț, întrebările grele ale juriului.
            </li>
            <li>
              <Link href="/survey" className="text-accent">
                Sondaj prin QR
              </Link>{" "}
              — cifre reale pentru pitch („11 din 14 au avut problema luna asta”).
            </li>
          </ul>
        </Card>
        <Card title="Stare configurare">
          <div className="flex flex-wrap gap-2">
            <Pill ok={ai ? ai.configured.gemini : null}>Gemini {ai?.configured.gemini ? `(${ai.models.gemini})` : "– fără cheie"}</Pill>
            <Pill ok={ai ? ai.configured.anthropic : null}>Claude {ai?.configured.anthropic ? `(${ai.models.anthropic})` : "– fără cheie"}</Pill>
            <Pill ok={status.supabase}>Supabase {status.supabase ? "conectat" : "– date locale"}</Pill>
            <Pill ok={status.adobePdf}>Adobe PDF {status.adobePdf ? "configurat" : "– viewer pdf.js"}</Pill>
            {status.demo && <Pill ok={null}>Mod demo activ</Pill>}
            {!ai && <Pill ok={false}>/api indisponibil — rulezi cu `npm run dev`?</Pill>}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Fără chei totul merge în mod demo. <Code>⏺ Rec</Code> din meniu înregistrează video-ul de rezervă.
          </p>
        </Card>
      </div>
    </div>
  );
}
