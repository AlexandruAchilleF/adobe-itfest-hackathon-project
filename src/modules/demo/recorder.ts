// Înregistrare video: ecranul (tab-ul), camera sau un <canvas>. Pentru video-ul
// de rezervă de la pitch și pentru „ia-ți clipul acasă".

export type RecordSource = { kind: "screen" } | { kind: "camera" } | { kind: "canvas"; canvas: HTMLCanvasElement; fps?: number };

export function pickMimeType(): string {
  const candidates = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export interface Recording {
  stop(): Promise<Blob>;
  stream: MediaStream;
}

export async function startRecording(source: RecordSource, { audio = true } = {}): Promise<Recording> {
  let stream: MediaStream;
  if (source.kind === "screen") {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio,
      // Chrome: propune direct tab-ul curent
      preferCurrentTab: true,
    } as DisplayMediaStreamOptions);
  } else if (source.kind === "camera") {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio });
  } else {
    stream = source.canvas.captureStream(source.fps ?? 30);
    if (audio) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {
        /* fără microfon: înregistrăm doar imaginea */
      }
    }
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.start(500);

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
    };
  });
  // dacă utilizatorul oprește partajarea din bara browserului
  stream.getVideoTracks()[0]?.addEventListener("ended", () => recorder.state !== "inactive" && recorder.stop());

  return {
    stream,
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      return done;
    },
  };
}

export function recordingFilename(blob: Blob, base = "demo"): string {
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  return `${base}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${ext}`;
}
