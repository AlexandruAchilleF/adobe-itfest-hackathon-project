// Landing page-ul Spire („/”): ce face produsul, în ordinea în care îl vede juriul (docs/JURIU.md, întrebarea 6).
//  1. cerul pictat cu uliul: fraza produsului și Spire care vorbește în locul promptului
//  2. problema: de ce un chat nu ajunge (aripile desenate pe margini)
//  3. cei trei pași: se uită, întreabă, face; macheta din dreapta stă fixă și se schimbă la derulare
//     (uliul pe site și meniul lui → întrebările → kitul cu bifele → exportul PNG), din LandingMockups.tsx
//  4. garda: bucla reală (runAgentLoop + guardCampaign) prinde prețul greșit și îl corectează
//  5. cerul de noapte: referința lângă rezultat, cu bifele calculate pe ilustrația măsurată
//  6. critica: uliul aterizează pe o pagină de demo, cu textele date de critiquePage (src/lib/landingCritique.ts)
//  7. extensia: fișa de instalare; butonul vine din src/lib/extensionInstall.ts
//  8. apusul: îndemnul final
// Între noapte și apus, critica și extensia stau pe .land-dawn, care pornește și se termină cu lila lor comun.
// Imaginile din public/landing/ sunt generate cu Cloudflare Workers AI (FLUX.2 klein), ca restul ilustrațiilor Spire.

import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Accent, Ribbon } from "../../components/ui";
import { installAction } from "../../lib/extensionInstall";
import { MAX_CRITIQUES } from "../../lib/critique";
import { useInView, useTypewriter } from "../../lib/motion";
import { useMascotPage } from "../../modules/mascot/page";
import { scenario } from "../../scenario/config";
import { AfterMock, AskMock, CritiqueMock, ExportMock, GuardMock, KitMock, type LandingData, ReferenceMock, Scaled, ScanMock, useLandingData } from "./LandingMockups";
import { useBrand } from "./parts";

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
          <a href="#extensie" className="hover:text-coral-deep">Extensia</a>
          <Link href="/campanii" className="hover:text-coral-deep">Campanii</Link>
        </div>
        <Link href="/" className="md:flex-none" aria-label={S.app.name}>
          <Logo />
        </Link>
        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          <Link href="/marca" className="hidden text-[0.97rem] text-coral-deep hover:underline lg:inline">Marca ta</Link>
          {/* .btn fixează display-ul, deci ascunderea pe telefon stă pe un înveliș */}
          <span className="hidden sm:inline-flex md:hidden lg:inline-flex">
            <Link href="/campanii" className="btn btn-story btn-secondary land-btn-sm whitespace-nowrap">Vezi un exemplu</Link>
          </span>
          <Link href="/acasa" className="btn btn-story btn-primary land-btn-sm whitespace-nowrap">Încearcă acum</Link>
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
        <Link href="/acasa" className="btn btn-story btn-primary">Încearcă acum</Link>
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

function StepText({ tag, title, text }: { tag: string; title: string; text: string }) {
  return (
    <Reveal>
      <span className="rounded-md bg-coral-tint px-2.5 py-1 text-sm font-medium text-coral-deep">{tag}</span>
      <h3 className="mt-4 text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.035em] whitespace-pre-line text-ink sm:text-[2.3rem]">
        <Accent text={title} />
      </h3>
      <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed text-ink-2">{text}</p>
    </Reveal>
  );
}

/** Macheta pornește cât e pe ecran (pe telefon, sub textul pasului). */
function InView({ children }: { children: (active: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: false, margin: "-10% 0px -10% 0px" });
  return <div ref={ref}>{children(on)}</div>;
}

const MOCK_W = 560;
const MOCK_H = 470;

/** Pasul activ: marcajul care trece de linia din mijlocul ecranului. */
function useActiveMarker(count: number) {
  const markers = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(markers.current.indexOf(e.target as HTMLDivElement));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    markers.current.slice(0, count).forEach((m) => m && io.observe(m));
    return () => io.disconnect();
  }, [count]);
  const mark = (i: number) => (el: HTMLDivElement | null) => {
    markers.current[i] = el;
  };
  return { active, mark };
}

