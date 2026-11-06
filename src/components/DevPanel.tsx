// Uneltele echipei, ascunse de juriu: apar doar cu ?dev=1 (rămân pornite în browserul ăsta până la ?dev=0).
// Aici stau înregistrarea video, modul demo (AI simulat), starea AI, resetarea datelor și paginile „Pentru echipă”.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import type { HealthResponse } from "../../shared/ai-contract";
import { aiHealth } from "../lib/ai";
import { isDemoMode, setDemoMode } from "../lib/demoMode";
import { useCollection } from "../lib/store";
import { RecordButton } from "../modules/demo/RecordButton";
import { outbox, reports, requests } from "../scenario/model";
import { TEAM_NAV } from "../scenario/nav";
import { Pill } from "./ui";

const KEY = "hackathon:dev";

/** ?dev=1 pornește uneltele echipei, ?dev=0 le oprește; altfel rămâne ce era. */
export function isDevMode(): boolean {
  try {
    const param = new URLSearchParams(location.search).get("dev");
    if (param === "1") localStorage.setItem(KEY, "1");
    if (param === "0") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function DevPanel() {
  const [open, setOpen] = useState(true);
  const [demo, setDemo] = useState(isDemoMode);
  const [ai, setAi] = useState<HealthResponse | null>(null);
  const req = useCollection(requests);
  const rep = useCollection(reports);
  const sent = useCollection(outbox);
  useEffect(() => {
    void aiHealth().then(setAi);
  }, []);

  return (
    <aside className="fixed bottom-3 left-3 z-[1250] w-[248px] rounded-xl bg-ink text-sm text-white shadow-[0_12px_32px_-12px_rgb(0_0_0/0.5)] print:hidden" aria-label="Unelte pentru echipă">
      <button className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-white/80" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Unelte pentru echipă
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/10 px-3 pt-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs" title="AI simulat: merge fără internet și fără chei">
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
            </label>
            {ai && <Pill ok={demo ? null : ai.active !== "mock"}>AI: {demo ? "mock" : ai.active}</Pill>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RecordButton />
            <button className="rounded-md bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20" onClick={() => void Promise.all([req.reset(), rep.reset(), sent.reset()])}>
              Resetează datele demo
            </button>
          </div>
          <nav className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-white/80">
            {TEAM_NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-white hover:underline">
                {n.label}
              </Link>
            ))}
          </nav>
          <p className="text-[0.7rem] leading-snug text-white/60">Ascunde cu ?dev=0 înainte de pitch.</p>
        </div>
      )}
    </aside>
  );
}
