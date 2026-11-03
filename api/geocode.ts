// GET /api/geocode?q=Calea Moșilor 120, București → { lat, lng, label } sau 404.
// Folosește Nominatim (OpenStreetMap), gratuit, fără cheie. Politica lor cere un User-Agent
// propriu și max ~1 cerere/secundă, deci rezultatele sunt ținute în cache în memorie.
import { geocode } from "../server/geocode.js";

export async function GET(request: Request): Promise<Response> {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return Response.json({ error: "Lipsește parametrul q." }, { status: 400 });
  const result = await geocode(q);
  return result ? Response.json(result) : Response.json({ error: "Adresa nu a fost găsită." }, { status: 404 });
}
