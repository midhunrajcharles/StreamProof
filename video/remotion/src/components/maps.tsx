/** Animated maps from the real stream geometry (OpenStreetMap, via data/streams.json): glowing paths, evidence pulses
 * travelling downstream, highlighted stretches, and pins that ripple outward. */
import React from "react";
import { interpolate, random } from "remotion";
import streams from "../data/streams.json";
import { clamp, useSec } from "./kit";

export type StreamGeo = { id: string; name: string; city: string; coords: number[][]; chainage: number[] };
export const STREAMS = streams as StreamGeo[];
export const stream = (id: string) => STREAMS.find((s) => s.id === id)!;

/** Project lon/lat into a w×h box (equirectangular with latitude correction), padded. */
export function projector(s: StreamGeo, w: number, h: number, pad = 0.08) {
  const lat0 = s.coords.reduce((a, p) => a + p[1], 0) / s.coords.length;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const xs = s.coords.map((p) => p[0] * kx);
  const ys = s.coords.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const sc = Math.min((w * (1 - 2 * pad)) / (x1 - x0), (h * (1 - 2 * pad)) / (y1 - y0));
  const ox = (w - (x1 - x0) * sc) / 2;
  const oy = (h - (y1 - y0) * sc) / 2;
  return (lon: number, lat: number): [number, number] => [ox + (lon * kx - x0) * sc, oy + (y1 - lat) * sc];
}

/** Points along the stream between two chainages (metres from the upstream end). */
export function slice(s: StreamGeo, a: number, b: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < s.coords.length; i++) if (s.chainage[i] >= a && s.chainage[i] <= b) out.push(s.coords[i]);
  return out;
}

export const StreamMap: React.FC<{ id: string; w: number; h: number; at?: number; color?: string; glow?: string;
  highlight?: { from: number; to: number; color: string; at: number }[]; pulses?: number; pins?: { lon: number; lat: number; at: number; color?: string }[];
  label?: string; dark?: boolean }> =
  ({ id, w, h, at = 0, color = "#38bdf8", glow = "rgba(56,189,248,0.7)", highlight = [], pulses = 14, pins = [], label, dark = false }) => {
    const t = useSec();
    const s = stream(id);
    const P = projector(s, w, h);
    const pts = s.coords.map(([lo, la]) => P(lo, la));
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const draw = interpolate(t, [at, at + 1.6], [0, 1], clamp);
    const total = s.chainage[s.chainage.length - 1];
    const along = (u: number) => {
      const m = u * total;
      let i = s.chainage.findIndex((c) => c >= m);
      if (i <= 0) return pts[0];
      const k = (m - s.chainage[i - 1]) / (s.chainage[i] - s.chainage[i - 1]);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    };
    return (
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <defs>
          <filter id={`gl-${id}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
        </defs>
        <path d={d} fill="none" stroke={glow} strokeWidth={14} strokeLinecap="round" filter={`url(#gl-${id})`} pathLength={1}
          strokeDasharray="1" strokeDashoffset={1 - draw} opacity={0.8} />
        <path d={d} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
          strokeDasharray="1" strokeDashoffset={1 - draw} />
        {highlight.map((hl, i) => {
          const seg = slice(s, hl.from, hl.to).map(([lo, la]) => P(lo, la));
          if (seg.length < 2) return null;
          const p = interpolate(t, [hl.at, hl.at + 0.6], [0, 1], clamp);
          const pulse = 0.55 + 0.45 * Math.sin((t - hl.at) * 5);
          const sd = seg.map((q, j) => `${j ? "L" : "M"}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
          return (
            <g key={i} opacity={p}>
              <path d={sd} fill="none" stroke={hl.color} strokeWidth={22} strokeLinecap="round" opacity={0.35 * pulse} filter={`url(#gl-${id})`} />
              <path d={sd} fill="none" stroke={hl.color} strokeWidth={7} strokeLinecap="round" />
            </g>
          );
        })}
        {draw > 0.98
          ? Array.from({ length: pulses }, (_, i) => {
            const u = ((t - at) * 0.07 + i / pulses + random(`${id}p${i}`) * 0.02) % 1;
            const [x, y] = along(u);
            return <circle key={i} cx={x} cy={y} r={4.5} fill="#fff" style={{ filter: `drop-shadow(0 0 8px ${color})` }} opacity={0.9} />;
          })
          : null}
        {pins.map((pin, i) => {
          const [x, y] = P(pin.lon, pin.lat);
          const p = interpolate(t, [pin.at, pin.at + 0.4], [0, 1], clamp);
          const ring = ((t - pin.at) % 1.6) / 1.6;
          return t >= pin.at ? (
            <g key={i}>
              <circle cx={x} cy={y} r={8 + ring * 46} fill="none" stroke={pin.color ?? "#0066cc"} strokeWidth={2.5} opacity={(1 - ring) * 0.8} />
              <circle cx={x} cy={y} r={9 * p} fill={pin.color ?? "#0066cc"} stroke="#fff" strokeWidth={3} />
            </g>
          ) : null;
        })}
        {label ? (
          <text x={pts[0][0]} y={pts[0][1] - 18} fill={dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)"} fontSize={15}
            fontFamily="JetBrains Mono" letterSpacing="1.5" opacity={draw}>{label.toUpperCase()}</text>
        ) : null}
      </svg>
    );
  };
