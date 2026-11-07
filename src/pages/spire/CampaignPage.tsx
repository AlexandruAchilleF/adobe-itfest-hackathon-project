// O campanie: formatele, retușul pe straturi, garda recalculată la fiecare schimbare, exportul.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { Button, Card, ErrorNote, PageHeader } from "../../components/ui";
import { type Campaign, campaigns, type DesignFormat, guardCampaign, updateCampaign } from "../../lib/campaigns";
import type { Design } from "../../lib/design";
import type { Check, CheckId } from "../../lib/guard";
import { useCollection } from "../../lib/store";
import { DesignCanvas, type DesignCanvasHandle } from "../../modules/canvas/DesignCanvas";
import { useMascotPage } from "../../modules/mascot/page";
import { CheckList, FormatTabs, useBrand, WhatIsNew } from "./parts";

// ilustrația nu se schimbă la retuș, deci verificările ei rămân cele de la generare
const KEPT_CHECKS: CheckId[] = ["illustration-palette", "not-copy", "mascot"];
const ROLE_LABEL: Record<string, string> = { headline: "Titlu", offer: "Ofertă", cta: "Buton", body: "Text" };

function recheck(draft: Campaign, designs: Campaign["designs"], brand: ReturnType<typeof useBrand>): Check[] {
  const kept = draft.checks.filter((c) => KEPT_CHECKS.includes(c.id));
  return [...guardCampaign({ designs, brand, answers: draft.answers, copy: draft.copy }), ...kept];
}

function Editor({ id, initial }: { id: string; initial: Campaign }) {
  const brand = useBrand();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const formats = useMemo(() => Object.keys(initial.designs) as DesignFormat[], [initial]);
  const [format, setFormat] = useState<DesignFormat>(formats[0] ?? "post");
  const canvas = useRef<DesignCanvasHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const design = draft.designs[format];

  useMascotPage({
    title: `Campania ${draft.title}`,
    context: () => `Format: ${format}. Verificări picate: ${draft.checks.filter((c) => !c.ok).map((c) => c.message).join("; ") || "niciuna"}.`,
  });

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (next: Design) => {
    setDraft((current) => {
      const designs = { ...current.designs, [format]: next };
      const updated = { ...current, designs, checks: recheck(current, designs, brand) };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        updateCampaign(campaigns, id, updated).then(() => setError(null), (err: Error) => setError(err.message));
      }, 400);
      return updated;
    });
  };

  const setText = (elementId: string, text: string) => {
    if (design) change({ ...design, elements: design.elements.map((e) => (e.id === elementId && e.type === "text" ? { ...e, text } : e)) });
  };

  const download = () => {
    const url = canvas.current?.exportPNG(1);
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.title}-${format}.png`;
    link.click();
  };

  const labelOf = (elementId: string) => {
    if (elementId.startsWith("mandatory")) return "Mențiune";
    const zone = draft.anatomy.zones.find((z) => z.id === elementId);
    return (zone && ROLE_LABEL[zone.role]) ?? "Text";
  };

  return (
    <div className="space-y-5">
      <PageHeader title={draft.title} description={draft.source ? `Stilul vine de pe ${draft.source.title}.` : "Stilul vine dintr-o imagine încărcată."}>
        <Link href="/campanii" className="btn btn-ghost">
          Toate campaniile
        </Link>
      </PageHeader>
      <ErrorNote error={error} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Card title="Retușează pe straturi" actions={<FormatTabs formats={formats} value={format} onChange={setFormat} />}>
          {design && <DesignCanvas ref={canvas} design={design} onChange={change} />}
          {draft.hero && <iframe title="Secțiunea hero" sandbox="" srcDoc={draft.hero.html} className="mt-4 h-96 w-full rounded-lg border border-line bg-white" />}
        </Card>
        <div className="space-y-5">
          <Card title="Garda">
            <CheckList checks={draft.checks} />
          </Card>
          {design && (
            <Card title="Textele">
              <div className="space-y-3">
                {design.elements.map((e) =>
                  e.type === "text" ? (
                    <label key={e.id} className="block text-sm text-ink-2">
                      {labelOf(e.id)}
                      <input value={e.text} onChange={(event) => setText(e.id, event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-1.5 text-[0.95rem] text-ink" />
                    </label>
                  ) : null,
                )}
              </div>
            </Card>
          )}
          <Card title="Exportul">
            <div className="space-y-3">
              <WhatIsNew />
              <Button variant="primary" disabled={!design} onClick={download}>
                Descarcă PNG
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CampaignPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { items, loading } = useCollection(campaigns);
  const rec = items.find((r) => r.id === id);
  if (loading) return <p className="text-sm text-muted">Se încarcă…</p>;
  if (!rec) {
    return (
      <Card>
        <p className="text-[0.95rem] text-ink-2">
          Campania nu mai există.{" "}
          <Link href="/campanii" className="underline">
            Vezi toate campaniile
          </Link>
        </p>
      </Card>
    );
  }
  return <Editor key={id} id={id} initial={rec.data} />;
}
