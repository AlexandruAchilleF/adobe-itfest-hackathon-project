// Exemplu de asamblare: voce/text → AI → design editabil → export + QR.
// E un schelet generic. La hackathon, schimbați promptul, schema și UI-ul pentru ideea voastră.

import { useRef, useState } from "react";
import { Button, Card, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { QrPanel } from "../components/QrPanel";
import { AiError, ask } from "../lib/ai";
import { AiDesign, type Design, designSystemPrompt, exampleDesign } from "../lib/design";
import { downloadDataUrl, downloadText, shareDesign } from "../lib/share";
import { DesignCanvas, type DesignCanvasHandle } from "../modules/canvas/DesignCanvas";
import { useSpeechRecognition } from "../modules/voice/speech";

const FORMATS = {
  post: { label: "Postare 4:5", width: 1080, height: 1350 },
  story: { label: "Story 9:16", width: 1080, height: 1920 },
  poster: { label: "Afiș A4", width: 1240, height: 1754 },
  slide: { label: "Slide 16:9", width: 1920, height: 1080 },
} as const;
type FormatKey = keyof typeof FORMATS;

/** Design simulat pentru modul demo, construit din textul utilizatorului. */
function mockDesign(brief: string, width: number, height: number): AiDesign {
  const words = brief.split(/\s+/).filter(Boolean);
  const title = words.slice(0, 4).join(" ") || "Titlu";
  const rest = words.slice(4).join(" ");
  const m = width * 0.08;
  return {
    title,
    width,
    height,
    background: "#0b1020",
    elements: [
      { type: "rect", id: "card", x: m, y: m, width: width - 2 * m, height: height - 2 * m, fill: "#16213e", radius: 40 },
      { type: "circle", id: "sun", x: width - m * 2.5, y: m * 2.5, radius: width * 0.12, fill: "#f5a524" },
      { type: "text", id: "title", x: m * 1.6, y: height * 0.3, width: width - m * 3.2, text: title, fontSize: Math.round(width / 13), fill: "#f8fafc", fontWeight: "bold", align: "left" },
      { type: "line", id: "rule", x1: m * 1.6, y1: height * 0.62, x2: width * 0.45, y2: height * 0.62, stroke: "#f5a524", strokeWidth: 10 },
      { type: "text", id: "body", x: m * 1.6, y: height * 0.66, width: width - m * 3.2, text: rest.slice(0, 140), fontSize: Math.round(width / 28), fill: "#cbd5e1", fontWeight: "normal", align: "left" },
    ],
  };
}

export function PipelinePage() {
  const ref = useRef<DesignCanvasHandle>(null);
  const [brief, setBrief] = useState("Sâmbătă de la 10 strângem haine și cărți pentru adăpostul din cartier. Vino cu prietenii!");
  const [format, setFormat] = useState<FormatKey>("post");
  const [design, setDesign] = useState<Design>(exampleDesign);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const speech = useSpeechRecognition({ onFinal: (t) => setBrief(t) });

  async function generate(text = brief) {
    const { width, height } = FORMATS[format];
    setBusy(true);
    setError(null);
    setShareUrl(null);
    try {
      const { data } = await ask({
        system: designSystemPrompt(width, height),
        prompt: `Creează un design pentru: ${text}\nFormat: ${width}x${height}px.`,
        schema: AiDesign,
        mock: mockDesign(text, width, height),
      });
      setDesign({ ...data, width, height });
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      const png = await ref.current!.exportPNGBlob();
      setShareUrl((await shareDesign(ref.current!.getDesign(), png)).url);
    } catch (err) {
      setError({ msg: (err as Error).message });
    }
  }

  return (
    <div>
      <PageHeader
        title="Flux complet"
        description="Input haotic (voce sau text) → AI → rezultat editabil → luat acasă prin QR. Tiparul care a câștigat la hackathoanele Adobe."
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="1. Spune ce vrei">
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} className="h-32 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
            {speech.interim && <p className="mt-1 text-sm italic text-slate-400">{speech.interim}…</p>}
            <ErrorNote error={speech.error} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant={speech.listening ? "danger" : "secondary"} onClick={speech.listening ? speech.stop : speech.start} disabled={!speech.supported}>
                {speech.listening ? "■ Stop" : "🎤 Dictează"}
              </Button>
              <select value={format} onChange={(e) => setFormat(e.target.value as FormatKey)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm">
                {Object.entries(FORMATS).map(([k, f]) => (
                  <option key={k} value={k}>
                    {f.label}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={() => void generate()} disabled={busy || !brief.trim()}>
                {busy && <Spinner />} 2. Generează
              </Button>
            </div>
            <ErrorNote error={error?.msg} hint={error?.hint} />
          </Card>
          <Card title="3. Ia-l acasă">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadDataUrl(ref.current!.exportPNG(2), "design.png")}>PNG</Button>
              <Button onClick={() => downloadText(ref.current!.exportSVG(), "design.svg")}>SVG</Button>
              <Button variant="primary" onClick={share}>
                QR
              </Button>
            </div>
            {shareUrl && (
              <div className="mt-4">
                <QrPanel url={shareUrl} label="Scanează cu telefonul" />
              </div>
            )}
          </Card>
        </div>
        <div className="relative min-w-0">
          <DesignCanvas ref={ref} design={design} onChange={setDesign} className="max-w-[680px] overflow-hidden rounded-xl shadow-2xl" />
          {busy && <div className="absolute inset-0 grid max-w-[680px] place-items-center rounded-xl bg-slate-950/60 text-sm">Generez…</div>}
        </div>
      </div>
    </div>
  );
}
