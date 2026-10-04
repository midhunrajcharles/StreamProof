/**
 * Shared building blocks for both styles.
 *  A (explainer): Ink / Paper backgrounds, hairlines, mono labels, subtitles, red stamp.
 *  B (product): Sky gradient, glass panels, kinetic type, badges.
 * Plus the requested upgrades: 3D camera with parallax push-ins, HUD (coordinates, timestamps, scan lines,
 * confidence), particle data streams, cursor with trail and click ripple, morph-friendly primitives.
 */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { c, ease, font } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const fr = (s: number, fps = 30) => Math.round(s * fps);

/** 0..1 progress from second a to second b of the current sequence. */
export function useProgress(a: number, b: number, fn: (t: number) => number = ease.out) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return fn(interpolate(f / fps, [a, b], [0, 1], clamp));
}
export function useSec() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return f / fps;
}

// ---------------------------------------------------------------- backgrounds
export const Ink: React.FC<{ children?: React.ReactNode; grain?: boolean }> = ({ children, grain = true }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 40%, #141416 0%, #0a0a0a 60%, #050505 100%)" }}>
      {children}
      {grain ? <Grain seed={f} opacity={0.06} /> : null}
      <ScanLines opacity={0.05} />
    </AbsoluteFill>
  );
};

export const Paper: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 40%, #ffffff 0%, #f6f6f7 100%)" }}>{children}</AbsoluteFill>
);

/** Style B: soft water-tinted gradient with slow drifting light. */
export const Sky: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const t = useSec();
  const x1 = 30 + 10 * Math.sin(t * 0.25);
  const y1 = 30 + 8 * Math.cos(t * 0.2);
  const x2 = 75 + 8 * Math.cos(t * 0.18);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(60% 55% at ${x1}% ${y1}%, #ffffff 0%, rgba(255,255,255,0) 70%),
      radial-gradient(55% 60% at ${x2}% 70%, #cfe3ff 0%, rgba(207,227,255,0) 70%),
      linear-gradient(160deg, ${c.skyTop} 0%, ${c.skyMid} 55%, ${c.skyLow} 100%)` }}>
      {children}
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ seed: number; opacity?: number }> = ({ seed, opacity = 0.05 }) => (
  <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id={`g${seed % 7}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed % 97} />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${seed % 7})`} />
    </svg>
  </AbsoluteFill>
);

export const ScanLines: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity,
      backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 4px)",
      backgroundPosition: `0 ${(f * 0.6) % 4}px` }} />
  );
};

// ---------------------------------------------------------------- 3D camera: slow push-in + parallax
export const Camera3D: React.FC<{ children: React.ReactNode; from?: number; to?: number; dur: number;
  rx?: [number, number]; ry?: [number, number]; z?: [number, number]; perspective?: number }> =
  ({ children, dur, rx = [6, 2], ry = [-6, 4], z = [-120, 40], perspective = 1600 }) => {
    const t = useProgress(0, dur, ease.inOut);
    return (
      <AbsoluteFill style={{ perspective, perspectiveOrigin: "50% 45%" }}>
        <AbsoluteFill style={{ transformStyle: "preserve-3d",
          transform: `translateZ(${z[0] + (z[1] - z[0]) * t}px) rotateX(${rx[0] + (rx[1] - rx[0]) * t}deg) rotateY(${ry[0] + (ry[1] - ry[0]) * t}deg)` }}>
          {children}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  };

/** A layer at a depth inside Camera3D (parallax comes free with the perspective). */
export const Layer: React.FC<{ z?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ z = 0, style, children }) => (
  <AbsoluteFill style={{ transform: `translateZ(${z}px)`, transformStyle: "preserve-3d", ...style }}>{children}</AbsoluteFill>
);

// ---------------------------------------------------------------- type
export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> =
  ({ children, size = 15, color = c.grey, style }) => (
    <span style={{ fontFamily: font.mono, fontSize: size, letterSpacing: "0.08em", textTransform: "uppercase", color, ...style }}>{children}</span>
  );

/** Kinetic word: scales down from big and blurred, letter-spacing collapses, a light sweep passes over. */
export const KineticWord: React.FC<{ text: string; at: number; size?: number; color?: string; weight?: number;
  family?: string; glow?: string; style?: React.CSSProperties }> =
  ({ text, at, size = 160, color = c.paper, weight = 800, family, glow, style }) => {
    const t = useSec();
    const p = ease.outExpo(interpolate(t, [at, at + 0.7], [0, 1], clamp));
    const sweep = interpolate(t, [at + 0.35, at + 1.2], [-30, 130], clamp);
    return (
      <div style={{ fontFamily: family ?? font.sans, fontWeight: weight, fontSize: size, color, lineHeight: 1,
        letterSpacing: `${(1 - p) * 0.5 - 0.02}em`, opacity: p, filter: `blur(${(1 - p) * 18}px)`,
        transform: `scale(${1.6 - 0.6 * p})`, textShadow: glow ? `0 0 ${40 * p}px ${glow}` : undefined,
        backgroundImage: `linear-gradient(100deg, ${color} ${sweep - 12}%, #ffffff ${sweep}%, ${color} ${sweep + 12}%)`,
        WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", ...style }}>
        {text}
      </div>
    );
  };

