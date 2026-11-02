import { useState } from "react";
import { Button, Card, Code, ErrorNote, PageHeader } from "../components/ui";
import { speak, stopSpeaking, useSpeechRecognition } from "../modules/voice/speech";

const LANGS = [
  { code: "ro-RO", label: "Română" },
  { code: "en-US", label: "English" },
  { code: "hu-HU", label: "Magyar" },
];

export function VoicePage() {
  const [lang, setLang] = useState("ro-RO");
  const [log, setLog] = useState<string[]>([]);
  const speech = useSpeechRecognition({ lang, onFinal: (t) => setLog((l) => [t, ...l].slice(0, 8)) });
  const [toSay, setToSay] = useState("Salut! Sunt aplicația voastră de hackathon.");

  return (
    <div>
      <PageHeader title="Voce" description="Vorbire → text și text → vorbire, direct în browser. Merge cel mai bine în Chrome." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Ascultă">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm">
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <Button variant={speech.listening ? "danger" : "primary"} onClick={speech.listening ? speech.stop : speech.start} disabled={!speech.supported}>
              {speech.listening ? "■ Stop" : "🎤 Vorbește"}
            </Button>
            <Button variant="ghost" onClick={speech.reset}>
              Golește
            </Button>
          </div>
          {!speech.supported && <ErrorNote error="Browserul nu suportă recunoaștere vocală. Folosește un câmp text ca rezervă." />}
          <ErrorNote error={speech.error} />
          <textarea
            value={speech.transcript + (speech.interim ? ` ${speech.interim}` : "")}
            onChange={(e) => speech.setTranscript(e.target.value)}
            placeholder="Transcrierea apare aici (o poți și edita / scrie direct)…"
            className="h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm"
          />
          <h3 className="mt-4 text-sm font-medium text-slate-400">Fraze finale (onFinal)</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {log.map((l, i) => (
              <li key={i} className="rounded-lg bg-slate-800/60 px-3 py-1.5">
                {l}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Vorbește">
          <textarea value={toSay} onChange={(e) => setToSay(e.target.value)} className="h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={() => void speak(toSay, { lang })}>
              🔊 Citește
            </Button>
            <Button variant="ghost" onClick={stopSpeaking}>
              Stop
            </Button>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            În cod: <Code>useSpeechRecognition({"{ lang, onFinal }"})</Code> și <Code>await speak(text)</Code>. Vocile disponibile depind de sistemul de operare;
            pentru voci naturale puteți adăuga ElevenLabs sau Gemini Live pe server.
          </p>
        </Card>
      </div>
    </div>
  );
}
