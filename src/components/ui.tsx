// Componentele de bază ale sistemului vizual (tokenurile și clasele sunt în src/index.css,
// regulile în docs/DESIGN.md). Paginile compun din astea, nu din clase Tailwind lungi.

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}

/**
 * Titlu în două voci: textul dintre *steluțe* apare în serif coral.
 *   <Accent text="Banii pe bonuri, *în zile.*" />
 */
export function Accent({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="accent-serif">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

export function Card({
  title,
  children,
  className = "",
  actions,
  tour,
  label,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  /** ținta pentru turul ghidat al mascotei (data-tour) */
  tour?: string;
  /** etichetă mică în majuscule deasupra titlului („PASUL 2”, „PROMPTUL TĂU”) */
  label?: string;
}) {
  return (
    <section data-tour={tour} className={`card p-5 sm:p-6 ${className}`}>
      {(title || actions || label) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {label && <p className="label-caps mb-1">{label}</p>}
            {title && <h2 className="text-[1.08rem] font-semibold tracking-tight text-ink">{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Pastilă de stare. ok = verde, false = atenție, null = neutră. */
export function Pill({ ok, children }: { ok: boolean | null; children: ReactNode }) {
  const color = ok === null ? "bg-paper-2 text-ink-2 ring-line" : ok ? "bg-sage text-sage-ink ring-[#cfe3c9]" : "bg-amber-100 text-amber-200 ring-[#eedbb0]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${color}`}>{children}</span>;
}

/** Eticheta unui rol („Angajat”, „Manager”): pastilă colorată, text serif. */
const TAG_TONES = [
  "bg-lilac text-lilac-ink ring-[#d6d0f6]",
  "bg-sage text-sage-ink ring-[#cfe3c9]",
  "bg-coral-tint text-coral-deep ring-[#f2cdc5]",
  "bg-amber-100 text-amber-200 ring-[#eedbb0]",
];
export function Tag({ children, tone = 0, className = "" }: { children: ReactNode; tone?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 font-serif text-[0.95rem] font-medium ring-1 [font-variation-settings:'opsz'_24] ${TAG_TONES[tone % TAG_TONES.length]} ${className}`}>
      {children}
    </span>
  );
}

/** Panglica gravată de deasupra unei secțiuni. */
export function Ribbon({ children }: { children: ReactNode }) {
  return <span className="ribbon">{children}</span>;
}

export function ErrorNote({ error, hint }: { error: string | null | undefined; hint?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-2xl border border-[#f2cdc5] bg-coral-tint px-4 py-3 text-sm text-coral-deep">
      <p>{error}</p>
      {hint && <p className="mt-1 opacity-80">{hint}</p>}
    </div>
  );
}

/**
 * Antetul unei pagini: panglică opțională, titlu în două voci (*accent*), descriere.
 */
export function PageHeader({ title, description, children, eyebrow }: { title: string; description: ReactNode; children?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-3">
            <Ribbon>{eyebrow}</Ribbon>
          </div>
        )}
        <h1 className="text-[2rem] font-semibold leading-[1.05] text-ink sm:text-[2.4rem]">
          <Accent text={title} />
        </h1>
        <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-2">{description}</p>
      </div>
      {children}
    </header>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-[0.85em] text-coral-deep">{children}</code>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

/** Butonul rotund coral cu săgeată, din caseta de prompt. */
export function ArrowButton({ busy, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; label: string }) {
  return (
    <button aria-label={label} title={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-coral text-white shadow-[inset_0_-3px_0_var(--color-coral-deep)] transition active:translate-y-px disabled:opacity-40" {...props}>
      {busy ? <Spinner /> : ARROW}
    </button>
  );
}
const ARROW = (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" /></svg>
);

/** Microfonul, desenat (nu emoji). */
export function MicIcon({ on = false }: { on?: boolean }) {
  return on ? (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" />
      <path d="M3 8a5 5 0 0 0 10 0M8 13v1.5" strokeLinecap="round" />
    </svg>
  );
}