export const Typewriter: React.FC<{ text: string; at: number; cps?: number; style?: React.CSSProperties; caret?: boolean }> =
  ({ text, at, cps = 22, style, caret = true }) => {
    const t = useSec();
    const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
    const blink = Math.floor(t * 2.2) % 2 === 0;
    return (
      <span style={style}>
        {text.slice(0, n)}
        {caret && t >= at && (n < text.length || blink) ? <span style={{ opacity: 0.8 }}>|</span> : null}
      </span>
    );
  };

export const BlurIn: React.FC<{ at: number; dur?: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ at, dur = 0.6, dy = 18, children, style }) => {
    const p = useProgress(at, at + dur, ease.out);
    return <div style={{ opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: `blur(${(1 - p) * 10}px)`, ...style }}>{children}</div>;
  };

// ---------------------------------------------------------------- glass
export const Glass: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties; dark?: boolean; sheenAt?: number; radius?: number }> =
  ({ children, style, dark = false, sheenAt, radius = 28 }) => {
    const t = useSec();
    const sweep = sheenAt === undefined ? -50 : interpolate(t, [sheenAt, sheenAt + 1.1], [-40, 140], clamp);
    return (
      <div style={{ position: "relative", borderRadius: radius, overflow: "hidden",
        background: dark ? "rgba(28,28,32,0.55)" : "rgba(255,255,255,0.55)",
        border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.85)",
        boxShadow: dark ? "0 40px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)"
          : "0 30px 70px rgba(20,60,120,0.18), 0 6px 18px rgba(20,60,120,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        backdropFilter: "blur(24px) saturate(160%)", WebkitBackdropFilter: "blur(24px) saturate(160%)", ...style }}>
        {children}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(115deg, transparent ${sweep - 18}%, rgba(255,255,255,${dark ? 0.12 : 0.55}) ${sweep}%, transparent ${sweep + 18}%)` }} />
      </div>
    );
  };

export const Badge: React.FC<{ at: number; x: number; y: number; icon: React.ReactNode; size?: number; color?: string }> =
  ({ at, x, y, icon, size = 96, color = c.blue }) => {
    const t = useSec();
    const p = ease.back(interpolate(t, [at, at + 0.55], [0, 1], clamp));
    const float = Math.sin((t - at) * 2.2) * 6;
    return (
      <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2 + float, width: size, height: size, borderRadius: "50%",
        transform: `scale(${p})`, opacity: Math.min(1, p * 1.4),
        background: `radial-gradient(circle at 35% 30%, #5aa9ff, ${color})`, boxShadow: `0 18px 40px rgba(0,102,204,0.35), 0 0 0 8px rgba(255,255,255,0.45)`,
        display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        {icon}
      </div>
    );
  };

// ---------------------------------------------------------------- HUD
export const Hud: React.FC<{ label: string; dark?: boolean; coords?: string; showClock?: boolean; confidence?: number; at?: number }> =
  ({ label, dark = false, coords, showClock = true, confidence, at = 0 }) => {
    const t = useSec();
    const p = useProgress(at, at + 0.6);
    const col = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
    const clock = new Date(Date.UTC(2026, 9, 4, 18, 42, 7) + t * 1000).toISOString().slice(11, 22);
    return (
      <AbsoluteFill style={{ opacity: p, pointerEvents: "none", padding: 44, fontFamily: font.mono, fontSize: 14, letterSpacing: "0.1em", color: col }}>
        <div style={{ position: "absolute", left: 44, top: 40, textTransform: "uppercase" }}>{label}</div>
        {showClock ? <div style={{ position: "absolute", right: 44, top: 40 }}>REC ● {clock} UTC</div> : null}
        {coords ? <div style={{ position: "absolute", left: 44, bottom: 40 }}>{coords}</div> : null}
        {confidence !== undefined ? (
          <div style={{ position: "absolute", right: 44, bottom: 40, display: "flex", alignItems: "center", gap: 12 }}>
            CONFIDENCE
            <div style={{ width: 160, height: 4, background: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)" }}>
              <div style={{ width: `${confidence * 100}%`, height: "100%", background: dark ? "#fff" : c.ink }} />
            </div>
            {Math.round(confidence * 100)}%
          </div>
        ) : null}
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
          <div key={i} style={{ position: "absolute", width: 18, height: 18, left: x ? undefined : 22, right: x ? 22 : undefined,
            top: y ? undefined : 22, bottom: y ? 22 : undefined,
            borderLeft: x ? undefined : `1.5px solid ${col}`, borderRight: x ? `1.5px solid ${col}` : undefined,
            borderTop: y ? undefined : `1.5px solid ${col}`, borderBottom: y ? `1.5px solid ${col}` : undefined }} />
        ))}
      </AbsoluteFill>
    );
  };

