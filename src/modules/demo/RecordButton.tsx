// Buton global: înregistrează tab-ul (cu sunet) → descarcă video. Pentru video-ul de rezervă.
import { useRef, useState } from "react";
import { downloadDataUrl } from "../../lib/share";
import { type Recording, recordingFilename, startRecording } from "./recorder";

export function RecordButton() {
  const rec = useRef<Recording | null>(null);
  const [state, setState] = useState<"idle" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function toggle() {
    if (state === "recording" && rec.current) {
      const blob = await rec.current.stop();
      rec.current = null;
      if (timer.current) clearInterval(timer.current);
      setState("idle");
      const url = URL.createObjectURL(blob);
      downloadDataUrl(url, recordingFilename(blob));
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return;
    }
    try {
      rec.current = await startRecording({ kind: "screen" });
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState("recording");
      rec.current.stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (rec.current) void toggle();
      });
    } catch {
      /* utilizatorul a anulat */
    }
  }

  return (
    <button
      onClick={toggle}
      title="Înregistrează ecranul (video de rezervă pentru pitch)"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ${state === "recording" ? "bg-coral text-white ring-coral" : "bg-paper-2 text-ink-2 ring-line hover:text-coral-deep"}`}
    >
      <span className={`h-2 w-2 rounded-full ${state === "recording" ? "animate-pulse bg-white" : "bg-coral"}`} aria-hidden />
      {state === "recording" ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Rec"}
    </button>
  );
}
