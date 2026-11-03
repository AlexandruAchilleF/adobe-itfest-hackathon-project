export interface GeoResult {
  lat: number;
  lng: number;
  label: string;
}

const cache = new Map<string, GeoResult | null>();
let last = 0;

export async function geocode(q: string): Promise<GeoResult | null> {
  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const wait = Math.max(0, last + 1100 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ro&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": process.env.GEOCODER_USER_AGENT || "hackathon-template-itfest/1.0", "accept-language": "ro" },
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    const result = hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name } : null;
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}
