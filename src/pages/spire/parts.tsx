// Piese comune paginilor Spire: bifele gărzii, alegerea formatului, marca curentă.
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { demoBrand } from "../../lib/brand";
import { brands, type DesignFormat, FORMAT_LABEL } from "../../lib/campaigns";
import { failedKey, guardSummary } from "../../lib/campaignList";
import type { Check } from "../../lib/guard";
import { useCollection } from "../../lib/store";
import { Tag } from "../../components/ui";
import { StatusDot } from "../../scenario/ui/parts";

export function useBrand() {
  return useBrandState().brand;
}

/** Marca și starea încărcării: când baza de date nu răspunde, pagina spune asta, nu lucrează tăcut pe marca de exemplu. */
export function useBrandState() {
  const { items, loading, error } = useCollection(brands);
  return { brand: items[0]?.data ?? demoBrand, loading, error };
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

/** Garda pe o linie: se deschide la cerere și singură când pică ceva. Bifele rămân în pagină și când e închisă. */
export function GuardLine({ checks }: { checks: Check[] }) {
  const failed = failedKey(checks);
  const box = useRef<HTMLDetailsElement>(null);
  // starea deschis/închis stă doar în DOM: o copie în React rămâne în urmă cât timp evenimentul `toggle` e pe drum
  useLayoutEffect(() => {
    if (failed && box.current) box.current.open = true;
  }, [failed]);
  return (
    <details ref={box} className="card group" data-testid="guard">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[14px] px-4 py-3 text-[0.95rem] [&::-webkit-details-marker]:hidden">
        <StatusDot status={failed ? "respins" : "verificat"} />
        <span className="font-medium text-ink">Garda</span>
        <span className="text-ink-2">{guardSummary(checks)}</span>
        <svg className="ml-auto text-muted transition-transform group-open:rotate-180" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M1 1.5 6 6.5 11 1.5" />
        </svg>
      </summary>
      <div className="border-t border-line-2 px-4 py-3">
        <CheckList checks={checks} />
      </div>
    </details>
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

/**
 * O secțiune a panoului din extensie: titlu, o frază despre ce faci aici, apoi conținutul.
 * Fără card în jur: conținutul își are cardul lui, ca să nu fie carduri în carduri.
 */
export function PanelSection({ id, title, hint, children }: { id: string; title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titlu`} className="panel-section scroll-mt-40 space-y-3">
      <div className="px-0.5">
        <h2 id={`${id}-titlu`} className="text-[1.05rem] font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-sm leading-snug text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

/** Navigarea între secțiunile panoului: sare la secțiune și arată unde ești. */
export function PanelNav({ sections }: { sections: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(sections[0]?.id);
  const ids = sections.map((s) => s.id).join(",");
  useEffect(() => {
    const els = ids.split(",").map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        const first = els.find((el) => visible.get(el.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-150px 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return (
    <nav aria-label="Secțiunile panoului" className="flex gap-1 rounded-xl bg-paper-2 p-1">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          aria-current={active === s.id ? "true" : undefined}
          onClick={(e) => {
            e.preventDefault();
            setActive(s.id);
            document.getElementById(s.id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          }}
          className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[0.8rem] font-medium transition-colors ${active === s.id ? "bg-card text-ink shadow-[0_1px_2px_rgb(27_35_80/0.08)]" : "text-muted hover:text-ink"}`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
