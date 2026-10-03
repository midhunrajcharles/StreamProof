"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

export type MapMarker = { id: string; lat: number; lon: number; label?: string; title: string; selected?: boolean; kind?: "pin" | "dot" };

export type MapViewProps = {
  center: [number, number];
  zoom?: number;
  streams?: [number, number][][];
  markers?: MapMarker[];
  circles?: { lat: number; lon: number; radius: number }[];
  draggable?: { lat: number; lon: number; onMove: (lat: number, lon: number) => void };
  onSelect?: (id: string) => void;
  label: string;
  tall?: boolean;
  children?: React.ReactNode;
};

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#000";

function icon(m: { label?: string; selected?: boolean; kind?: string }) {
  if (m.kind === "dot") {
    return L.divIcon({ className: "", html: `<div class="dot${m.selected ? " sel" : ""}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });
  }
  return L.divIcon({ className: "", html: `<div class="pin"><span>${m.label ?? ""}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 40] });
}

export default function MapView({ center, zoom = 16, streams = [], markers = [], circles = [], draggable, onSelect, label, tall, children }: MapViewProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const drag = useRef<L.Marker | null>(null);
  const onMove = useRef(draggable?.onMove);
  onMove.current = draggable?.onMove;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, keyboard: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur", () => m.scrollWheelZoom.disable());
    m.on("click", (e: L.LeafletMouseEvent) => {
      if (drag.current && onMove.current) {
        drag.current.setLatLng(e.latlng);
        onMove.current(e.latlng.lat, e.latlng.lng);
      }
    });
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; drag.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // static layers: streams, markers, circles
  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    const water = css("--water");
    streams.forEach((line) => L.polyline(line, { color: water, weight: 5, opacity: 0.85, interactive: false }).addTo(g));
    circles.forEach((c) => L.circle([c.lat, c.lon], { radius: c.radius, color: css("--label"), weight: 1.5, dashArray: "4 6", fillOpacity: 0.06, interactive: false }).addTo(g));
    markers.forEach((mk) => {
      const m = L.marker([mk.lat, mk.lon], { icon: icon(mk), title: mk.title, alt: mk.title, keyboard: Boolean(onSelect), riseOnHover: true, zIndexOffset: mk.selected ? 1000 : 0 }).addTo(g);
      if (onSelect) m.on("click", () => onSelect(mk.id));
    });
  }, [streams, markers, circles, onSelect]);

  // the draggable pin (report form)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!draggable) { drag.current?.remove(); drag.current = null; return; }
    if (!drag.current) {
      drag.current = L.marker([draggable.lat, draggable.lon], { icon: icon({ label: "" }), draggable: true, title: "Report location", alt: "Report location", autoPan: true }).addTo(m);
      drag.current.on("dragend", () => { const p = drag.current!.getLatLng(); onMove.current?.(p.lat, p.lng); });
    } else {
      const p = drag.current.getLatLng();
      if (Math.abs(p.lat - draggable.lat) > 1e-7 || Math.abs(p.lng - draggable.lon) > 1e-7) {
        drag.current.setLatLng([draggable.lat, draggable.lon]);
        m.panTo([draggable.lat, draggable.lon]);
      }
    }
  }, [draggable?.lat, draggable?.lon, draggable]);

  // follow centre changes (e.g. selection in the review list)
  useEffect(() => { map.current?.panTo(center); }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`map${tall ? " map-tall" : ""}`} role="region" aria-label={label}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {children ? <div className="map-overlay">{children}</div> : null}
    </div>
  );
}
