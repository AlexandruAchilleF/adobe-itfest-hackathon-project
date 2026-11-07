import { type ComponentType, lazy, Suspense, useEffect, useState } from "react";
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

/** Semnul aplicației: un pătrat bleumarin cu un punct coral (înlocuiți-l cu logo-ul vostru). */
function Mark() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-md bg-ink" aria-hidden>
      <span className="h-2.5 w-2.5 rounded-[3px] bg-coral-bright" />
    </span>
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
  const active = (href: string) => location === href;
  const navLinks = MAIN_NAV.map((n) => (
    <Link
      key={n.href}
      href={n.href}
      aria-current={active(n.href) ? "page" : undefined}
      className={`flex items-center px-1 text-[0.95rem] transition-colors lg:h-full ${active(n.href) ? "font-medium text-ink lg:shadow-[inset_0_-2px_0_var(--color-ink)]" : "text-muted hover:text-ink"} max-lg:rounded-lg max-lg:px-3 max-lg:py-2.5`}
    >
      {n.label}
    </Link>
  ));

  return (
    <div className="min-h-dvh">
      <header className={`sticky top-0 z-[1100] print:hidden bg-white border-b border-line`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 text-[1.05rem] font-semibold text-ink">
            <Mark />
            {import.meta.env.VITE_APP_NAME || S.app.name}
          </Link>
          <nav className="hidden h-full items-stretch gap-6 lg:flex">{navLinks}</nav>
          <div className="ml-auto flex items-center gap-1">
            {!S.nav && <RoleSwitcher />}
            <button className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-paper-2 lg:hidden" onClick={() => setMenu((m) => !m)} aria-label="Meniu" aria-expanded={menu}>
              <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
                <path d={menu ? "M3 1l14 12M17 1L3 13" : "M1 1h18M1 7h18M1 13h18"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        {menu && <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 border-t border-line px-2 py-2 lg:hidden">{navLinks}</nav>}
      </header>
      <main className={home ? "print:p-0" : "mx-auto max-w-6xl px-4 pt-8 pb-24 print:max-w-none print:p-0"}>
        <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/" component={S.landing ? LandingPage : ScenarioHome} />
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
      {showMascot(S, location) && !home && <MascotDock routes={[{ href: "/", label: "Start" }, ...NAV_GROUPS.flatMap((g) => g.items)]} />}
      {dev && <DevPanel />}
    </div>
  );
}