// ---------------------------------------------------------------- subtitles (style A: small grey line at the bottom)
export const Subtitles: React.FC<{ lines: { text: string; start: number; end: number }[]; dark?: boolean; bottom?: number;
  left?: number; width?: number }> =
  ({ lines, dark = false, bottom = 64, left, width }) => {
    const t = useSec();
    const cur = lines.find((l) => t >= l.start - 0.05 && t <= l.end + 0.25);
    if (!cur) return null;
    const p = interpolate(t, [cur.start - 0.05, cur.start + 0.2], [0, 1], clamp);
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: left === undefined ? "center" : "flex-start", paddingBottom: bottom,
        paddingLeft: left ?? 0, pointerEvents: "none" }}>
        <div style={{ maxWidth: width ?? 1240, textAlign: left === undefined ? "center" : "left", fontFamily: font.sans, fontSize: 25, lineHeight: 1.4,
          color: dark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)", opacity: p,
          textShadow: dark ? "0 1px 8px rgba(0,0,0,0.8)" : "0 1px 6px rgba(255,255,255,0.9)" }}>
          {cur.text}
        </div>
      </AbsoluteFill>
    );
  };

// ---------------------------------------------------------------- stamp (refusal)
export const Stamp: React.FC<{ at: number; text: string; sub?: string; color?: string; rotate?: number; style?: React.CSSProperties; until?: number }> =
  ({ at, text, sub, color = c.red, rotate = -8, style, until }) => {
    const t = useSec();
    if (t < at || (until !== undefined && t > until)) return null;
    const p = interpolate(t, [at, at + 0.18], [0, 1], clamp) * (until === undefined ? 1 : interpolate(t, [until - 0.35, until], [1, 0], clamp));
    const shake = t < at + 0.35 ? Math.sin((t - at) * 90) * 6 * (1 - (t - at) / 0.35) : 0;
    return (
      <div style={{ position: "absolute", transform: `translate(${shake}px, 0) rotate(${rotate}deg) scale(${2.4 - 1.4 * p})`, opacity: p,
        border: `5px solid ${color}`, borderRadius: 10, padding: "14px 28px", color, fontFamily: font.mono, fontWeight: 500,
        textTransform: "uppercase", letterSpacing: "0.12em", background: "rgba(10,10,10,0.55)", whiteSpace: "nowrap",
        boxShadow: `0 0 0 2px ${color}22, 0 0 40px ${color}55`, ...style }}>
        <div style={{ fontSize: 44, lineHeight: 1 }}>{text}</div>
        {sub ? <div style={{ fontSize: 15, marginTop: 8, opacity: 0.85 }}>{sub}</div> : null}
      </div>
    );
  };

// ---------------------------------------------------------------- particle data stream along a polyline
export const Stream: React.FC<{ points: [number, number][]; at: number; count?: number; speed?: number; color?: string;
  width?: number; dot?: number; dashed?: boolean; seed?: string }> =
  ({ points, at, count = 26, speed = 0.35, color = c.blue, width = 2, dot = 5, dashed = true, seed = "s" }) => {
    const t = useSec();
    const reveal = interpolate(t, [at, at + 0.8], [0, 1], clamp);
    const segs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = segs.reduce((a, b) => a + b, 0);
    const at01 = (u: number): [number, number] => {
      let d = u * total;
      for (let i = 0; i < segs.length; i++) {
        if (d <= segs[i]) {
          const k = d / segs[i];
          return [points[i][0] + (points[i + 1][0] - points[i][0]) * k, points[i][1] + (points[i + 1][1] - points[i][1]) * k];
        }
        d -= segs[i];
      }
      return points[points.length - 1];
    };
    const path = points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
    return (
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width="100%" height="100%">
        <path d={path} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={width} strokeDasharray={dashed ? "2 8" : undefined}
          pathLength={1} strokeDashoffset={0} style={{ clipPath: `inset(0 ${100 - reveal * 100}% 0 0)` }} />
        {t >= at
          ? Array.from({ length: count }, (_, i) => {
            const u = ((t - at) * speed + i / count + random(`${seed}${i}`) * 0.05) % 1;
            if (u > reveal) return null;
            const [x, y] = at01(u);
            const s = dot * (0.6 + random(`${seed}r${i}`) * 0.8);
            return <circle key={i} cx={x} cy={y} r={s} fill={color} opacity={0.35 + 0.65 * Math.sin(u * Math.PI)}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }} />;
          })
          : null}
      </svg>
    );
  };

