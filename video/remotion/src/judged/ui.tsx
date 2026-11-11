/** Shared pieces of the judged film: tiles, one-at-a-time captions (word stagger), fine print, camera, scrim. */
import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { ease, font } from "../theme";
import { clamp, useSec } from "../components/kit";

export const INK = "#1d1d1f";
export const GREY = "#6e6e73";
export const LIGHT = "#f5f5f7";
export const ACCENT = "#0a6ebd";
export const OK = "#248a3d";

export const Tile: React.FC<{ dark?: boolean; plain?: boolean; children?: React.ReactNode }> = ({ dark = false, plain = false, children }) => (
  <AbsoluteFill style={{ background: dark
    ? (plain ? "#000" : "radial-gradient(90% 70% at 50% 30%, #1b1b1f 0%, #0a0a0c 55%, #000 100%)")
    : (plain ? LIGHT : "radial-gradient(110% 80% at 50% 22%, #ffffff 0%, #f5f5f7 58%, #e6e6eb 100%)") }}>{children}</AbsoluteFill>
);

/** Dissolve a scene in over the end of the previous one. */
export const FadeIn: React.FC<{ dur?: number; children: React.ReactNode }> = ({ dur = 0.5, children }) => {
  const t = useSec();
  return <AbsoluteFill style={{ opacity: Math.min(1, t / dur) }}>{children}</AbsoluteFill>;
};

export type CapItem = { a: number; b: number; text: string; sub?: string; color?: string; subColor?: string };

/** One caption at a time. Words fade and rise a few frames apart; the whole line lifts out at the end. */
export const Caps: React.FC<{ items: CapItem[]; y: number; size?: number; subSize?: number; dark?: boolean; w?: number; x?: number; align?: "center" | "left"; track?: string; weight?: number }> =
  ({ items, y, size = 64, subSize = 37, dark = false, w = 1560, x = 960, align = "center", track = "-0.003em", weight = 600 }) => {
    const t = useSec();
    const cur = items.find((k) => t >= k.a && t < k.b);
    if (!cur) return null;
    const words = cur.text.split(" ");
    const out = ease.out(interpolate(t, [cur.b - 0.35, cur.b], [0, 1], clamp));
    const col = cur.color ?? (dark ? "#f5f5f7" : INK);
    return (
      <div style={{ position: "absolute", left: align === "left" ? x : x - w / 2, top: y, width: w, textAlign: align, opacity: 1 - out, transform: `translateY(${-out * 14}px)` }}>
        <div style={{ fontFamily: font.sans, fontWeight: weight, fontSize: size, lineHeight: size > 90 ? 1.05 : 1.08, letterSpacing: size > 90 ? "-0.015em" : track, color: col }}>
          {words.map((wd, i) => {
            const p = ease.outExpo(interpolate(t, [cur.a + i * 0.12, cur.a + i * 0.12 + 0.55], [0, 1], clamp));
            return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 26}px)`, marginRight: "0.26em", whiteSpace: "pre" }}>{wd}</span>;
          })}
        </div>
        {cur.sub ? (
          <div style={{ fontFamily: font.sans, fontWeight: 400, fontSize: subSize, lineHeight: 1.25, letterSpacing: "0.002em", marginTop: 16,
            color: cur.subColor ?? (dark ? "rgba(245,245,247,0.66)" : GREY),
            opacity: ease.out(interpolate(t, [cur.a + words.length * 0.12, cur.a + words.length * 0.12 + 0.6], [0, 1], clamp)) }}>{cur.sub}</div>
        ) : null}
      </div>
    );
  };

/** Fine print, bottom centre, between local seconds a and b. */
export const Fine: React.FC<{ a?: number; b?: number; dark?: boolean; left?: number; children: React.ReactNode }> = ({ a = 0, b = 1e9, dark = false, left, children }) => {
  const t = useSec();
  const o = Math.min(ease.out(interpolate(t, [a, a + 0.5], [0, 1], clamp)), 1 - interpolate(t, [b - 0.4, b], [0, 1], clamp));
  return <div style={{ position: "absolute", left: left ?? 0, right: left === undefined ? 0 : undefined, width: left === undefined ? undefined : 760, bottom: 28, textAlign: left === undefined ? "center" : "left", fontFamily: font.sans, fontWeight: 400, fontSize: 18, letterSpacing: "0.01em",
    color: dark ? "rgba(245,245,247,0.55)" : GREY, opacity: o }}>{children}</div>;
};

/** Camera: a continuous slow push, plus keyed pushes that put a focus point (fx, fy, canvas px) at the frame centre. */
export const Cam: React.FC<{ keys?: { t: number; s: number; fx: number; fy: number }[]; push?: number; dur: number; children: React.ReactNode }> = ({ keys, push = 0.03, dur, children }) => {
  const t = useSec();
  const k = keys ?? [{ t: 0, s: 1, fx: 960, fy: 540 }];
  const ts = k.map((q) => q.t);
  const opt = { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) };
  const s0 = ts.length > 1 ? interpolate(t, ts, k.map((q) => q.s), opt) : k[0].s;
  const fx = ts.length > 1 ? interpolate(t, ts, k.map((q) => q.fx), opt) : k[0].fx;
  const fy = ts.length > 1 ? interpolate(t, ts, k.map((q) => q.fy), opt) : k[0].fy;
  const s = s0 * (1 + push * Math.min(1, t / dur));
  return <AbsoluteFill style={{ transform: `translate(${960 - s * fx}px, ${540 - s * fy}px) scale(${s})`, transformOrigin: "0 0" }}>{children}</AbsoluteFill>;
};

/** Slight darkening behind a caption laid over the real UI. */
export const Scrim: React.FC<{ a: number; b: number; strength?: number }> = ({ a, b, strength = 0.5 }) => {
  const t = useSec();
  const o = Math.min(interpolate(t, [a, a + 0.5], [0, 1], clamp), interpolate(t, [b - 0.5, b], [1, 0], clamp));
  return <AbsoluteFill style={{ background: "radial-gradient(70% 60% at 50% 50%, rgba(0,0,0,0.85), rgba(0,0,0,0.66))", opacity: o * strength * 1.6, pointerEvents: "none" }} />;
};
