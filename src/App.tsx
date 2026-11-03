import { type ComponentType, lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import type { HealthResponse } from "../shared/ai-contract";
import { Pill } from "./components/ui";
import { aiHealth } from "./lib/ai";
import { isDemoMode, setDemoMode } from "./lib/demoMode";
import { supabase } from "./lib/supabase";
import { adobeClientId } from "./modules/adobe/AdobePdfViewer";
import { RecordButton } from "./modules/demo/RecordButton";
import { HomePage } from "./pages/HomePage";

// Fiecare pagină se încarcă doar când e deschisă (pdf.js, harta și Fabric sunt mari),
// ca pagina de sondaj de pe telefon să pornească repede.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) =>
  lazy(() => load().then((m) => ({ default: m[name] })));
const AiPage = page(() => import("./pages/AiPage"), "AiPage");
const AssistantPage = page(() => import("./pages/AssistantPage"), "AssistantPage");
const BusinessPage = page(() => import("./pages/BusinessPage"), "BusinessPage");
const DesignPage = page(() => import("./pages/DesignPage"), "DesignPage");
const DocsPage = page(() => import("./pages/DocsPage"), "DocsPage");
const MapPage = page(() => import("./pages/MapPage"), "MapPage");
const SurveyPage = page(() => import("./pages/SurveyPage"), "SurveyPage");
const SurveyRespondPage = page(() => import("./pages/SurveyRespondPage"), "SurveyRespondPage");
const ViewPage = page(() => import("./pages/ViewPage"), "ViewPage");
const Loading = () => <p className="p-6 text-sm text-slate-500">Se încarcă…</p>;

export const NAV_GROUPS = [
  {
    label: "Validare",
    items: [
      { href: "/business", label: "Business canvas" },
      { href: "/survey", label: "Sondaj" },
    ],
  },
  {
    label: "Rețete",
    items: [
      { href: "/docs", label: "Documente" },
      { href: "/design", label: "Design editabil" },
      { href: "/assistant", label: "Asistent" },
      { href: "/map", label: "Hartă + potrivire" },
    ],
  },
  { label: "Unelte", items: [{ href: "/ai", label: "AI" }] },
];

/** Paginile deschise pe telefon din QR: fără meniu. */
const BARE: Array<[string, ComponentType]> = [
  ["/view", ViewPage],
  ["/s", SurveyRespondPage],
];

export interface AppStatus {
  ai: HealthResponse | null;
  supabase: boolean;
  adobePdf: boolean;
  demo: boolean;
}

export function App() {
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
            ⚡ {import.meta.env.VITE_APP_NAME || "Hackathon Template"}
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="flex items-center gap-0.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{g.label}</span>
                {g.items.map((n) => (
                  <Link key={n.href} href={n.href} className={`rounded-lg px-2 py-1 ${location === n.href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}>
                    {n.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
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
          <Route path="/">
            <HomePage status={status} />
          </Route>
          <Route path="/docs" component={DocsPage} />
          <Route path="/design" component={DesignPage} />
          <Route path="/assistant" component={AssistantPage} />
          <Route path="/map" component={MapPage} />
          <Route path="/business" component={BusinessPage} />
          <Route path="/survey" component={SurveyPage} />
          <Route path="/ai" component={AiPage} />
          <Route>
            <p className="text-slate-400">Pagina nu există.</p>
          </Route>
        </Switch>
        </Suspense>
      </main>
    </div>
  );
}