function HowItWorks({ data }: { data: LandingData }) {
  const brand = useBrand();
  const { campaign } = data;
  const { active, mark } = useActiveMarker(4);
  const mocks = [
    (on: boolean) => <ScanMock active={on} />,
    (on: boolean) => <AskMock active={on} campaign={campaign} />,
    (on: boolean) => <KitMock active={on} data={data} />,
    (on: boolean) => <ExportMock active={on} campaign={campaign} />,
  ];
  const scaled = (i: number, on: boolean) => (
    <Scaled width={MOCK_W} height={MOCK_H}>
      {mocks[i](on)}
    </Scaled>
  );
  const steps = [
    { tag: "Se uită", title: "Spire *citește pagina*\npe care ești", text: "Apeși iconița și uliul apare pe site. Alegi „Fă o campanie”, iar el citește pagina, marchează ce e bun pentru campanie și îți spune de ce." },
    { tag: "Întreabă", title: "Te întreabă\n*doar trei lucruri*", text: `Oferta, îndemnul și formatele. Culorile, fonturile și mascota le ia din marca ${brand.name}.` },
    { tag: "Face", title: "Îți face\n*kitul de campanie*", text: `Postare și story, cu ${brand.mascot?.name ?? "mascota ta"} redesenat în stilul referinței. Straturile rămân editabile, iar tu ai ultimul cuvânt.` },
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

      <div className="mx-auto mt-6 max-w-6xl md:grid md:grid-cols-[0.85fr_1.15fr] md:gap-14 lg:gap-20">
        <div>
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              // ultimul pas ține două machete (kitul, apoi exportul): textul stă fix cât trec amândouă
              <div key={step.tag} className={`relative py-12 md:py-0 ${last ? "md:h-[150vh]" : "md:flex md:min-h-[90vh] md:items-center"}`}>
                {last ? (
                  <>
                    <div ref={mark(2)} className="absolute inset-x-0 top-0 h-1/2" aria-hidden />
                    <div ref={mark(3)} className="absolute inset-x-0 bottom-0 h-1/2" aria-hidden />
                    <div className="md:sticky md:top-[34vh]">
                      <StepText {...step} />
                    </div>
                  </>
                ) : (
                  <>
                    <div ref={mark(i)} className="absolute inset-0" aria-hidden />
                    <StepText {...step} />
                  </>
                )}
                <div className="mt-8 space-y-6 md:hidden">
                  <InView>{(on) => scaled(i, on)}</InView>
                  {last && <InView>{(on) => scaled(3, on)}</InView>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden md:block">
          <div className="sticky top-[max(6.5rem,calc(50vh-15rem))] grid">
            {mocks.map((_, i) => (
              <div key={i} className="morph [grid-area:1/1]" data-on={active === i} aria-hidden={active !== i}>
                {scaled(i, active === i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Guard({ data }: { data: LandingData }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: false, margin: "-15% 0px -15% 0px" });
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
        <div ref={ref} className="land-stage px-3 py-8 sm:px-12 sm:py-12">
          <div className="mx-auto max-w-[680px]">
            <Scaled width={680} height={452}>
              <GuardMock active={on} data={data} />
            </Scaled>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function BeforeAfter({ data }: { data: LandingData }) {
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
        <div className="land-stage grid items-center gap-4 p-4 sm:grid-cols-[1fr_auto_1fr] sm:p-8">
          <figure>
            <ReferenceMock alt="Referința: o postare pentru ceai rece, cu o cămilă" />
            <figcaption className="mt-3 text-center text-sm text-ink-2">Referința văzută pe un site</figcaption>
          </figure>
          <svg width="40" height="24" viewBox="0 0 40 24" className="mx-auto rotate-90 text-coral sm:rotate-0" aria-hidden>
            <path d="M2 12h34M26 3l10 9-10 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <figure>
            <AfterMock data={data} />
            <figcaption className="mt-3 text-center text-sm text-ink-2">
              {brand.mascot?.name ?? "Mascota"}, pe marca {brand.name}
            </figcaption>
          </figure>
        </div>
      </Reveal>
    </section>
  );
}

function CritiqueSection() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { once: false, margin: "-15% 0px -15% 0px" });
  return (
    <section id="critica" className="scroll-mt-24 px-4 pt-36 pb-14">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Ribbon>Critica</Ribbon>
        <h2 className="mt-6 text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.04em] whitespace-pre-line text-ink sm:text-[3.2rem]">
          <Accent text={"Ochi de uliu\n*pe pagina ta.*"} />
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[1.08rem] leading-relaxed text-ink-2">
          Alegi „Critică pagina”, iar uliul aterizează pe ce merită schimbat și îți spune pe rând ce poți face. Regulile rulează local și găsesc contrast slab, linkuri vagi, poze fără descriere. O captură a ecranului merge la AI, pentru o părere despre ierarhie și mesaj, marcată ca atare. Vezi cel mult {MAX_CRITIQUES} observații, iar gustul rămâne treaba ta.
        </p>
      </Reveal>
      <Reveal delay={120} className="mx-auto mt-12 max-w-4xl">
        <div ref={ref}>
          <CritiqueMock active={on} />
        </div>
        <p className="mt-4 text-center text-sm text-ink-2">Pagina e de demo. Textele din balon le scriu aceleași reguli ca în extensie.</p>
      </Reveal>
    </section>
  );
}

function ExtensionSection() {
  const action = installAction();
  return (
    <section id="extensie" className="scroll-mt-24 px-4 pt-14 pb-36">
      <Reveal className="mx-auto max-w-3xl text-center">
        <Ribbon>Extensia</Ribbon>
        <h2 className="mt-6 text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.04em] whitespace-pre-line text-ink sm:text-[3.2rem]">
          <Accent text={"Ce te inSPIRĂ pe net\n*ajunge pe marca ta.*"} />
        </h2>
      </Reveal>
      <Reveal delay={120} className="land-frame mx-auto mt-10 max-w-xl p-7 text-center sm:p-10">
        <img src="/landing/hawk-mark.svg" alt="" className="mx-auto h-16 w-16" />
        <h3 className="mt-3 text-[1.6rem] font-semibold tracking-[-0.03em] text-ink">{S.app.name}</h3>
        <p className="mt-2 text-[1.05rem] leading-relaxed text-ink-2">Uliul apare peste site-ul deschis. Îi ceri o critică a paginii sau o campanie în stilul ei, pe marca ta.</p>
        <p className="mt-2 text-[0.95rem] text-ink-2">Nimic nu rulează până nu apeși iconița.</p>
        {/* .btn fixează display-ul, deci ascunderea pe telefon stă pe un înveliș */}
        <div className="mt-6 hidden md:block">
          {action.kind === "download" ? (
            <>
              <a href={action.href} download className="btn btn-story btn-secondary">{action.label}</a>
              <p className="mt-3 text-sm text-ink-2">{action.hint}</p>
            </>
          ) : (
            <a href={action.href} target="_blank" rel="noreferrer" className="btn btn-story btn-secondary">{action.label}</a>
          )}
        </div>
        <div className="mt-6 md:hidden">
          <p className="text-[1rem] font-medium text-ink">Extensia se instalează pe calculator, în Chrome</p>
          <Link href="/nou" className="mt-2 inline-block text-[1rem] text-coral-deep underline underline-offset-4">Încearcă Spire în browser</Link>
        </div>
      </Reveal>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative isolate -mt-px overflow-hidden px-4 pt-32 pb-40 text-center">
      <img src="/landing/dusk.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      {/* apusul iese din lila secțiunii de deasupra, fără margine */}
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#d0bfe8] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-b from-transparent to-cream" />
      <Ribbon>reSPIRĂ</Ribbon>
      <WordsIn text="N-ai designer azi?" className="mx-auto mt-6 max-w-3xl text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.045em] text-ink sm:text-[4rem]" />
      <Reveal delay={300}>
        <p className="text-[2.6rem] leading-[1.05] tracking-[-0.03em] sm:text-[4rem]">
          <span className="accent-serif">Spire e aici.</span>
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/acasa" className="btn btn-story btn-primary">Încearcă acum</Link>
          <Link href="/campanii" className="btn btn-story btn-secondary">Vezi un exemplu</Link>
          <a href="#extensie" className="btn btn-story btn-secondary">Vezi extensia</a>
        </div>
      </Reveal>
    </section>
  );
}

// subsolul are lista lui: meniul aplicației (scenariul) nu mai conține „Campanie nouă”, iar textele de aici nu se schimbă
const FOOTER_NAV = [
  { href: "/nou", label: "Campanie nouă" },
  { href: "/campanii", label: "Campanii" },
  { href: "/marca", label: "Marca" },
];

function Footer() {
  return (
    <footer className="bg-cream px-4 pt-6 pb-12 text-center">
      <Logo className="text-[1.6rem]" />
      <nav className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[0.95rem] text-ink-2" aria-label="Subsol">
        {FOOTER_NAV.map((n) => (
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
  const data = useLandingData();
  return (
    <div className="bg-cream">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks data={data} />
        <Guard data={data} />
        <BeforeAfter data={data} />
        <div className="land-dawn -mt-px">
          <CritiqueSection />
          <ExtensionSection />
        </div>
        <Closing />
      </main>
      <Footer />
    </div>
  );
}
