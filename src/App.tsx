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
import { mainNav, showMascot, teamNav } from "./scenario/nav";
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

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-[1100] border-b print:hidden border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/" className="font-bold tracking-tight">
            {import.meta.env.VITE_APP_NAME || S.app.name}
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {MAIN_NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-lg px-2 py-1 ${location === n.href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}>
                {n.label}
              </Link>
            ))}
            {TEAM_NAV.length > 0 && (
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-lg px-2 py-1 text-xs text-slate-500 hover:text-white">Pentru echipă ▾</summary>
                <div className="absolute left-0 z-[1300] mt-1 flex w-48 flex-col rounded-xl border border-slate-800 bg-slate-950 p-1 shadow-xl">
                  {TEAM_NAV.map((n) => (
                    <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-1.5 ${location === n.href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}>
                      {n.label}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <RoleSwitcher />
            <RecordButton />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400" title="AI simulat — merge fără internet și fără chei">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => {
                  setDemoMode(e.target.checked);
                  setDemo(e.target.checked);
                }}
              />
              Mod demo
              {ai && <Pill ok={demo ? null : ai.active !== "mock"}>AI: {demo ? "mock" : ai.active}</Pill>}
            </label>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:p-0">
        <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/" component={ScenarioHome} />
          <Route path="/start">
            <HomePage status={status} />
          </Route>
          <Route path="/docs" component={DocsPage} />
          <Route path="/design" component={DesignPage} />
          <Route path="/assistant" component={AssistantPage} />
          <Route path="/harta" component={BoardPage} />
          <Route path="/profil" component={ProfilePage} />
          <Route path="/clasament" component={LeaderboardPage} />
          <Route path="/map">
            <Redirect to="/harta" />
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
      {showMascot(S, location) && <MascotDock routes={[{ href: "/", label: "Start" }, ...NAV_GROUPS.flatMap((g) => g.items)]} />}
    </div>
  );
}
