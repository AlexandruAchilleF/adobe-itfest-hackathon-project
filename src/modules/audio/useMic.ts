// Microfonul ca senzor: volum, notă cântată, bătăi din palme, benzi bass/mid/treble.
//
//   const mic = useMic({ onClap: () => nextSlide() });
//   <button onClick={mic.start}>Pornește microfonul</button>   // cere un click (politica browserelor)
//   mic.level, mic.note?.name

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitch, frequencyBands, noteFromFrequency, OnsetDetector, rms } from "./analysis";

export interface MicFrame {
  level: number;
  pitch: number | null;
  note: ReturnType<typeof noteFromFrequency> | null;
  bands: { bass: number; mid: number; treble: number };
  /** date brute pentru vizualizări */
  waveform: Float32Array;
  spectrum: Uint8Array;
}

interface Options {
  onClap?: () => void;
  onFrame?: (frame: MicFrame) => void;
  /** dezactivează detecția de înălțime (economisește CPU) */
  pitch?: boolean;
}

export function useMic(options: Options = {}) {
  const cb = useRef(options);
  cb.current = options;
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<Omit<MicFrame, "waveform" | "spectrum"> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const frameRef = useRef<MicFrame | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    ctxRef.current = null;
    streamRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      ctxRef.current = ctx;
      streamRef.current = stream;
      setStatus("running");
      setError(null);

      const wave = new Float32Array(analyser.fftSize);
      const spec = new Uint8Array(analyser.frequencyBinCount);
      const onset = new OnsetDetector();
      let lastState = 0;
      const loop = () => {
        analyser.getFloatTimeDomainData(wave);
        analyser.getByteFrequencyData(spec);
        const now = performance.now();
        const level = rms(wave);
        const pitch = cb.current.pitch === false ? null : detectPitch(wave, ctx.sampleRate);
        const f: MicFrame = {
          level,
          pitch,
          note: pitch ? noteFromFrequency(pitch) : null,
          bands: frequencyBands(spec, ctx.sampleRate),
          waveform: wave,
          spectrum: spec,
        };
        frameRef.current = f;
        if (onset.push(level, now)) cb.current.onClap?.();
        cb.current.onFrame?.(f);
        if (now - lastState > 80) {
          lastState = now;
          setFrame({ level: f.level, pitch: f.pitch, note: f.note, bands: f.bands });
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      setError(
        (err as DOMException).name === "NotAllowedError"
          ? "Accesul la microfon a fost refuzat."
          : `Nu am putut porni microfonul: ${(err as Error).message}`,
      );
      setStatus("error");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { status, error, frame, frameRef, start, stop };
}
