// GET /api/health — ce furnizor AI e activ (fără să expună cheile).
import { health } from "../server/ai.js";

export function GET(): Response {
  return Response.json(health());
}
