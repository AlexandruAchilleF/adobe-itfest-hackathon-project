// Contractul pentru /api/video și /api/logo. Azi ambele rulează doar în mock: niciun furnizor nu e legat.
import type { AiAttachment } from "./ai-contract.js";

export const VIDEO_ASPECTS = ["9:16", "1:1", "16:9"] as const;
export type VideoAspect = (typeof VIDEO_ASPECTS)[number];
export const MAX_VIDEO_SECONDS = 60;

/** Ce se întâmplă în mock: un rezultat (`url`) sau un eșec (`error`), după `afterMs`. */
export interface VideoMock {
  url?: string;
  error?: string;
  afterMs?: number;
}

/** POST /api/video */
export interface VideoRequest {
  prompt: string;
  aspect: VideoAspect;
  seconds: number;
  /** Cadrele-cheie în stilul referinței; corpul întreg rămâne sub 4 MB. */
  keyframes?: AiAttachment[];
  mock: VideoMock;
}

/** 202 la POST /api/video */
export interface VideoJobCreated {
  jobId: string;
  model: string;
}

/** 200 la GET /api/video?id=<jobId> */
export type VideoJob =
  | { status: "running"; progress?: number }
  | { status: "done"; url: string; model: string; ms: number }
  | { status: "failed"; error: string; hint?: string };

/** POST /api/logo: generează doar simbolul; numele mărcii îl adaugă codul, cu fontul mărcii. */
export interface LogoRequest {
  instruction: string;
  /** Pentru variante diferite: câte un apel cu alt `seed`. */
  seed?: number;
  mock: string;
}

/** 200 la POST /api/logo, aceeași formă ca la /api/image. */
export interface LogoResponse {
  image: string;
  model: string;
  ms: number;
}
