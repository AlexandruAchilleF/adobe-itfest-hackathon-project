// Piese comune paginilor Spire: bifele gărzii, alegerea formatului, marca curentă.
import { demoBrand } from "../../lib/brand";
import { brands, type DesignFormat, FORMAT_LABEL } from "../../lib/campaigns";
import type { Check } from "../../lib/guard";
import { useCollection } from "../../lib/store";
import { Tag } from "../../components/ui";
import { StatusDot } from "../../scenario/ui/parts";

export function useBrand() {
  const { items } = useCollection(brands);
  return items[0]?.data ?? demoBrand;
}

export function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-2.5">
      {checks.map((c) => (
        <li key={c.id} data-testid={`check-${c.id}`} className="flex items-start gap-2 text-[0.92rem] leading-snug text-ink">
          <span className="mt-1.5 flex">
            <StatusDot status={c.ok ? "verificat" : "respins"} />
          </span>
          <span className="min-w-0 flex-1">
            {c.message} <span className={c.ok ? "text-muted" : "font-medium text-coral-deep"}>{c.ok ? "trece" : "nu trece"}</span>
          </span>
          {c.source === "ai" && <Tag>AI</Tag>}
        </li>
      ))}
    </ul>
  );
}

export function FormatTabs({ formats, value, onChange }: { formats: DesignFormat[]; value: DesignFormat; onChange: (f: DesignFormat) => void }) {
  if (formats.length < 2) return null;
  return (
    <div className="flex gap-1.5" role="group" aria-label="Formatul">
      {formats.map((f) => (
        <button key={f} type="button" aria-pressed={f === value} onClick={() => onChange(f)} className={`rounded-lg px-3 py-1.5 text-sm ${f === value ? "bg-ink text-white" : "text-ink-2 hover:bg-paper-2"}`}>
          {FORMAT_LABEL[f]}
        </button>
      ))}
    </div>
  );
}

/** Spus pe ecran: așezarea e preluată intenționat, restul e nou. */
export function WhatIsNew() {
  return <p className="text-sm leading-relaxed text-muted">Preluat din referință: așezarea. Nou, pe marca ta: ilustrația, textele, culorile și fonturile.</p>;
}
