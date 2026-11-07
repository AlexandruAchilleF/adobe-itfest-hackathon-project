// Landing page-ul Spire („/”): ce face produsul, în ordinea în care îl vede juriul (docs/JURIU.md, întrebarea 6).
//  1. cerul pictat cu uliul: fraza produsului și Spire care vorbește în locul promptului
//  2. problema: de ce un chat nu ajunge (aripile desenate pe margini)
//  3. cei trei pași: se uită, întreabă, face (cu postarea reală din campania de exemplu)
//  4. garda: verificările calculate de cod pe aceeași campanie
//  5. cerul de noapte: referința lângă rezultat
//  6. apusul: îndemnul final
// Imaginile din public/landing/ sunt generate cu Cloudflare Workers AI (FLUX.2 klein), ca restul ilustrațiilor Spire.

import { Fragment, type ReactNode, useMemo, useRef } from "react";
import { Link } from "wouter";
import { Accent, Ribbon } from "../../components/ui";
import { seedCampaign } from "../../lib/campaigns";
import { useInView, useTypewriter } from "../../lib/motion";
import { useMascotPage } from "../../modules/mascot/page";
import { scenario } from "../../scenario/config";
import { DesignPreview } from "./DesignPreview";
import { CheckList, useBrand } from "./parts";

