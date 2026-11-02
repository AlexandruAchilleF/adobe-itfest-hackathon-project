// Voce în browser, gratuit, fără chei API (Web Speech API).
// Recunoașterea merge cel mai bine în Chrome/Edge (trimite audio la serverele lor,
// deci cere internet). Pentru rezervă, oferă mereu și un câmp de text.

import { useCallback, useEffect, useRef, useState } from "react";

// Tipuri minimale: API-ul nu e încă în lib.dom pentru toate versiunile TS.
interface RecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<RecognitionResultItem> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechRecognitionSupported = () => typeof window !== "undefined" && recognitionCtor() !== null;

const ERRORS: Record<string, string> = {
  "not-allowed": "Accesul la microfon a fost refuzat.",
  "no-speech": "Nu am auzit nimic. Mai încearcă.",
  network: "Recunoașterea vocală are nevoie de internet.",
  "audio-capture": "Nu am găsit microfon.",
};

interface Options {
  lang?: string;
  /** true = ascultă până apeși stop; false = se oprește după o frază */
  continuous?: boolean;
  /** Apelat cu fiecare frază finală */
  onFinal?: (text: string) => void;
}

export function useSpeechRecognition({ lang = "ro-RO", continuous = false, onFinal }: Options = {}) {
  const recRef = useRef<Recognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const supported = speechRecognitionSupported();

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("Browserul nu suportă recunoaștere vocală. Folosește Chrome sau scrie textul.");
      return;
    }
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text).trim());
          onFinalRef.current?.(text.trim());
        } else {
          interimText += text;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? `Eroare microfon: ${e.error}`);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }, [lang, continuous]);

  useEffect(() => () => recRef.current?.abort(), []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset, setTranscript };
}

/** Citește textul cu voce tare. Returnează când s-a terminat. */
export function speak(text: string, { lang = "ro-RO", rate = 1, pitch = 1 } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
