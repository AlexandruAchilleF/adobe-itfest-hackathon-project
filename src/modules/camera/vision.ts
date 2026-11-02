// Încarcă modelele MediaPipe o singură dată. Încearcă întâi fișierele locale
// (public/mediapipe, copiate la `npm install`), apoi CDN-ul.

import { FaceLandmarker, FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const LOCAL_WASM = "/mediapipe/wasm";
const CDN_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm";
const MODELS = {
  hand: {
    local: "/mediapipe/models/hand_landmarker.task",
    cdn: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  },
  face: {
    local: "/mediapipe/models/face_landmarker.task",
    cdn: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  },
};

async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok && !(res.headers.get("content-type") ?? "").includes("text/html");
  } catch {
    return false;
  }
}

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
function fileset() {
  filesetPromise ??= (async () => {
    const base = (await exists(`${LOCAL_WASM}/vision_wasm_internal.wasm`)) ? LOCAL_WASM : CDN_WASM;
    return FilesetResolver.forVisionTasks(base);
  })();
  return filesetPromise;
}

async function modelPath(kind: keyof typeof MODELS) {
  return (await exists(MODELS[kind].local)) ? MODELS[kind].local : MODELS[kind].cdn;
}

/** Încearcă GPU, iar dacă nu merge (unele laptopuri/VM-uri), trece pe CPU. */
async function withDelegate<T>(create: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await create("GPU");
  } catch (err) {
    console.warn("[vision] GPU indisponibil, folosesc CPU", err);
    return create("CPU");
  }
}

const handCache = new Map<number, Promise<HandLandmarker>>();
export function getHandLandmarker(numHands = 2): Promise<HandLandmarker> {
  let p = handCache.get(numHands);
  if (!p) {
    p = (async () => {
      const [fs, model] = await Promise.all([fileset(), modelPath("hand")]);
      return withDelegate((delegate) =>
        HandLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: model, delegate },
          runningMode: "VIDEO",
          numHands,
        }),
      );
    })();
    p.catch(() => handCache.delete(numHands));
    handCache.set(numHands, p);
  }
  return p;
}

let facePromise: Promise<FaceLandmarker> | null = null;
/** Față: 478 de puncte + blendshapes (zâmbet, clipit, sprâncene ridicate...). */
export function getFaceLandmarker(): Promise<FaceLandmarker> {
  facePromise ??= (async () => {
    const [fs, model] = await Promise.all([fileset(), modelPath("face")]);
    return withDelegate((delegate) =>
      FaceLandmarker.createFromOptions(fs, {
        baseOptions: { modelAssetPath: model, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      }),
    );
  })();
  facePromise.catch(() => (facePromise = null));
  return facePromise;
}
