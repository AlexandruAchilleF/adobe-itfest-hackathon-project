import { useRef, useState } from "react";
import { Button, Card, ErrorNote, PageHeader } from "../components/ui";
import { QrPanel } from "../components/QrPanel";
import { Design, exampleDesign, type Design as DesignType } from "../lib/design";
import { downloadDataUrl, downloadText, shareDesign } from "../lib/share";
import { DesignCanvas, type DesignCanvasHandle } from "../modules/canvas/DesignCanvas";

export function CanvasPage() {
  const ref = useRef<DesignCanvasHandle>(null);
  const [design, setDesign] = useState<DesignType>(exampleDesign);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#f43f5e");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState("");

  async function share() {
    setError(null);
    try {
      const d = ref.current!.getDesign();
      const png = await ref.current!.exportPNGBlob();
      setShareUrl((await shareDesign(d, png)).url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function importJson() {
    try {
      const parsed = Design.parse(JSON.parse(json));
      setDesign(parsed);
      setJson("");
      setError(null);
    } catch (err) {
      setError(`JSON invalid: ${(err as Error).message}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Design editabil"
        description="Rezultatul nu e o imagine moartă: utilizatorul (sau juriul) îl poate modifica. Dublu-click pe text, trage de colțuri, Delete șterge."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => ref.current?.addText()}>+ Text</Button>
            <Button onClick={() => ref.current?.addRect(color)}>+ Dreptunghi</Button>
            <Button onClick={() => ref.current?.addCircle(color)}>+ Cerc</Button>
            <Button
              variant={drawing ? "primary" : "secondary"}
              onClick={() => {
                ref.current?.setDrawingMode(!drawing, color);
                setDrawing(!drawing);
              }}
            >
              ✏️ Desen liber
            </Button>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-10 cursor-pointer rounded border border-slate-700 bg-transparent" title="Culoare" />
            <Button onClick={() => ref.current?.setFillOfSelected(color)}>Colorează selecția</Button>
            <Button variant="danger" onClick={() => ref.current?.deleteSelected()}>
              Șterge
            </Button>
          </div>
          <div
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === "Delete" || e.key === "Backspace") && !(e.target as HTMLElement).isContentEditable) ref.current?.deleteSelected();
            }}
          >
            <DesignCanvas ref={ref} design={design} onChange={setDesign} className="max-w-[640px] overflow-hidden rounded-xl shadow-2xl" />
          </div>
        </div>
        <div className="space-y-4">
          <Card title="Export">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => downloadDataUrl(ref.current!.exportPNG(2), "design.png")}>PNG</Button>
              <Button onClick={() => downloadText(ref.current!.exportSVG(), "design.svg")}>SVG</Button>
              <Button onClick={() => downloadText(JSON.stringify(ref.current!.getDesign(), null, 2), "design.json", "application/json")}>JSON</Button>
              <Button variant="primary" onClick={share}>
                QR
              </Button>
            </div>
            <ErrorNote error={error} />
            {shareUrl && (
              <div className="mt-4">
                <QrPanel url={shareUrl} label="Scanează ca să-l iei pe telefon" />
              </div>
            )}
          </Card>
          <Card title="JSON">
            <textarea
              value={json || JSON.stringify(design, null, 2)}
              onChange={(e) => setJson(e.target.value)}
              className="h-56 w-full rounded-xl border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
            />
            <div className="mt-2 flex gap-2">
              <Button onClick={importJson} disabled={!json}>
                Încarcă JSON
              </Button>
              <Button variant="ghost" onClick={() => setDesign({ ...exampleDesign })}>
                Reset exemplu
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