const S = scenario;

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Titlul care apare cuvânt cu cuvânt la derulare (finalul paginii). */
function WordsIn({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -25% 0px" });
  const words = text.split(" ");
  return (
    <h2 ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span aria-hidden className={`land-word ${inView ? "in" : ""}`} style={{ transitionDelay: `${i * 90}ms` }}>
            {w}
          </span>{" "}
        </Fragment>
      ))}
    </h2>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-ink ${className}`}>
      <img src="/landing/hawk-mark.svg" alt="" className="h-7 w-7" />
      {S.app.name}
    </span>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4">
      <nav className="land-nav mx-auto flex h-16 max-w-5xl items-center gap-6 px-5 sm:px-7" aria-label="Principal">
        <div className="hidden flex-1 items-center gap-7 text-[0.97rem] text-ink md:flex">
          <a href="#cum" className="hover:text-coral-deep">Cum funcționează</a>
          <a href="#garda" className="hover:text-coral-deep">Garda</a>
          <Link href="/campanii" className="hover:text-coral-deep">Campanii</Link>
        </div>
        <Link href="/" className="md:flex-none" aria-label={S.app.name}>
          <Logo />
        </Link>
        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          <Link href="/marca" className="hidden text-[0.97rem] text-coral-deep hover:underline lg:inline">Marca ta</Link>
          {/* .btn fixează display-ul, deci ascunderea pe telefon stă pe un înveliș */}
          <span className="hidden sm:inline-flex">
            <Link href="/campanii" className="btn btn-story btn-secondary land-btn-sm whitespace-nowrap">Vezi un exemplu</Link>
          </span>
          <Link href="/nou" className="btn btn-story btn-primary land-btn-sm whitespace-nowrap">Încearcă acum</Link>
        </div>
      </nav>
    </header>
  );
}

const SPIRE_SAYS = "Am găsit pe pagină un hero cu ilustrație, trei culori și un ton jucăuș. Îl refac pentru Gelateria Pip, cu Pip desenat în același stil?";

function Hero() {
  const { typed, done } = useTypewriter(SPIRE_SAYS, { loop: true, speed: 32, pause: 2600 });
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col items-center overflow-hidden px-4 pt-36 pb-24 sm:pt-40">
      <img src="/landing/hero.webp" alt="" className="land-hero-img absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-cream" />

      <p className="land-rise rounded-md bg-[#fbe9df]/90 px-3 py-1 text-[0.95rem] text-coral-deep line-through decoration-coral-deep/70" style={{ animationDelay: "60ms" }}>
        {S.app.notThis}
      </p>
      <h1 className="land-rise mt-5 max-w-4xl text-center text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] whitespace-pre-line text-ink sm:text-[4.2rem]" style={{ animationDelay: "140ms" }}>
        <Accent text={(S.app.headline ?? S.app.tagline).replace("? ", "?\n")} />
      </h1>

      <div className="land-rise story-prompt mt-9 w-full max-w-xl p-4 text-left sm:p-5" style={{ animationDelay: "260ms" }}>
        <p className="flex items-center gap-2 text-sm font-medium text-coral-deep">
          <img src="/landing/hawk-mark.svg" alt="" className="h-5 w-5" />
          {S.app.name} se uită la pagina ta
        </p>
        <p className="mt-2 min-h-[4.6rem] text-[1.02rem] leading-relaxed text-ink" aria-label={SPIRE_SAYS}>
          <span aria-hidden>
            {typed}
            {!done && <span className="caret" />}
          </span>
        </p>
        <div className="mt-1 flex justify-end">
          <Link href="/nou" className="grid h-9 w-9 place-items-center rounded-full bg-coral text-white hover:bg-coral-deep" aria-label="Începe o campanie">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="land-rise mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: "360ms" }}>
        <Link href="/nou" className="btn btn-story btn-primary">Încearcă acum</Link>
        <Link href="/campanii" className="btn btn-story btn-secondary">Vezi un exemplu</Link>
      </div>
    </section>
  );
}

const PAINS: Array<{ title: string; icon: ReactNode }> = [
  {
    title: "Promptul nu prinde stilul",
    icon: <path d="M6 30c6-12 12-18 22-20M8 12h10M8 18h6M24 24l6 6M30 24l-6 6" />,
  },
  {
    title: "Culorile mărcii ies pe alături",
    icon: (
      <>
        <circle cx="13" cy="14" r="7" />
        <circle cx="25" cy="14" r="7" />
        <circle cx="19" cy="25" r="7" />
      </>
    ),
  },
  {
    title: "Prețul și mențiunile ies greșit",
    icon: <path d="M8 8h14l10 10-12 12L8 20zM14 14h.01M17 25l8-8" />,
  },
];

function Problem() {
  return (
    <section className="relative overflow-hidden bg-cream px-4 pt-20 pb-28">
      <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute top-6 -left-24 w-[420px] max-md:hidden" />
      <img src="/landing/wing.webp" alt="" className="land-wing pointer-events-none absolute top-6 -right-24 w-[420px] -scale-x-100 max-md:hidden" />
      <Reveal className="relative mx-auto max-w-3xl text-center">
        <Ribbon>Problema</Ribbon>
        <h2 className="mt-6 text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.04em] whitespace-pre-line text-ink sm:text-[3.4rem]">
          <Accent text={"Designul care îți place e la un clic.\n*Pe marca ta, e la zece prompturi.*"} />
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-ink-2">
          Un chat reface imaginea de la zero. <strong className="font-semibold text-ink">Pierde stilul, culorile mărcii și prețul corect.</strong> Iar fiecare variantă o verifici tu, de mână.
        </p>
      </Reveal>
      <div className="relative mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-3">
        {PAINS.map((p, i) => (
          <Reveal key={p.title} delay={i * 110}>
            <div className="land-sky-card flex h-full flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <svg width="40" height="40" viewBox="0 0 38 38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink" aria-hidden>
                {p.icon}
              </svg>
              <p className="text-[1.25rem] leading-tight font-semibold tracking-[-0.02em] text-ink">{p.title}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Step({ tag, title, text, children }: { tag: string; title: string; text: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-10 py-12 md:grid-cols-[1fr_1.15fr] md:gap-16">
      <Reveal>
        <span className="rounded-md bg-coral-tint px-2.5 py-1 text-sm font-medium text-coral-deep">{tag}</span>
        <h3 className="mt-4 text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.035em] whitespace-pre-line text-ink sm:text-[2.3rem]">
          <Accent text={title} />
        </h3>
        <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed text-ink-2">{text}</p>
      </Reveal>
      <Reveal delay={120}>
        <div className="land-frame p-3 sm:p-4">{children}</div>
      </Reveal>
    </div>
  );
}

/** Zonele pe care Spire le găsește în referință, în procente din imagine (1080×1350). */
const ZONES = [
  { label: "titlul", x: 7, y: 8, w: 50, h: 9 },
  { label: "oferta", x: 7, y: 22, w: 45, h: 8 },
  { label: "ilustrația", x: 25, y: 42, w: 67, h: 37 },
  { label: "îndemnul", x: 7, y: 79, w: 52, h: 10 },
];

function HowItWorks() {
  const campaign = useMemo(seedCampaign, []);
  const brand = useBrand();
  const { answers, designs } = campaign;
  const questions: Array<{ q: string; options: string[]; picked: string[] }> = [
    { q: "Ce oferă campania?", options: [answers.offer ?? "2 la preț de 1", "-20% azi", "Altceva"], picked: [answers.offer ?? "2 la preț de 1"] },
    { q: "Ce îi spunem omului să facă?", options: [answers.cta ?? "Vino azi", "Comandă acum", "Altceva"], picked: [answers.cta ?? "Vino azi"] },
    { q: "Ce formate vrei?", options: ["Postare", "Story", "Hero"], picked: ["Postare", "Story"] },
  ];
  return (
    <section id="cum" className="scroll-mt-24 bg-cream px-4 pb-16">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Ribbon>Cum funcționează</Ribbon>
        <h2 className="mt-6 text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.04em] whitespace-pre-line text-ink sm:text-[3.2rem]">
          <Accent text={"Un coleg care se uită, întreabă\n*și face kitul.*"} />
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[1.08rem] leading-relaxed text-ink-2">Fără prompt. Spire pornește de la pagina pe care o ai deja deschisă.</p>
      </Reveal>

      <div className="mx-auto mt-6 max-w-5xl">
        <Step tag="Se uită" title={"Spire *citește pagina*\npe care ești"} text="Apare peste site, alege ce e util pentru o campanie și îți spune de ce: așezarea, rolurile culorilor, tonul.">
          <div className="relative mx-auto max-w-[300px] overflow-hidden rounded-xl">
            <img src="/samples/spire/referinta.png" alt="Designul de referință: o postare pentru ceai rece, cu o cămilă desenată" className="block w-full" />
            {ZONES.map((z) => (
              <span key={z.label} className="land-zone absolute" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}>
                <span className="land-zone-label">{z.label}</span>
              </span>
            ))}
          </div>
        </Step>

        <Step tag="Întreabă" title={"Te întreabă\n*doar trei lucruri*"} text={`Oferta, îndemnul și formatele. Culorile, fonturile și mascota le ia din marca ${brand.name}.`}>
          <div className="space-y-4 rounded-xl bg-white p-5 sm:p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-coral-deep">
              <img src="/landing/hawk-mark.svg" alt="" className="h-5 w-5" />
              {S.app.name} întreabă
            </p>
            {questions.map(({ q, options, picked }) => (
              <div key={q}>
                <p className="font-medium text-ink">{q}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {options.map((o) => (
                    <span key={o} className={`rounded-full px-3 py-1 text-sm ${picked.includes(o) ? "bg-ink text-white" : "bg-paper-2 text-ink-2"}`}>
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Step>

        <Step tag="Face" title={"Îți face\n*kitul de campanie*"} text={`Postare și story, cu ${brand.mascot?.name ?? "mascota ta"} redesenat în stilul referinței. Straturile rămân editabile, iar tu ai ultimul cuvânt.`}>
          <div className="flex items-end justify-center gap-4">
            {designs.post && <DesignPreview design={designs.post} className="w-[58%] rounded-lg shadow-[0_18px_36px_-20px_rgb(27_35_80/0.5)]" />}
            {designs.story && <DesignPreview design={designs.story} className="w-[33%] rounded-lg shadow-[0_18px_36px_-20px_rgb(27_35_80/0.5)]" />}
          </div>
        </Step>
      </div>
    </section>
  );
}

function Guard() {
  const { checks } = useMemo(seedCampaign, []);
  const passed = checks.filter((c) => c.ok).length;
  return (
    <section id="garda" className="scroll-mt-24 bg-cream px-4 pt-10 pb-28">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Ribbon>Garda</Ribbon>
        <h2 className="mt-6 text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.04em] whitespace-pre-line text-ink sm:text-[3.2rem]">
          <Accent text={"AI-ul propune.\n*Codul verifică.*"} />
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[1.08rem] leading-relaxed text-ink-2">
          Înainte să vezi kitul, codul verifică fiecare material. Dacă ceva nu trece, Spire îl corectează singur, de cel mult două ori.
        </p>
      </Reveal>
      <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
        <div className="relative overflow-hidden rounded-[28px] px-4 py-10 sm:px-12 sm:py-14">
          <img src="/landing/sky.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative mx-auto max-w-lg rounded-2xl bg-white/95 p-6 shadow-[0_24px_48px_-24px_rgb(27_35_80/0.45)] backdrop-blur sm:p-7">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-ink">Campania de exemplu</p>
              <p className="text-sm font-medium text-ok">
                {passed} din {checks.length} verificări trec
              </p>
            </div>
            <div className="mt-4">
              <CheckList checks={checks.slice(0, 6)} />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function BeforeAfter() {
  const brand = useBrand();
  return (
    <section className="relative isolate overflow-hidden px-4 pt-28 pb-44">
      <img src="/landing/night.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      {/* noaptea se topește în apusul de dedesubt */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-56 bg-gradient-to-b from-transparent to-[#d0bfe8]" />
      <Reveal className="mx-auto max-w-3xl text-center">
        <Ribbon>Înainte și după</Ribbon>
        <h2 className="mt-6 text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.04em] whitespace-pre-line text-white sm:text-[3.2rem]">
          <Accent text={"Stilul altcuiva.\n*Conținutul tău.*"} />
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[1.08rem] leading-relaxed text-white/80">Preluăm doar felul în care e desenat. Ilustrația, textele și culorile sunt ale tale.</p>
      </Reveal>
      <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
        <div className="land-frame grid items-center gap-4 p-4 sm:grid-cols-[1fr_auto_1fr] sm:p-6">
          <figure>
            <img src="/samples/spire/referinta.png" alt="Referința: o postare pentru ceai rece, cu o cămilă" className="aspect-[4/5] w-full rounded-xl object-cover" />
            <figcaption className="mt-2 text-center text-sm text-muted">Referința văzută pe un site</figcaption>
          </figure>
          <svg width="40" height="24" viewBox="0 0 40 24" className="mx-auto rotate-90 text-coral sm:rotate-0" aria-hidden>
            <path d="M2 12h34M26 3l10 9-10 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <figure>
            <img src="/samples/spire/pip-in-stil.png" alt={`${brand.mascot?.name ?? "Mascota"}, redesenat în stilul referinței`} className="aspect-[4/5] w-full rounded-xl object-cover" />
            <figcaption className="mt-2 text-center text-sm text-muted">
              {brand.mascot?.name ?? "Mascota"}, pe marca {brand.name}
            </figcaption>
          </figure>
        </div>
      </Reveal>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative isolate -mt-px overflow-hidden px-4 pt-32 pb-40 text-center">
      <img src="/landing/dusk.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-cream" />
      <Ribbon>Spire</Ribbon>
      <WordsIn text="N-ai designer azi?" className="mx-auto mt-6 max-w-3xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] text-ink sm:text-[4rem]" />
      <Reveal delay={300}>
        <p className="text-[2.6rem] leading-[1.05] tracking-[-0.03em] sm:text-[4rem]">
          <span className="accent-serif">Spire e aici.</span>
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/nou" className="btn btn-story btn-primary">Încearcă acum</Link>
          <Link href="/campanii" className="btn btn-story btn-secondary">Vezi un exemplu</Link>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-cream px-4 pt-6 pb-12 text-center">
      <Logo className="text-[1.6rem]" />
      <nav className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.95rem] text-ink-2" aria-label="Subsol">
        {S.nav?.map((n) => (
          <Link key={n.href} href={n.href} className="hover:text-coral-deep">
            {n.label}
          </Link>
        ))}
        <Link href="/pitch" className="hover:text-coral-deep">Pitch</Link>
      </nav>
      <p className="mt-6 text-sm text-muted">Făcut la ITFest 2026, pe tema Adobe „Marketing Reimagined”.</p>
    </footer>
  );
}

export function LandingPage() {
  useMascotPage({ title: "Start", context: () => "landing page-ul Spire" });
  return (
    <div className="bg-cream">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Guard />
        <BeforeAfter />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
