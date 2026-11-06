import { type ComponentType, lazy, Suspense, useEffect, useState } from "react";
import { Link, Redirect, Route, Switch, useLocation } from "wouter";
import type { HealthResponse } from "../shared/ai-contract";
import { Pill } from "./components/ui";
import { aiHealth } from "./lib/ai";
import { isDemoMode, setDemoMode } from "./lib/demoMode";
import { supabase } from "./lib/supabase";
import { adobeClientId } from "./modules/adobe/AdobePdfViewer";
import { RecordButton } from "./modules/demo/RecordButton";
import { MascotDock } from "./modules/mascot/MascotDock";
import { HomePage } from "./pages/HomePage";
import { ScenarioHome } from "./pages/ScenarioHome";
import { scenario } from "./scenario/config";
import { mainNav, pitchMode, showMascot, teamNav } from "./scenario/nav";
import { RoleSwitcher } from "./scenario/ui/RoleSwitcher";
import { LiveProvider } from "./lib/live";
import { outbox, people, reports, requests } from "./scenario/model";

// Fiecare pagină se încarcă doar când e deschisă (pdf.js, harta și Fabric sunt mari),
// ca pagina de sondaj de pe telefon să pornească repede.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const AiPage = page(() => import("./pages/AiPage"), "AiPage");
const AssistantPage = page(() => import("./pages/AssistantPage"), "AssistantPage");
const BusinessPage = page(() => import("./pages/BusinessPage"), "BusinessPage");
const DesignPage = page(() => import("./pages/DesignPage"), "DesignPage");
const DocsPage = page(() => import("./pages/DocsPage"), "DocsPage");
const BoardPage = page(() => import("./pages/BoardPage"), "BoardPage");
const ProfilePage = page(() => import("./pages/ProfilePage"), "ProfilePage");
const LeaderboardPage = page(() => import("./pages/LeaderboardPage"), "LeaderboardPage");
const ProcessPage = page(() => import("./pages/ProcessPage"), "ProcessPage");
const RecordPage = page(() => import("./pages/RecordPage"), "RecordPage");
const SurveyPage = page(() => import("./pages/SurveyPage"), "SurveyPage");
const SurveyRespondPage = page(() => import("./pages/SurveyRespondPage"), "SurveyRespondPage");
const ViewPage = page(() => import("./pages/ViewPage"), "ViewPage");
const ReportPage = page(() => import("./pages/ReportPage"), "ReportPage");
const ConfirmPage = page(() => import("./pages/ConfirmPage"), "ConfirmPage");
const Loading = () => <p className="p-6 text-sm text-slate-500">Se încarcă…</p>;

const S = scenario;

// Meniul vine din scenariu (src/scenario/nav.ts): un singur drum pentru juriu. Restul (validare,
// rețetele vechi, ghidul template-ului) stă la „Pentru echipă” și dispare cu features.optionalModules = false.
const MAIN_NAV = mainNav(S);
const TEAM_NAV = teamNav(S);
export const NAV_GROUPS = [{ label: "", items: MAIN_NAV }, ...(TEAM_NAV.length ? [{ label: "Pentru echipă", items: TEAM_NAV }] : [])];

/** Paginile deschise pe telefon din QR: fără meniu. */
const BARE: Array<[string, ComponentType]> = [
  ["/view", ViewPage],
  ["/s", SurveyRespondPage],
  ["/raport", ReportPage],
  ["/c", ConfirmPage],
];

