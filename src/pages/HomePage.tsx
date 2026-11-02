import { Link } from "wouter";
import type { AppStatus } from "../App";
import { Card, Code, Pill } from "../components/ui";

const MODULES = [
  { href: "/pipeline", title: "Flux complet", body: "Voce/text → AI → design editabil → QR. Exemplu de asamblare a modulelor.", file: "src/pages/PipelinePage.tsx" },
  { href: "/camera", title: "Cameră + gesturi", body: "MediaPipe în browser: mâini, ciupit, pumn, swipe, cursor cu degetul, desen în aer.", file: "src/modules/camera/" },
  { href: "/voice", title: "Voce", body: "Vorbire → text și text → vorbire în română, gratuit (Web Speech API).", file: "src/modules/voice/" },
  { href: "/ai", title: "AI structurat", body: "ask({ prompt, schema, files }) → JSON validat cu Zod. Gemini, Claude sau mock.", file: "src/lib/ai.ts" },
  { href: "/canvas", title: "Design editabil", body: "Pânză Fabric.js: editezi ce a generat AI-ul, exporți PNG/SVG, share prin QR.", file: "src/modules/canvas/" },
  { href: "/room", title: "Multiplayer", body: "Camere cu cod/QR, jucători live, stare comună. Supabase sau local între tab-uri.", file: "src/modules/rooms/" },
  { href: "/pdf", title: "Adobe PDF", body: "PDF Embed API + întrebări către AI despre document, cu salt la pagină.", file: "src/modules/adobe/" },
];

export function HomePage({ status }: { status: AppStatus }) {
  const ai = status.ai;
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Piese gata de asamblat</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Fiecare modul de mai jos merge singur. La hackathon, alegeți ideea după temă și combinați 2–3 module.
          Logica specifică ideii o scrieți acolo.
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
          Totul merge și fără chei: AI-ul cade pe <Code>mock</Code>, multiplayer-ul pe tab-uri locale. Cheile se pun în <Code>.env</Code> (vezi{" "}
          <Code>.env.example</Code>).
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-accent/60">
            <h2 className="font-semibold group-hover:text-accent">{m.title} →</h2>
            <p className="mt-1 text-sm text-slate-400">{m.body}</p>
            <p className="mt-3 font-mono text-xs text-slate-500">{m.file}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
