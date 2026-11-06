// Hartă Leaflet, fără cheie API: fundal OpenStreetMap, cu culorile atenuate din CSS
// (.leaflet-tile-pane în src/index.css) ca să se potrivească cu designul. Fără internet,
// punctele rămân pe un fundal simplu, cu mesaj. (CARTO cere acum cheie API: nu-l folosim.)
//
//   <MapView points={[{ id, lat, lng, label, color }]} selectedId={id} onSelect={setId} />
//
// Harta se recentrează doar când se schimbă setul de puncte (nu la fiecare randare a paginii),
// ca zoom-ul și mutarea făcute de om să nu fie anulate.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { BUCHAREST, boundsKey, type LatLng } from "./geo";

export interface MapPoint extends LatLng {
  id: string;
  label: string;
  color?: string;
  /** mărimea punctului (ex: urgența), 1..5 */
  weight?: number;
  /** 0..1, pentru rapoarte care se estompează cu vechimea */
  opacity?: number;
  /** „report” = punct mic cu contur punctat (raport live), altfel cerere */
  kind?: "report";
}

interface Props {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** punct suplimentar (ex: locația utilizatorului) */
  origin?: (LatLng & { label?: string }) | null;
  className?: string;
}

export const TILES = [{ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', subdomains: "" }];

export function MapView({ points, selectedId, onSelect, origin, className = "h-[420px]" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lastBounds = useRef<string>("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false }).setView([BUCHAREST.lat, BUCHAREST.lng], 12);
    // fundalul; dacă primele dale nu se încarcă (fără internet), mesaj în loc de gri mut
    let index = 0;
    let errors = 0;
    let loaded = 0;
    const addTiles = (i: number) => {
      const t = TILES[i];
      const tl = L.tileLayer(t.url, { maxZoom: 19, attribution: t.attribution, subdomains: t.subdomains || "abc" });
      tl.on("tileload", () => {
        loaded++;
        setOffline(false);
      });
      tl.on("tileerror", () => {
        errors++;
        if (loaded === 0 && errors >= 4) {
          m.removeLayer(tl);
          errors = 0;
          if (++index < TILES.length) addTiles(index);
          else setOffline(true);
        }
      });
      tl.addTo(m);
    };
    addTiles(0);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    // containerul își poate schimba mărimea după pornire (fonturi, panou lateral): fără asta rămân zone gri
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      lastBounds.current = "";
    };
  }, []);

  // punctele: se redesenează când se schimbă, dar harta se recentrează doar dacă s-a schimbat setul
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const p of points) {
      const selected = p.id === selectedId;
      const report = p.kind === "report";
      L.circleMarker([p.lat, p.lng], {
        radius: report ? 7 : 6 + (p.weight ?? 2) * 1.6 + (selected ? 3 : 0),
        color: selected ? "#ad4337" : "#ffffff",
        weight: selected ? 3 : 2,
        dashArray: report ? "3 3" : undefined,
        fillColor: p.color ?? "#d35f52",
        fillOpacity: (report ? 0.55 : 0.95) * (p.opacity ?? 1),
        opacity: p.opacity ?? 1,
      })
        .bindTooltip(p.label)
        .on("click", () => onSelectRef.current?.(p.id))
        .addTo(g);
    }
    if (origin) {
      L.circleMarker([origin.lat, origin.lng], { radius: 9, color: "#5747c9", weight: 3, fillColor: "#5747c9", fillOpacity: 0.3 })
        .bindTooltip(origin.label ?? "Tu")
        .addTo(g);
    }
    const all = [...points, ...(origin ? [origin] : [])];
    const key = boundsKey(all);
    if (all.length && key !== lastBounds.current) {
      lastBounds.current = key;
      m.fitBounds(L.latLngBounds(all.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 15 });
    }
  }, [points, selectedId, origin]);

  // cererea aleasă din listă: harta se mută la ea fără să schimbe zoom-ul
  useEffect(() => {
    const m = map.current;
    const p = points.find((x) => x.id === selectedId);
    if (m && p && !m.getBounds().pad(-0.1).contains([p.lat, p.lng])) m.panTo([p.lat, p.lng]);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative overflow-hidden rounded-[22px] bg-[#eef0f4] ring-1 ring-line ${className}`}>
      <div ref={el} className="h-full w-full" data-testid="map" />
      {offline && (
        <p className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-full bg-card/90 px-3 py-1 text-xs text-muted ring-1 ring-line" data-testid="map-offline">
          Fundalul hărții nu s-a încărcat (fără internet). Punctele sunt corecte.
        </p>
      )}
    </div>
  );
}
