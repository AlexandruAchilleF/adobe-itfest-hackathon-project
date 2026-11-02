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
      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${state === "recording" ? "animate-pulse bg-rose-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white"}`}
    >
      {state === "recording" ? `■ ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "⏺ Rec"}
    </button>
  );
}