export interface AppStatus {
  ai: HealthResponse | null;
  supabase: boolean;
  adobePdf: boolean;
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
  const [demo, setDemo] = useState(isDemoMode);
  const [ai, setAi] = useState<HealthResponse | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    void aiHealth().then(setAi);
  }, []);

  const bare = BARE.find(([path]) => location === path || location.startsWith(`${path}/`));
  if (bare) {
    const Page = bare[1];
    return (
      <Suspense fallback={<Loading />}>
        <Page />
      </Suspense>
    );
  }
  const status: AppStatus = { ai, supabase: Boolean(supabase), adobePdf: Boolean(adobeClientId), demo };
  const linkClass = (href: string) => `rounded-full px-3 py-1.5 transition-colors ${location === href ? "bg-paper-2 text-ink" : "text-ink-2 hover:text-coral-deep"}`;
  const navLinks = (
    <>
      {MAIN_NAV.map((n) => (
        <Link key={n.href} href={n.href} className={linkClass(n.href)}>
          {n.label}
        </Link>
      ))}
      {TEAM_NAV.length > 0 && (
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full px-3 py-1.5 text-sm text-muted hover:text-coral-deep">Pentru echipă ▾</summary>
          <div className="card absolute left-0 z-[1300] mt-2 flex w-52 flex-col p-1.5">
            {TEAM_NAV.map((n) => (
              <Link key={n.href} href={n.href} className={linkClass(n.href)}>
                {n.label}
              </Link>
            ))}
          </div>
        </details>
      )}
    </>
  );
  const teamTools = pitchMode(S) ? null : (
    <>
      <RecordButton />
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted" title="AI simulat — merge fără internet și fără chei">
        <input
          type="checkbox"
          className="accent-coral"
          checked={demo}
          onChange={(e) => {
            setDemoMode(e.target.checked);
            setDemo(e.target.checked);
          }}
        />
        Mod demo
        {ai && <Pill ok={demo ? null : ai.active !== "mock"}>AI: {demo ? "mock" : ai.active}</Pill>}
      </label>
    </>
  );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-[1100] px-3 pt-3 print:hidden">
        <div className="mx-auto max-w-6xl rounded-[26px] bg-card/95 px-3 py-2 shadow-[0_0_0_6px_rgb(255_255_255/0.55),0_16px_36px_-22px_rgb(28_26_94/0.35)] ring-1 ring-line backdrop-blur sm:px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 px-2 text-[1.15rem] font-semibold tracking-[-0.04em] text-ink">
              {import.meta.env.VITE_APP_NAME || S.app.name}
            </Link>
            <nav className="hidden items-center gap-1 text-[0.92rem] lg:flex">{navLinks}</nav>
            <div className="ml-auto flex items-center gap-2">
              <RoleSwitcher />
              <div className="hidden items-center gap-2 lg:flex">{teamTools}</div>
              <button className="grid h-10 w-10 place-items-center rounded-xl text-ink hover:bg-paper-2 lg:hidden" onClick={() => setMenu((m) => !m)} aria-label="Meniu" aria-expanded={menu}>
                <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
                  <path d={menu ? "M3 1l14 12M17 1L3 13" : "M1 1h18M1 7h18M1 13h18"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
          {menu && (
            <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2 pb-1 lg:hidden" onClick={() => setMenu(false)}>
              {navLinks}
              <div className="mt-1 flex flex-wrap items-center gap-2 px-1">{teamTools}</div>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-10 pb-16 print:max-w-none print:p-0">
        <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/" component={ScenarioHome} />
          <Route path="/start">
            <HomePage status={status} />
          </Route>
          <Route path="/docs" component={DocsPage} />
          <Route path="/design" component={DesignPage} />
          <Route path="/assistant" component={AssistantPage} />
          <Route path="/cereri" component={BoardPage} />
          <Route path="/harta" component={BoardPage} />
          <Route path="/profil" component={ProfilePage} />
          <Route path="/clasament" component={LeaderboardPage} />
          <Route path="/cronometru" component={ProcessPage} />
          <Route path="/fisa/:id" component={RecordPage} />
          <Route path="/map">
            <Redirect to="/cereri" />
          </Route>
          <Route path="/business" component={BusinessPage} />
          <Route path="/survey" component={SurveyPage} />
          <Route path="/ai" component={AiPage} />
          <Route>
            <p className="text-slate-400">Pagina nu există.</p>
          </Route>
        </Switch>
        </Suspense>
      </main>
      {/* pe prima pagină mascota e deja în cer, mare; nu o dublăm în colț */}
      {showMascot(S, location) && location !== "/" && <MascotDock routes={[{ href: "/", label: "Start" }, ...NAV_GROUPS.flatMap((g) => g.items)]} />}
    </div>
  );
}
