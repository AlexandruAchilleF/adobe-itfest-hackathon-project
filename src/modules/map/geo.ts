// Utilitare geo: distanță, geocodare prin /api/geocode, centru implicit.
export interface LatLng {
  lat: number;
  lng: number;
}

export const BUCHAREST: LatLng = { lat: 44.4268, lng: 26.1025 };

/** Distanța în km între două puncte (formula haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Adresă → coordonate. Întoarce null dacă nu găsește (sau fără internet). */
export async function geocode(q: string): Promise<(LatLng & { label: string }) | null> {
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Locația curentă din browser (cere permisiunea). null dacă e refuzată, lipsește sau durează prea mult. */
export function currentPosition(timeoutMs = 8000): Promise<(LatLng & { accuracy: number }) | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
