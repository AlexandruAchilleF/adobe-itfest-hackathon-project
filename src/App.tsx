import { type ComponentType, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation, useSearch } from "wouter";
import type { HealthResponse } from "../shared/ai-contract";
import { Pill } from "./components/ui";
import { aiHealth } from "./lib/ai";
import { isDemoMode, setDemoMode } from "./lib/demoMode";
import { supabase } from "./lib/supabase";
import { adobeClientId } from "./modules/adobe/AdobePdfViewer";
import { Kiosk } from "./modules/demo/Kiosk";
import { LiveCounter } from "./modules/demo/LiveCounter";
import { RecordButton } from "./modules/demo/RecordButton";
import { AgentPage } from "./pages/AgentPage";
import { AiPage } from "./pages/AiPage";
import { BodyPage } from "./pages/BodyPage";
import { BusinessPage } from "./pages/BusinessPage";
import { CameraPage } from "./pages/CameraPage";
import { CanvasPage } from "./pages/CanvasPage";
import { ControllerPage } from "./pages/ControllerPage";
import { HomePage } from "./pages/HomePage";
import { PdfPage } from "./pages/PdfPage";
import { PipelinePage } from "./pages/PipelinePage";
import { RoomPage } from "./pages/RoomPage";
import { ScreenPage } from "./pages/ScreenPage";
import { SoundPage } from "./pages/SoundPage";
import { SurveyPage } from "./pages/SurveyPage";
import { SurveyRespondPage } from "./pages/SurveyRespondPage";
import { ViewPage } from "./pages/ViewPage";
import { VoicePage } from "./pages/VoicePage";

export const NAV_GROUPS = [
  {
    label: "Input",
    items: [
      { href: "/camera", label: "Mâini" },
      { href: "/body", label: "Față + corp" },
      { href: "/voice", label: "Voce" },
      { href: "/sound", label: "Sunet + hardware" },
      { href: "/screen", label: "Telefon-controller" },
    ],
  },
  {
    label: "AI",
    items: [
      { href: "/ai", label: "AI structurat" },
      { href: "/agent", label: "Comenzi vocale" },
    ],
  },
  {
    label: "Output",
    items: [
      { href: "/canvas", label: "Design editabil" },
      { href: "/pdf", label: "Adobe PDF" },
      { href: "/room", label: "Multiplayer" },
    ],
  },
  {
    label: "Pitch",
    items: [
      { href: "/business", label: "Business canvas" },
      { href: "/survey", label: "Sondaj validare" },
      { href: "/pipeline", label: "Flux complet" },
    ],
  },
];

/** Paginile deschise pe telefon din QR: fără meniu. */
const BARE: Array<[string, ComponentType]> = [
  ["/view", ViewPage],
  ["/controller", ControllerPage],
  ["/s", SurveyRespondPage],
];

export interface AppStatus {
  ai: HealthResponse | null;
  supabase: boolean;
  adobePdf: boolean;
  demo: boolean;
}

function Routes({ status }: { status: AppStatus }) {
  return (
    <Switch>
      <Route path="/">
        <HomePage status={status} />
      </Route>
      <Route path="/pipeline" component={PipelinePage} />
      <Route path="/camera" component={CameraPage} />
      <Route path="/body" component={BodyPage} />
      <Route path="/voice" component={VoicePage} />
      <Route path="/sound" component={SoundPage} />
      <Route path="/screen" component={ScreenPage} />
      <Route path="/ai" component={AiPage} />
      <Route path="/agent" component={AgentPage} />
      <Route path="/canvas" component={CanvasPage} />
      <Route path="/room" component={RoomPage} />
      <Route path="/pdf" component={PdfPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/survey" component={SurveyPage} />
      <Route>
        <p className="text-slate-400">Pagina nu există.</p>
      </Route>
    </Switch>
  );
}

export function App() {
  const [location] = useLocation();
  const search = useSearch();
  const kiosk = new URLSearchParams(search).get("kiosk") === "1";
  const [demo, setDemo] = useState(isDemoMode);
  const [ai, setAi] = useState<HealthResponse | null>(null);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    void aiHealth().then(setAi);
  }, []);

  const status: AppStatus = { ai, supabase: Boolean(supabase), adobePdf: Boolean(adobeClientId), demo };

  const bare = BARE.find(([path]) => location === path || location.startsWith(`${path}/`));
  if (bare) {
    const Page = bare[1];
    return <Page />;
  }

  // Mod kiosk (?kiosk=1): fără meniu, ecran de start, reset după inactivitate.
  if (kiosk) {
    return (
      <Kiosk title={import.meta.env.VITE_APP_NAME || "Încearcă!"} onReset={() => setResetKey((k) => k + 1)}>
        <div className="fixed right-4 top-4 z-40">
          <LiveCounter />
        </div>
        <main key={resetKey} className="mx-auto max-w-6xl px-4 py-8">
          <Routes status={status} />
        </main>
      </Kiosk>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/" className="font-bold tracking-tight">
            ⚡ Hackathon Template
          </Link>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="flex items-center gap-0.5">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{g.label}</span>
                {g.items.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`rounded-lg px-2 py-1 ${location === n.href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
                  >
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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes status={status} />
      </main>
    </div>
  );
}
