import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus = "idle" | "starting" | "ready" | "error";

/** Pornește webcam-ul într-un <video>. Pe telefon, getUserMedia cere HTTPS (sau localhost). */
export function useCamera(options: { facingMode?: "user" | "environment"; width?: number; autoStart?: boolean } = {}) {
  const { facingMode = "user", width = 1280, autoStart = true } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // Fiecare start() primește un număr; un start mai vechi (ex: dublul montaj din
  // React StrictMode) își oprește singur stream-ul în loc să-l suprascrie pe cel nou.
  const attemptRef = useRef(0);

  const stop = useCallback(() => {
    attemptRef.current += 1;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browserul nu permite camera aici. Folosește Chrome și http://localhost sau HTTPS.");
      setStatus("error");
      return;
    }
    const attempt = ++attemptRef.current;
    setStatus("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: width } },
        audio: false,
      });
      if (attempt !== attemptRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        try {
          await video.play();
        } catch (playErr) {
          // „play() interrupted by a new load request" — inofensiv, alt start a preluat.
          if ((playErr as DOMException).name !== "AbortError") throw playErr;
        }
      }
      if (attempt === attemptRef.current) setStatus("ready");
    } catch (err) {
      if (attempt !== attemptRef.current) return;
      const name = (err as DOMException).name;
      setError(
        name === "NotAllowedError"
          ? "Accesul la cameră a fost refuzat. Permite-l din bara de adrese."
          : name === "NotFoundError"
            ? "Nu am găsit nicio cameră."
            : `Nu am putut porni camera: ${(err as Error).message}`,
      );
      setStatus("error");
    }
  }, [facingMode, width]);

  useEffect(() => {
    if (autoStart) void start();
    return stop;
  }, [autoStart, start, stop]);

  /** Captură JPEG (data URL) redimensionată — gata de trimis la ask({ files: [...] }). */
  const capture = useCallback((maxSize = 768, quality = 0.8): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  }, []);

  return { videoRef, status, error, start, stop, capture };
}
