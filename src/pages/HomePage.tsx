import { Link } from "wouter";
import type { AppStatus } from "../App";
import { Card, Code, Pill } from "../components/ui";

const GROUPS = [
  {
    title: "1. Problema și cine plătește",
    note: "Începeți de aici. Juriul punctează valoarea pentru utilizator înaintea tehnologiei.",
    modules: [
      { href: "/business", title: "Business canvas", body: "AI-ul transformă ideea în problemă, utilizator vs. cumpărător, preț, piață, adopție și întrebările grele ale juriului.", file: "src/lib/business.ts" },
      { href: "/survey", title: "Sondaj de validare live", body: "Participanții și mentorii răspund de pe telefon. Rezultă fraze de pitch: „18 din 25 (72%) au spus Da”.", file: "src/lib/survey.ts" },
    ],
  },
  {
    title: "2. Input neobișnuit",
    note: "Juriul devine utilizator în 10 secunde.",
    modules: [
      { href: "/camera", title: "Mâini + gesturi", body: "Ciupit, pumn, swipe, desen în aer, iar AI-ul ghicește desenul. „Mouse cu mâna”: ciupești și tragi obiecte.", file: "src/modules/camera/" },
      { href: "/body", title: "Față + corp", body: "Zâmbet, clipit, „mouse cu capul” care controlează orice pagină (click prin menținere, drag cu wink) și postura corpului.", file: "src/modules/camera/useFace.ts" },
      { href: "/voice", title: "Voce", body: "Vorbire → text și text → vorbire în română, gratuit.", file: "src/modules/voice/" },
      { href: "/sound", title: "Sunet + hardware", body: "Bătăi din palme, nota cântată, volum, plus o punte Web Serial către Arduino/ESP32.", file: "src/modules/audio/" },
      { href: "/screen", title: "Telefonul ca controller", body: "QR, iar telefonul devine joystick, volan (giroscop), pad de desen, buton de vot sau tastatură.", file: "src/modules/controller/" },
    ],
  },
  {
    title: "3. AI ca mecanism, nu chat",
    note: "",
    modules: [
      { href: "/ai", title: "AI structurat", body: "ask({ prompt, schema, files }) → JSON validat. Gemini, Claude sau mock.", file: "src/lib/ai.ts" },
      { href: "/agent", title: "Comenzi vocale → acțiuni", body: "Definiți acțiunile aplicației, utilizatorul vorbește, iar AI-ul le alege și le execută.", file: "src/lib/agent.ts" },
    ],
  },
  {
    title: "4. Rezultat editabil, luat acasă",
    note: "Tiparul care a câștigat la hackathoanele Adobe.",
    modules: [
      { href: "/canvas", title: "Design editabil", body: "Pânză Fabric.js cu undo/redo, export PNG/SVG/JSON și QR.", file: "src/modules/canvas/" },
      { href: "/mockup", title: "Mockup în lumea reală", body: "Designul pus în perspectivă pe o poză reală, simulare de distanță și daltonism, audit WCAG și de lizibilitate.", file: "src/lib/perspective.ts" },
      { href: "/pipeline", title: "Flux complet", body: "Voce → AI → design editabil → QR. Exemplu de asamblare.", file: "src/pages/PipelinePage.tsx" },
      { href: "/pdf", title: "Adobe PDF", body: "PDF Embed API + AI care răspunde cu pagina sursă.", file: "src/modules/adobe/" },
      { href: "/room", title: "Multiplayer", body: "Camere cu cod/QR, jucători live, stare comună.", file: "src/modules/rooms/" },
    ],
  },
];

export function HomePage({ status }: { status: AppStatus }) {
  const ai = status.ai;
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Piese gata de asamblat</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Ordinea contează: problemă și cumpărător → input surprinzător → AI care face ceva vizibil → rezultat editabil. Alegeți câte o piesă din fiecare rând.
        </p>
      </section>

      <Card title="Stare configurare">
        <div className="flex flex-wrap gap-2">
          <Pill ok={ai ? ai.configured.gemini : null}>Gemini {ai?.configured.gemini ? `(${ai.models.gemini})` : "– fără cheie"}</Pill>
          <Pill ok={ai ? ai.configured.anthropic : null}>Claude {ai?.configured.anthropic ? `(${ai.models.anthropic})` : "– fără cheie"}</Pill>
          <Pill ok={status.supabase}>Supabase {status.supabase ? "conectat" : "– fallback local"}</Pill>
          <Pill ok={status.adobePdf}>Adobe PDF {status.adobePdf ? "configurat" : "– fără Client ID"}</Pill>
          {status.demo && <Pill ok={null}>Mod demo activ</Pill>}
          {!ai && <Pill ok={false}>/api indisponibil — rulezi cu `npm run dev`?</Pill>}
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Totul merge și fără chei: AI-ul cade pe <Code>mock</Code>, multiplayer-ul pe tab-uri locale. Pentru juriu: <Code>?kiosk=1</Code> ascunde meniul,
          afișează un ecran de start și numără câți oameni au încercat. Butonul <Code>⏺ Rec</Code> înregistrează video-ul de rezervă.
        </p>
      </Card>

      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="text-lg font-semibold">{g.title}</h2>
          {g.note && <p className="text-sm text-slate-500">{g.note}</p>}
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.modules.map((m) => (
              <Link key={m.href} href={m.href} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-accent/60">
                <h3 className="font-semibold group-hover:text-accent">{m.title} →</h3>
                <p className="mt-1 text-sm text-slate-400">{m.body}</p>
                <p className="mt-3 font-mono text-xs text-slate-500">{m.file}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
