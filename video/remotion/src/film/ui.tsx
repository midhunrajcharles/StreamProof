/** Shared pieces of the silent film: light and dark tiles, captions, the chapter veil, device entrance, footage helpers. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { c, ease, font } from "../theme";
import { Mono, clamp, useSec } from "../components/kit";
import type { Shot } from "../components/footage";
import type { CursorKey } from "../components/kit";

export const LIGHT = "#f5f5f7";
export const DARK = "#000000";

export const LightTile: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "radial-gradient(110% 80% at 50% 22%, #ffffff 0%, #f5f5f7 60%, #e9e9ee 100%)" }}>{children}</AbsoluteFill>
);
export const DarkTile: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "radial-gradient(90% 70% at 50% 28%, #202025 0%, #0b0b0d 52%, #000000 100%)" }}>{children}</AbsoluteFill>
);

/** The previous chapter's colour, fading out over the first moments of this one: a soft hand-over, never a hard cut. */
export const Veil: React.FC<{ color: string; dur?: number }> = ({ color, dur = 0.9 }) => {
  const t = useSec();
  const o = 1 - ease.out(interpolate(t, [0, dur], [0, 1], clamp));
  if (o <= 0.002) return null;
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
};

/** A device rising into place: scale, lift, blur and a slight turn that settles. */
export const Rise: React.FC<{ at?: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; dy?: number; turn?: number }> =
  ({ at = 0.2, dur = 1.1, children, style, dy = 70, turn = 7 }) => {
    const t = useSec();
    const p = ease.outExpo(interpolate(t, [at, at + dur], [0, 1], clamp));
    return (
      <div style={{ opacity: Math.min(1, p * 1.6), transform: `perspective(2400px) translateY(${(1 - p) * dy}px) rotateY(${(1 - p) * turn}deg) scale(${(0.92 + 0.08 * p) * (1 + 0.04 * Math.min(1, Math.max(0, t - at) / 24))})`,
        filter: `blur(${(1 - p) * 10}px)`, transformOrigin: "50% 60%", ...style }}>
        {children}
      </div>
    );
  };

export type Cap = { a: number; b: number; title: string; sub?: string; extra?: React.ReactNode; color?: string };
/** Captions, one at a time: a big title and a quiet line under it. They blur in and lift out, Apple-tile style. */
export const Caps: React.FC<{ caps: Cap[]; x: number; y: number; width: number; dark?: boolean; size?: number; subSize?: number; align?: "left" | "center" }> =
  ({ caps, x, y, width, dark = false, size = 78, subSize = 34, align = "left" }) => {
    const t = useSec();
    const cur = caps.find((k) => t >= k.a && t < k.b);
    if (!cur) return null;
    const pin = ease.out(interpolate(t, [cur.a, cur.a + 0.65], [0, 1], clamp));
    const pout = interpolate(t, [cur.b - 0.4, cur.b], [1, 0], clamp);
    const o = Math.min(pin, pout);
    return (
      <div style={{ position: "absolute", left: x, top: y, width, textAlign: align, opacity: o, transform: `translateY(${(1 - pin) * 28 - (1 - pout) * 14}px)`,
        filter: `blur(${(1 - o) * 9}px)` }}>
        <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.035em", color: cur.color ?? (dark ? "#f5f5f7" : "#1d1d1f") }}>{cur.title}</div>
        {cur.sub ? <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: subSize, lineHeight: 1.3, letterSpacing: "-0.01em", marginTop: 18,
          color: dark ? "rgba(245,245,247,0.62)" : "#6e6e73" }}>{cur.sub}</div> : null}
        {cur.extra ?? null}
      </div>
    );
  };

export const Eyebrow: React.FC<{ children: React.ReactNode; x: number; y: number; dark?: boolean; at?: number }> = ({ children, x, y, dark = false, at = 0.2 }) => {
  const t = useSec();
  const p = ease.out(interpolate(t, [at, at + 0.6], [0, 1], clamp));
  return <div style={{ position: "absolute", left: x, top: y, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}><Mono size={17} color={dark ? c.blueGlow : c.blue}>{children}</Mono></div>;
};

export const DemoLabel: React.FC<{ dark?: boolean; children?: React.ReactNode }> = ({ dark = false, children = "DEMO DATA · REAL STREAM GEOMETRY · RIBEIRA DE COSELHAS, COIMBRA" }) => (
  <div style={{ position: "absolute", left: 44, bottom: 34, fontFamily: font.mono, fontSize: 13, letterSpacing: "0.1em", color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.42)" }}>{children}</div>
);

// ---------------------------------------------------------------- footage helpers
export type Seg = { at: number; until: number; from: number; rate?: number };

/** Chapter time at which a footage moment (seconds into the recording) is on screen. */
export function whenShown(segs: Seg[], ft: number): number | null {
  for (const s of segs) {
    const r = s.rate ?? 1;
    if (ft >= s.from && ft <= s.from + (s.until - s.at) * r) return s.at + (ft - s.from) / r;
  }
  return null;
}
const evT = (sh: Shot, e: Shot["events"][number]) => e.vt ?? e.t - (sh.video_offset ?? 0);

/** Where the finger or pointer landed, in chapter time and in screen pixels (K = screen px per CSS px). */
export function tapsFor(sh: Shot, segs: Seg[], K: number, ox = 0, oy = 0) {
  return sh.events.filter((e) => e.click && e.x !== undefined).flatMap((e) => {
    const st = whenShown(segs, evT(sh, e));
    return st === null ? [] : [{ t: st, x: e.x! * K + ox, y: e.y! * K + oy }];
  });
}
export const cursorKeys = (taps: { t: number; x: number; y: number }[]): CursorKey[] =>
  taps.flatMap((k) => [{ t: k.t - 0.5, x: k.x, y: k.y }, { t: k.t, x: k.x, y: k.y, click: true }]);

/** Time of a named event in chapter time. */
export function evAt(sh: Shot, segs: Seg[], label: string, nth = 0): number {
  const e = sh.events.filter((x) => x.label === label)[nth];
  if (!e) throw new Error(`no event ${label}`);
  const st = whenShown(segs, evT(sh, e));
  if (st === null) throw new Error(`event ${label} is not inside the cuts`);
  return st;
}