// ---------------------------------------------------------------- cursor with trail and click ripple
export type CursorKey = { t: number; x: number; y: number; click?: boolean };
export const Cursor: React.FC<{ keys: CursorKey[]; hand?: boolean; scale?: number }> = ({ keys, hand = false, scale = 1 }) => {
  const t = useSec();
  if (!keys.length || t < keys[0].t - 0.3) return null;
  const posAt = (tt: number) => {
    if (tt <= keys[0].t) return keys[0];
    for (let i = 1; i < keys.length; i++) {
      if (tt <= keys[i].t) {
        const k = ease.inOut((tt - keys[i - 1].t) / (keys[i].t - keys[i - 1].t));
        return { x: keys[i - 1].x + (keys[i].x - keys[i - 1].x) * k, y: keys[i - 1].y + (keys[i].y - keys[i - 1].y) * k };
      }
    }
    return keys[keys.length - 1];
  };
  const p = posAt(t);
  const click = keys.filter((k) => k.click && t >= k.t && t < k.t + 0.6).pop();
  const press = click ? Math.max(0, 1 - (t - click.t) / 0.15) : 0;
  const trail = Array.from({ length: 8 }, (_, i) => posAt(t - (i + 1) * 0.025));
  return (
    <>
      {trail.map((q, i) => (
        <div key={i} style={{ position: "absolute", left: q.x - 4, top: q.y - 4, width: 8, height: 8, borderRadius: 4,
          background: "rgba(0,102,204,0.35)", opacity: (8 - i) / 14 }} />
      ))}
      {click ? (
        <div style={{ position: "absolute", left: click.x - 40, top: click.y - 40, width: 80, height: 80, borderRadius: 40,
          border: "3px solid rgba(0,102,204,0.7)", transform: `scale(${0.3 + (t - click.t) * 2.2})`, opacity: 1 - (t - click.t) / 0.6 }} />
      ) : null}
      <svg style={{ position: "absolute", left: p.x - 6, top: p.y - 4, transform: `scale(${scale * (1 - 0.15 * press)})`,
        transformOrigin: "6px 4px", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }} width={hand ? 44 : 34} height={hand ? 48 : 40} viewBox="0 0 34 40">
        {hand ? (
          <path d="M12 4c2 0 3 1.5 3 3v11l2-1c2-1 4 0 4 2l1 1c2-1 4 0 4 2l1 1c2-1 4 1 4 3v6c0 5-4 9-9 9h-4c-3 0-5-1-7-3l-7-9c-1-2 0-4 2-4 1 0 2 .5 3 1.5l2 2V7c0-1.5 1-3 3-3z"
            fill="white" stroke="#111" strokeWidth="2" />
        ) : (
          <path d="M3 2 L3 30 L10 23 L15 35 L20 33 L15 21 L25 21 Z" fill="white" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        )}
      </svg>
    </>
  );
};

/** A satisfying check: ring draws, then the tick, with a soft bloom. */
export const Check: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 64, color = c.green }) => {
  const ring = useProgress(at, at + 0.35);
  const tick = useProgress(at + 0.25, at + 0.55);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: `drop-shadow(0 0 ${12 * tick}px ${color}88)` }}>
      <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ring}
        transform="rotate(-90 32 32)" />
      <path d="M19 33 L28 42 L45 23" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray="1" strokeDashoffset={1 - tick} />
    </svg>
  );
};

/** Beat-synced flash: a quick white (or dark) veil that peaks on a music beat. */
export const BeatFlash: React.FC<{ at: number; color?: string; strength?: number }> = ({ at, color = "#ffffff", strength = 0.35 }) => {
  const t = useSec();
  const d = t - at;
  if (d < -0.02 || d > 0.35) return null;
  return <AbsoluteFill style={{ background: color, opacity: strength * Math.max(0, 1 - d / 0.35), pointerEvents: "none" }} />;
};

/** A sound effect at a scene time (seconds). */
export const Sfx: React.FC<{ at: number; name: "whoosh" | "thud" | "riser" | "chime" | "tick" | "check"; volume?: number }> = ({ at, name, volume = 0.6 }) => {
  const { fps } = useVideoConfig();
  if (at < 0) return null;
  return (
    <Sequence from={Math.round(at * fps)} layout="none">
      <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
    </Sequence>
  );
};
