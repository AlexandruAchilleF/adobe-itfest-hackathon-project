// POST /api/logo generează simbolul mărcii. Azi doar în mock.
import { preflight } from "../server/ai.js";
import { handleLogo } from "../server/media.js";

export function POST(request: Request): Promise<Response> {
  return handleLogo(request);
}

/** Preflight CORS, ca la /api/ai. */
export function OPTIONS(request: Request): Response {
  return preflight(request);
}
