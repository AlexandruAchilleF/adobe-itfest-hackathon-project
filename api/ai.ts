// POST /api/ai — rulează pe Vercel ca funcție serverless și local prin pluginul din vite.config.ts.
import { handleAi, preflight } from "../server/ai.js";

export function POST(request: Request): Promise<Response> {
  return handleAi(request);
}

/** Preflight CORS pentru add-on-ul Adobe Express. */
export function OPTIONS(request: Request): Response {
  return preflight(request);
}
