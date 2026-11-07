import { type ComponentType, lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import type { HealthResponse } from "../shared/ai-contract";
import { DevPanel, isDevMode } from "./components/DevPanel";
import { aiHealth } from "./lib/ai";
import { isDemoMode } from "./lib/demoMode";
import { supabase } from "./lib/supabase";
import { MascotDock } from "./modules/mascot/MascotDock";
import { HomePage } from "./pages/HomePage";
import { ScenarioHome } from "./pages/ScenarioHome";
import { scenario } from "./scenario/config";
import { mainNav, showMascot, teamNav } from "./scenario/nav";
import { RoleSwitcher } from "./scenario/ui/RoleSwitcher";
import { LiveProvider } from "./lib/live";
import { outbox, people, reports, requests } from "./scenario/model";

// Fiecare pagină se încarcă doar când e deschisă (Fabric e mare),
// ca pagina de sondaj de pe telefon să pornească repede.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const BusinessPage = page(() => import("./pages/BusinessPage"), "BusinessPage");
const SurveyPage = page(() => import("./pages/SurveyPage"), "SurveyPage");
const SurveyRespondPage = page(() => import("./pages/SurveyRespondPage"), "SurveyRespondPage");
const ViewPage = page(() => import("./pages/ViewPage"), "ViewPage");
const PitchPage = page(() => import("./pages/PitchPage"), "PitchPage");
const AcasaPage = page(() => import("./pages/spire/AcasaPage"), "AcasaPage");
const NewCampaignPage = page(() => import("./pages/spire/NewCampaignPage"), "NewCampaignPage");
const CampaignsPage = page(() => import("./pages/spire/CampaignsPage"), "CampaignsPage");
const CampaignPage = page(() => import("./pages/spire/CampaignPage"), "CampaignPage");
const BrandPage = page(() => import("./pages/spire/BrandPage"), "BrandPage");
const LandingPage = page(() => import("./pages/spire/LandingPage"), "LandingPage");
const Loading = () => <p className="p-6 text-sm text-muted">Se încarcă…</p>;

const S = scenario;

// Meniul vine din scenariu (src/scenario/nav.ts): un singur drum pentru juriu. Restul (validare,
// rețetele, ghidul template-ului) stă în panoul echipei, deschis cu ?dev=1 (src/components/DevPanel.tsx).
const MAIN_NAV = mainNav(S);
const TEAM_NAV = teamNav(S);
export const NAV_GROUPS = [{ label: "", items: MAIN_NAV }, ...(TEAM_NAV.length ? [{ label: "Pentru echipă", items: TEAM_NAV }] : [])];

/** Unde poate duce asistentul: meniul, plus „Campanie nouă”, care stă pe butonul din header. */
const MASCOT_ROUTES = [{ href: "/", label: "Start" }, { href: "/nou", label: "Campanie nouă" }, ...NAV_GROUPS.flatMap((g) => g.items)];

/** Paginile deschise pe telefon din QR și deck-ul de pitch: fără meniu. */
const BARE: Array<[string, ComponentType]> = [
  ["/view", ViewPage],
  ["/s", SurveyRespondPage],
  ["/pitch", PitchPage],
];

export interface AppStatus {
  ai: HealthResponse | null;
  supabase: boolean;
  demo: boolean;
}

const LIVE_COLLECTIONS = [requests.name, people.name, reports.name, outbox.name];

export function App() {
  useEffect(() => {
    document.title = import.meta.env.VITE_APP_NAME || S.app.name;
  }, []);
  return (
    <LiveProvider collections={LIVE_COLLECTIONS}>
      <Shell />
    </LiveProvider>
  );
}

function Shell() {
  const [location] = useLocation();
  const [dev] = useState(isDevMode);
  const [ai, setAi] = useState<HealthResponse | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    void aiHealth().then(setAi);
  }, []);
  useEffect(() => setMenu(false), [location]);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const onClick = (e: MouseEvent) => {
      if (!header.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [menu]);

  // în extensie, /nou e un panou îngust, fără meniu: Spire stă peste pagina omului
  if (location === "/nou" && new URLSearchParams(window.location.search).get("din") === "extensie") {
    return (
      <Suspense fallback={<Loading />}>
        <NewCampaignPage />
      </Suspense>
    );
  }
  // landing page-ul are navigația lui, plutitoare peste cer
  if (location === "/" && S.landing) {
    return (
      <Suspense fallback={<Loading />}>
        <LandingPage />
      </Suspense>
    );
  }
  const bare = BARE.find(([path]) => location === path || location.startsWith(`${path}/`));
  if (bare) {
    const Page = bare[1];
    return (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    );
  }
  const status: AppStatus = { ai, supabase: Boolean(supabase), demo: isDemoMode() };
  const home = location === "/";
  // pagina de lucru ține singură înălțimea ecranului
  const workPage = /^\/campanii\/[^/]+$/.test(location);
  const active = (href: string) => location === href || location.startsWith(`${href}/`);
  const navLinks = MAIN_NAV.map((n) => (
    <Link
      key={n.href}
      href={n.href}
      aria-current={active(n.href) ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-[0.95rem] transition-colors max-md:py-2.5 ${active(n.href) ? "bg-paper-2 font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
    >
      {n.label}
    </Link>
  ));

  return (
    <div className="min-h-dvh">
      {/* doar în Shell: landing-ul, deck-ul, paginile de telefon și panoul din extensie ies mai sus, fără fundal */}
      <div className="app-sky" data-testid="app-sky" aria-hidden />
      <header ref={header} className="sticky top-3 z-[1100] px-3 print:hidden sm:px-4">
        <div className="app-nav mx-auto flex h-14 max-w-6xl items-center gap-2 pr-2 pl-3 sm:gap-6 sm:pl-4">
          <Link href="/acasa" className="flex shrink-0 items-center gap-2 text-[1.1rem] font-semibold tracking-[-0.02em] text-ink">
            <img src="/landing/hawk-mark.svg" alt="" className="h-6 w-6" />
            {import.meta.env.VITE_APP_NAME || S.app.name}
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {navLinks}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {!S.nav && <RoleSwitcher />}
            {/* pe /nou butonul duce la pagina deschisă, deci coralul rămâne pe pasul din pagină */}
            <Link href="/nou" aria-current={location === "/nou" ? "page" : undefined} className={`btn whitespace-nowrap ${location === "/nou" ? "btn-secondary" : "btn-primary"}`}>
              Campanie nouă
            </Link>
            <button className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-paper-2 md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Meniu" aria-expanded={menu}>
              <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
                <path d={menu ? "M3 1l14 12M17 1L3 13" : "M1 1h18M1 7h18M1 13h18"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        {menu && (
          <nav className="app-nav mx-auto mt-2 flex max-w-6xl flex-col gap-0.5 p-2 md:hidden" aria-label="Principal">
            {navLinks}
          </nav>
        )}
      </header>
      <main className={home ? "print:p-0" : `mx-auto max-w-6xl px-4 print:max-w-none print:p-0 ${workPage ? "pt-4 pb-4 max-lg:pb-24" : "pt-7 pb-24"}`}>
        <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/" component={S.landing ? LandingPage : ScenarioHome} />
          <Route path="/acasa" component={AcasaPage} />
          <Route path="/nou" component={NewCampaignPage} />
          <Route path="/campanii" component={CampaignsPage} />
          <Route path="/campanii/:id" component={CampaignPage} />
          <Route path="/marca" component={BrandPage} />
          <Route path="/start">
            <HomePage status={status} />
          </Route>
          <Route path="/business" component={BusinessPage} />
          <Route path="/survey" component={SurveyPage} />
          <Route>
            <p className="text-muted">Pagina nu există.</p>
          </Route>
        </Switch>
        </Suspense>
      </main>
      {/* pe prima pagină asistentul nu apare: acolo vorbește povestea */}
      {showMascot(S, location) && !home && <MascotDock routes={MASCOT_ROUTES} />}
      {dev && <DevPanel />}
    </div>
  );
}
