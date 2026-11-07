// POST /api/image — generează ilustrația; rulează pe Vercel și local prin pluginul din vite.config.ts.
import { preflight } from "../server/ai.js";
import { handleImage } from "../server/image.js";

export function POST(request: Request): Promise<Response> {
  return handleImage(request);
}

/** Preflight CORS, ca la /api/ai. */
export function OPTIONS(request: Request): Response {
  return preflight(request);
}
