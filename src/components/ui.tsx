// Componentele de bază ale sistemului vizual (tokenurile și clasele sunt în src/index.css,
// regulile în docs/DESIGN.md). Paginile compun din astea, nu din clase Tailwind lungi.
// Ecranele de lucru folosesc Button, Card, PageHeader, Tag, Pill. `Accent` și `Ribbon` sunt
// doar pentru povestea de pe prima pagină.

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ink" | "secondary" | "ghost" | "danger";

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`btn btn-${variant} ${className}`} {...props} />;
}

/**
 * Titlu în două voci, doar pe prima pagină: textul dintre *steluțe* apare în serif coral.
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

/** Textul fără steluțele de accent (ecranele de lucru au titluri simple). */
export const plain = (text: string) => text.replace(/\*([^*]+)\*/g, "$1");

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
  /** etichetă mică deasupra titlului („Pasul 2”, „Cerere nouă”) */
  label?: string;
}) {
  return (
    <section data-tour={tour} className={`card p-5 ${className}`}>
      {(title || actions || label) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {label && <p className="label-caps mb-0.5">{label}</p>}
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
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
  const color = ok === null ? "bg-paper-2 text-ink-2" : ok ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn";
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>{children}</span>;
}

/** Eticheta unui rol („Angajat”, „Manager”): text mic pe fundal neutru, cu un punct de culoare. */
const TAG_TONES = ["#6f73c9", "#4f9a6a", "#d0705d", "#c99a3a"];
export function Tag({ children, tone = 0, className = "" }: { children: ReactNode; tone?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-paper-2 px-2 py-0.5 text-xs font-medium text-ink-2 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: TAG_TONES[tone % TAG_TONES.length] }} aria-hidden />
      {children}
    </span>
  );
}

/** Panglica gravată de deasupra unei secțiuni din poveste (doar prima pagină). */
export function Ribbon({ children }: { children: ReactNode }) {
  return <span className="ribbon">{children}</span>;
}

export function ErrorNote({ error, hint }: { error: string | null | undefined; hint?: string }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-xl border border-[#efc9c1] bg-coral-tint px-4 py-3 text-sm text-coral-deep">
      <p>{error}</p>
      {hint && <p className="mt-1 opacity-80">{hint}</p>}
    </div>
  );
}

/**
 * Antetul unei pagini de lucru: titlul spune ce ai de făcut, descrierea e o propoziție.
 * `eyebrow` apare ca text mic deasupra; steluțele din titlu sunt ignorate (accentul e doar pe prima pagină).
 */
export function PageHeader({ title, description, children, eyebrow }: { title: string; description?: ReactNode; children?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1 text-sm text-muted">{eyebrow}</p>}
        <h1 className="text-[1.6rem] font-semibold leading-tight text-ink sm:text-[1.9rem]">{plain(title)}</h1>
        {description && <p className="mt-1.5 leading-relaxed text-ink-2">{description}</p>}
      </div>
      {children}
    </header>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-[0.85em] text-ink-2">{children}</code>;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}

/** Butonul rotund cu săgeată, din caseta de prompt. */
export function ArrowButton({ busy, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; label: string }) {
  return (
    <button aria-label={label} title={label} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coral text-white transition hover:bg-coral-deep active:translate-y-px disabled:opacity-40" {...props}>
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
