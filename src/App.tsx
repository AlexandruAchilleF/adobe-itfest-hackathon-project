import { useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import type { HealthResponse } from "../shared/ai-contract";
import { Pill } from "./components/ui";
import { aiHealth } from "./lib/ai";
import { isDemoMode, setDemoMode } from "./lib/demoMode";
import { supabase } from "./lib/supabase";
import { adobeClientId } from "./modules/adobe/AdobePdfViewer";
import { AiPage } from "./pages/AiPage";
import { CameraPage } from "./pages/CameraPage";
import { CanvasPage } from "./pages/CanvasPage";
import { HomePage } from "./pages/HomePage";
import { PdfPage } from "./pages/PdfPage";
import { PipelinePage } from "./pages/PipelinePage";
import { RoomPage } from "./pages/RoomPage";
import { ViewPage } from "./pages/ViewPage";
import { VoicePage } from "./pages/VoicePage";

export const NAV = [
  { href: "/pipeline", label: "Flux complet" },
  { href: "/camera", label: "Cameră + gesturi" },
  { href: "/voice", label: "Voce" },
  { href: "/ai", label: "AI structurat" },
  { href: "/canvas", label: "Design editabil" },
  { href: "/room", label: "Multiplayer" },
  { href: "/pdf", label: "Adobe PDF" },
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

  const status: AppStatus = { ai, supabase: Boolean(supabase), adobePdf: Boolean(adobeClientId), demo };
  const bare = location.startsWith("/view");

  if (bare) return <ViewPage />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-bold tracking-tight">
            ⚡ Hackathon Template
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-2.5 py-1.5 ${location === n.href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-slate-400" title="AI simulat — merge fără internet și fără chei">
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
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Switch>
          <Route path="/">
            <HomePage status={status} />
          </Route>
          <Route path="/pipeline" component={PipelinePage} />
          <Route path="/camera" component={CameraPage} />
          <Route path="/voice" component={VoicePage} />
          <Route path="/ai" component={AiPage} />
          <Route path="/canvas" component={CanvasPage} />
          <Route path="/room" component={RoomPage} />
          <Route path="/pdf" component={PdfPage} />
          <Route>
            <p className="text-slate-400">Pagina nu există.</p>
          </Route>
        </Switch>
      </main>
    </div>
  );
}
