// Rețeta DESIGN EDITABIL: input haotic (text, mesaj vocal, poză a unui afiș vechi / schiță) →
// AI propune un design → omul îl editează → audit determinist (contrast WCAG, lizibilitate
// de la distanță) + reparare automată → export PNG/SVG sau QR pe telefon.
// Tiparul câștigătorilor Adobe Express (brief → design editabil).

import { useRef, useState } from "react";
import { Button, Card, ErrorNote, PageHeader, Spinner } from "../components/ui";
import { QrPanel } from "../components/QrPanel";
import { auditDesign, autoFixDesign } from "../lib/accessibility";
import { AiError, ask } from "../lib/ai";
import { AiDesign, type Design, designSystemPrompt, exampleDesign } from "../lib/design";
import { downloadDataUrl, downloadText, shareDesign } from "../lib/share";
import { useCamera } from "../modules/camera/useCamera";
import { DesignCanvas, type DesignCanvasHandle } from "../modules/canvas/DesignCanvas";
import { useSpeechRecognition } from "../modules/voice/speech";

const FORMATS = {
  a4: { label: "Afiș A4", width: 1240, height: 1754, cm: 21 },
  post: { label: "Postare 4:5", width: 1080, height: 1350, cm: 30 },
  story: { label: "Story 9:16", width: 1080, height: 1920, cm: 30 },
  slide: { label: "Slide 16:9", width: 1920, height: 1080, cm: 100 },
} as const;
type FormatKey = keyof typeof FORMATS;

/** Design simulat (mod demo), construit din textul utilizatorului. */
function mockDesign(brief: string, width: number, height: number): AiDesign {
  const words = brief.split(/\s+/).filter(Boolean);
  const m = width * 0.08;
  return {
    title: words.slice(0, 4).join(" ") || "Titlu",
    width,
    height,
    background: "#0b1020",
    elements: [
      { type: "rect", id: "card", x: m, y: m, width: width - 2 * m, height: height - 2 * m, fill: "#16213e", radius: 40 },
      { type: "circle", id: "accent", x: width - m * 2.5, y: m * 2.5, radius: width * 0.1, fill: "#f5a524" },
      { type: "text", id: "title", x: m * 1.6, y: height * 0.3, width: width - m * 3.2, text: words.slice(0, 4).join(" ") || "Titlu", fontSize: Math.round(width / 13), fill: "#f8fafc", fontWeight: "bold", align: "left" },
      { type: "line", id: "rule", x1: m * 1.6, y1: height * 0.6, x2: width * 0.45, y2: height * 0.6, stroke: "#f5a524", strokeWidth: 10 },
      // intenționat mic și cu contrast slab, ca auditul să aibă ce repara în demo
      { type: "text", id: "body", x: m * 1.6, y: height * 0.64, width: width - m * 3.2, text: words.slice(4).join(" ").slice(0, 160) || "Detalii", fontSize: Math.round(width / 40), fill: "#64748b", fontWeight: "normal", align: "left" },
    ],
  };
}

