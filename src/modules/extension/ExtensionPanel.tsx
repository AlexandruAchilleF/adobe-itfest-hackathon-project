// Panoul Spire din extensie: uliul cu balonul lui, butonul „Scanează pagina” și ce a găsit.
// Se montează în /nou?din=extensie (iframe-ul de 420 px din chrome-extension/content.js).
// Un singur desen pentru web și extensie: MascotFigure, cu aceleași stări (aici și „searching”).
//
// Drumul: clic → spire:scan spre pagină → Spire caută cu lupa (cel puțin SCAN_MIN_MS) →
// spire:page → campaignCandidates (reguli deterministe) → spire:picks înapoi, chenarele se aprind.
// Ce spune Spire se calculează din alegeri și numărători, nu e scris de AI.

import { useEffect, useRef, useState } from "react";
import { Button, Card, Tag } from "../../components/ui";
import { type CampaignPick, campaignCandidates } from "../../lib/campaign";
import { type ExtensionMessage, isFromExtension, parseExtensionMessage } from "../../lib/extensionBridge";
import { estimateViewport, foundSentence, KIND_LABEL, picksReply, readSentence, revealDelay, SCAN_TIMEOUT_MS, scanRequest } from "../../lib/extensionPanel";
import type { MascotMood } from "../mascot/mascot";
import { MASCOT_NAME, MascotFigure } from "../mascot/MascotFigure";

type ReferenceMessage = Extract<ExtensionMessage, { type: "spire:reference" }>;

type View =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "found"; picks: CampaignPick[]; read: string }
  | { phase: "timeout" }
  | { phase: "reference"; image: string };

const NO_REPLY = "Nu primesc nimic de la pagină. Închide Spire și deschide-l din nou.";

function moodOf(view: View): MascotMood {
  if (view.phase === "scanning") return "searching";
  if (view.phase === "reference") return "thinking";
  if (view.phase === "timeout") return "worried";
  if (view.phase === "found") return view.picks.length ? "happy" : "worried";
  return "idle";
}

function messageOf(view: View): string {
  if (view.phase === "scanning") return "Mă uit pe pagină…";
  if (view.phase === "reference") return "Am primit decupajul. Mă uit la el.";
  if (view.phase === "timeout") return NO_REPLY;
  if (view.phase === "found") return foundSentence(view.picks);
  return `Sunt ${MASCOT_NAME}. Apasă pe „Scanează pagina” și mă uit pe site-ul tău.`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Spre pagina gazdă (content.js). Ținta e „*”: gazda poate fi orice site, deci originea ei nu e
 * cunoscută dinainte. Mesajele de aici (cererea de scanare, alegerile cu id-uri și motive) nu conțin
 * date private; content.js verifică la primire originea aplicației și că vin din iframe-ul lui.
 */
function toHost(msg: { type: string }) {
  if (window.parent !== window) window.parent.postMessage(msg, "*");
}

export function ExtensionPanel({ onReference }: { onReference?: (msg: ReferenceMessage) => void }) {
  const [view, setView] = useState<View>({ phase: "idle" });
  const startedAt = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const onReferenceRef = useRef(onReference);
  onReferenceRef.current = onReference;

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Mesajele de la extensie: doar de la fereastra părinte, cu ?din=extensie, și doar cele valide.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isFromExtension(event, window)) return;
      const msg = parseExtensionMessage(event.data);
      if (!msg) return;

      if (msg.type === "spire:page") {
        clearTimers(); // a venit răspunsul: fără „nu primesc nimic”
        const picks = campaignCandidates(msg.elements, estimateViewport(msg.elements));
        const read = readSentence(msg.page, msg.elements.length);
        const delay = startedAt.current === null ? 0 : revealDelay(startedAt.current, Date.now());
        // Lupa stă cel puțin SCAN_MIN_MS; chenarele se aprind odată cu răspunsul lui Spire.
        later(() => {
          startedAt.current = null;
          toHost(picksReply(picks));
          setView({ phase: "found", picks, read });
        }, delay);
      } else if (msg.type === "spire:reference") {
        clearTimers();
        startedAt.current = null;
        setView({ phase: "reference", image: msg.image });
        onReferenceRef.current?.(msg);
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimers();
    };
  }, []);

  function scan() {
    clearTimers();
    startedAt.current = Date.now();
    setView({ phase: "scanning" });
    toHost(scanRequest());
    later(() => {
      startedAt.current = null;
      setView({ phase: "timeout" });
    }, SCAN_TIMEOUT_MS);
  }

  const mood = moodOf(view);
  const scanning = view.phase === "scanning";
  const first = view.phase === "idle" || scanning;

  return (
    <div className="w-full max-w-[420px] min-w-0 overflow-x-hidden p-4 font-sans text-ink" data-testid="extension-panel" data-mood={mood}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <MascotFigure mood={mood} size={104} />
        </div>
        <div
          className="mt-3 min-w-0 flex-1 break-words rounded-[22px] rounded-tl-md bg-card px-4 py-3 text-sm text-ink shadow-[0_18px_40px_-20px_rgb(28_26_94/0.35)] ring-1 ring-line"
          role="status"
          aria-live="polite"
        >
          <b className="block text-xs font-medium text-muted">{MASCOT_NAME}</b>
          {messageOf(view)}
        </div>
      </div>

      <div className="mt-4">
        <Button variant={first ? "primary" : "secondary"} className="w-full" onClick={scan} disabled={scanning} aria-busy={scanning}>
          {first ? "Scanează pagina" : "Scanează din nou"}
        </Button>
      </div>

      {view.phase === "found" && (
        <div className="mt-4 space-y-3">
          {view.picks.length > 0 && (
            <Card title="Ce am găsit" className="!p-4">
              <ul className="space-y-3">
                {view.picks.map((p, i) => (
                  <li key={p.elementId} className="min-w-0">
                    <Tag tone={i}>{capitalize(KIND_LABEL[p.kind])}</Tag>
                    <p className="mt-1 text-sm leading-snug text-ink-2">{p.reason}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <p className="text-[13px] text-muted">{view.read}</p>
          {view.picks.length > 0 && <p className="text-sm text-ink-2">Apasă pe un chenar sau pe „Decupează” ca să alegi stilul.</p>}
        </div>
      )}

      {view.phase === "reference" && (
        <Card title="Decupajul" className="mt-4 !p-4">
          <img src={view.image} alt="Decupajul trimis din pagină" className="max-h-48 max-w-full rounded-lg ring-1 ring-line" />
        </Card>
      )}
    </div>
  );
}
