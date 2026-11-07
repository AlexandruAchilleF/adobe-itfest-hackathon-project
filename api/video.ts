// POST /api/video pornește un job, GET /api/video?id=<jobId> îi spune starea. Azi doar în mock.
import { preflight } from "../server/ai.js";
import { handleVideoCreate, handleVideoStatus } from "../server/media.js";

export function POST(request: Request): Promise<Response> {
  return handleVideoCreate(request);
}

export function GET(request: Request): Response {
  return handleVideoStatus(request);
}

/** Preflight CORS, ca la /api/ai. */
export function OPTIONS(request: Request): Response {
  return preflight(request);
}