export function DesignPage() {
  const ref = useRef<DesignCanvasHandle>(null);
  const [brief, setBrief] = useState("Apa caldă se oprește joi între 9 și 17 pentru reparații la scara B. Ne cerem scuze, Asociația de proprietari.");
  const [format, setFormat] = useState<FormatKey>("a4");
  const [photo, setPhoto] = useState<string | null>(null);
  const [design, setDesign] = useState<Design>(exampleDesign);
  const [distance, setDistance] = useState(2);
  const [changes, setChanges] = useState<string[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ msg: string; hint?: string } | null>(null);
  const speech = useSpeechRecognition({ onFinal: (t) => setBrief(t) });
  const cam = useCamera({ autoStart: false, facingMode: "environment" });

  const f = FORMATS[format];
  const audit = auditDesign(design, f.cm);
  const problems = audit.filter((a) => a.level === "fail" || a.readableFromM < distance).length;

  async function generate() {
    setBusy(true);
    setError(null);
    setShareUrl(null);
    setChanges([]);
    try {
      const { data } = await ask({
        system: designSystemPrompt(f.width, f.height),
        prompt: `Creează un design pentru: ${brief}\nFormat: ${f.label}, ${f.width}x${f.height}px.${photo ? "\nImaginea atașată e un afiș/schiță existentă: păstrează informația, îmbunătățește designul." : ""}`,
        schema: AiDesign,
        files: photo ? [photo] : undefined,
        mock: mockDesign(brief, f.width, f.height),
      });
      setDesign({ ...data, width: f.width, height: f.height });
    } catch (err) {
      setError({ msg: (err as Error).message, hint: err instanceof AiError ? err.hint : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function fix() {
    const result = autoFixDesign(ref.current?.getDesign() ?? design, { physicalWidthCm: f.cm, distanceM: distance });
    setChanges(result.changes.length ? result.changes : ["Nimic de reparat: toate textele trec auditul."]);
    await ref.current?.setDesign(result.design);
  }

  return (
    <div>
      <PageHeader
        title="Input haotic → design editabil"
        description="Text, mesaj vocal sau poza unui afiș vechi → AI propune → omul editează → auditul verifică dacă se citește → export sau QR. Rețeta pentru teme creative, de comunicare sau accesibilitate."
      />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="1. Ce trebuie comunicat">
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} className="h-28 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
            {speech.interim && <p className="mt-1 text-sm italic text-slate-400">{speech.interim}…</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button onClick={speech.listening ? speech.stop : speech.start} disabled={!speech.supported}>
                {speech.listening ? "■ Stop" : "🎤 Dictează"}
              </Button>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
                🖼️ Poză
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const r = new FileReader();
                    r.onload = () => setPhoto(String(r.result));
                    r.readAsDataURL(file);
                  }}
                />
              </label>
              {cam.status === "ready" ? (
                <Button
                  onClick={() => {
                    setPhoto(cam.capture(1024));
                    cam.stop();
                  }}
                >
                  📸 Capturează
                </Button>
              ) : (
                <Button onClick={() => void cam.start()}>📷 Cameră</Button>
              )}
            </div>
            <video ref={cam.videoRef} className={cam.status === "ready" ? "mt-2 max-h-40 rounded-xl" : "hidden"} playsInline muted />
            {photo && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <img src={photo} alt="Poza atașată" className="h-12 rounded" /> atașată ·{" "}
                <button className="underline" onClick={() => setPhoto(null)}>
                  scoate
                </button>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <select value={format} onChange={(e) => setFormat(e.target.value as FormatKey)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm" aria-label="Format">
                {Object.entries(FORMATS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <Button variant="primary" onClick={generate} disabled={busy || !brief.trim()}>
                {busy && <Spinner />} 2. Generează
              </Button>
            </div>
            <ErrorNote error={error?.msg} hint={error?.hint} />
          </Card>
          <Card title={`3. Se citește? ${problems ? `— ${problems} probleme` : "— ✓"}`}>
            <label className="block text-sm">
              Privit de la <b>{distance} m</b>
              <input type="range" min={0.5} max={10} step={0.5} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="w-full" />
            </label>
            <ul className="mt-2 space-y-1 text-sm" data-testid="audit">
              {audit.map((a) => (
                <li key={a.id} className={a.level === "fail" || a.readableFromM < distance ? "text-rose-300" : "text-emerald-300"}>
                  „{a.text.slice(0, 28)}…” · contrast {a.contrast}:1 {a.level === "fail" ? "✗" : a.level} · până la {a.readableFromM} m
                </li>
              ))}
            </ul>
            <Button className="mt-2" onClick={fix}>
              🔧 Repară automat
            </Button>
            {changes.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-slate-300">
                {changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="4. Ia-l acasă">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadDataUrl(ref.current!.exportPNG(2), "design.png")}>PNG</Button>
              <Button onClick={() => downloadText(ref.current!.exportSVG(), "design.svg")}>SVG</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    setShareUrl((await shareDesign(ref.current!.getDesign(), await ref.current!.exportPNGBlob())).url);
                  } catch (err) {
                    setError({ msg: (err as Error).message });
                  }
                }}
              >
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
          <DesignCanvas ref={ref} design={design} onChange={setDesign} className="max-w-[640px] overflow-hidden rounded-xl shadow-2xl" />
          {busy && <div className="absolute inset-0 grid max-w-[640px] place-items-center rounded-xl bg-slate-950/60 text-sm">Generez…</div>}
        </div>
      </div>
    </div>
  );
}
