// Hartă OpenStreetMap (Leaflet), fără cheie API. Puncte colorate, click = selecție.
//
//   <MapView points={[{ id, lat, lng, label, color }]} selectedId={id} onSelect={setId} />

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { BUCHAREST, type LatLng } from "./geo";

export interface MapPoint extends LatLng {
  id: string;
  label: string;
  color?: string;
  /** mărimea punctului (ex: urgența), 1..5 */
  weight?: number;
}

interface Props {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** punct suplimentar (ex: locația utilizatorului) */
  origin?: (LatLng & { label?: string }) | null;
  className?: string;
}

export function MapView({ points, selectedId, onSelect, origin, className = "h-[420px]" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([BUCHAREST.lat, BUCHAREST.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(m);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const p of points) {
      const selected = p.id === selectedId;
      L.circleMarker([p.lat, p.lng], {
        radius: 6 + (p.weight ?? 2) * 2 + (selected ? 4 : 0),
        color: selected ? "#ffffff" : "#0b1020",
        weight: selected ? 3 : 1,
        fillColor: p.color ?? "#f5a524",
        fillOpacity: 0.9,
      })
        .bindTooltip(p.label)
        .on("click", () => onSelectRef.current?.(p.id))
        .addTo(g);
    }
    if (origin) {
      L.circleMarker([origin.lat, origin.lng], { radius: 9, color: "#38bdf8", weight: 3, fillColor: "#38bdf8", fillOpacity: 0.4 })
        .bindTooltip(origin.label ?? "Tu")
        .addTo(g);
    }
    const all = [...points, ...(origin ? [origin] : [])];
    if (all.length) m.fitBounds(L.latLngBounds(all.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 15 });
  }, [points, selectedId, origin]);

  return <div ref={el} className={`overflow-hidden rounded-2xl ${className}`} data-testid="map" />;
}
