// Pagina de lucru a unei campanii: designul încape pe ecran, textele stau în dreapta, exportul e mereu la vedere.
// Garda se recalculează la fiecare schimbare.
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { Button, Card, ErrorNote } from "../../components/ui";
import { type Campaign, campaigns, type DesignFormat, guardCampaign, updateCampaign } from "../../lib/campaigns";
import type { Design } from "../../lib/design";
import type { Check, CheckId } from "../../lib/guard";
import { useCollection } from "../../lib/store";
import { DesignCanvas, type DesignCanvasHandle } from "../../modules/canvas/DesignCanvas";
import { useMascotPage } from "../../modules/mascot/page";
import { FormatTabs, GuardLine, useBrand, WhatIsNew } from "./parts";

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
    <div className="work-page">
      <div className="work-bar card flex flex-wrap items-center gap-x-3 gap-y-1.5 px-2 py-2 sm:px-3">
        <Link href="/campanii" className="btn btn-ghost !min-h-9 !gap-1.5 !px-2 !py-1 text-[0.9rem]">
          <svg width="8" height="12" viewBox="0 0 8 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6.5 1 1.5 6l5 5" />
          </svg>
          Campanii
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink sm:text-lg">{draft.title}</h1>
        <div className="ml-auto flex items-center gap-2 max-sm:w-full max-sm:justify-between">
          <FormatTabs formats={formats} value={format} onChange={setFormat} />
          <Button variant="ink" className="!min-h-9 !py-1.5 whitespace-nowrap max-sm:ml-auto" disabled={!design} onClick={download}>
            Descarcă PNG
          </Button>
        </div>
      </div>
      <ErrorNote error={error} />
      <div className="work-body grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[minmax(0,1fr)]">
        <section className="card min-h-0 min-w-0 p-3" aria-label="Designul, pe straturi" style={{ "--design-ratio": design ? design.height / design.width : 1.25 } as CSSProperties}>
          <div className="work-stage">{design && <DesignCanvas ref={canvas} design={design} onChange={change} fitHeight />}</div>
        </section>
        <div className="work-side min-w-0 space-y-3">
          <GuardLine checks={draft.checks} />
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
          <div className="card space-y-1.5 px-4 py-3">
            <p className="text-sm text-ink-2">{draft.source ? `Stilul vine de pe ${draft.source.title}.` : "Stilul vine dintr-o imagine încărcată."}</p>
            <WhatIsNew />
          </div>
          {draft.hero && <iframe title="Secțiunea hero" sandbox="" srcDoc={draft.hero.html} className="h-96 w-full rounded-lg border border-line bg-white" />}
        </div>
      </div>
    </div>
  );
}

export function CampaignPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { items, loading, error } = useCollection(campaigns);
  const rec = items.find((r) => r.id === id);
  if (loading) return <p className="text-sm text-muted">Se încarcă…</p>;
  if (!rec && error) return <ErrorNote error={error} hint="Campaniile nu s-au putut citi. Reîncearcă peste câteva momente." />;
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
