/** Real app footage, cut to the voice-over, inside device frames. */
import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { c, font } from "../theme";
import { clamp, useSec } from "./kit";
import { interpolate } from "remotion";

export type Shot = { width: number; height: number; duration: number; css: { width: number; height: number }; scale: number;
  video_offset?: number; events: { t: number; vt?: number; label: string; x?: number; y?: number; click?: boolean }[] };

/** Footage time of an event (falls back for older recordings without vt). */
export const vt = (shot: Shot, label: string, nth = 0) => {
  const e = shot.events.filter((x) => x.label === label)[nth];
  if (!e) throw new Error(`no event ${label}`);
  return e.vt ?? e.t - (shot.video_offset ?? 0);
};

/** A cut: scene seconds [at, until) shows footage from `from`; it plays at `rate` (or fits `to` into the slot, within limits)
 * and freezes on its last frame when the footage runs out. */
export type Cut = { at: number; until: number; from: number; to?: number; rate?: number };

export const FootageCuts: React.FC<{ src: string; cuts: Cut[]; style?: React.CSSProperties; length?: number }> = ({ src, cuts, style, length }) => {
  const { fps } = useVideoConfig();
  const end = (length ?? 1e9) - 1 / fps; // never read past the recording: freeze on its last frame instead
  return (
    <>
      {cuts.map((cut, i) => {
        const slot = cut.until - cut.at;
        const rate = cut.to !== undefined ? Math.max(0.55, Math.min(1.8, (cut.to - cut.from) / slot)) : cut.rate ?? 1;
        const from = Math.min(cut.from, end - 0.05);
        const plays = Math.max(0.04, Math.min(cut.to !== undefined ? Math.min(slot, (cut.to - from) / rate) : slot, (end - from) / rate));
        const freezeAt = Math.max(0, Math.round((from + plays * rate) * fps) - 1);
        return (
          <React.Fragment key={i}>
            <Sequence from={Math.round(cut.at * fps)} durationInFrames={Math.max(1, Math.round(plays * fps))}>
              <OffthreadVideo src={staticFile(src)} startFrom={Math.round(from * fps)} playbackRate={rate} muted style={style} />
            </Sequence>
            {plays < slot - 0.04 ? (
              <Sequence from={Math.round((cut.at + plays) * fps)} durationInFrames={Math.max(1, Math.round((slot - plays) * fps))}>
                <Freeze frame={freezeAt}>
                  <OffthreadVideo src={staticFile(src)} muted style={style} />
                </Freeze>
              </Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
};

/** A phone: rounded glass bezel, island, soft reflection. Children fill the screen (390 × 844 CSS → scaled). */
export const Phone: React.FC<{ width?: number; children: React.ReactNode; style?: React.CSSProperties; sheen?: number }> =
  ({ width = 470, children, style, sheen = 0 }) => {
    const h = width * (844 / 390);
    const bez = width * 0.045;
    return (
      <div style={{ position: "relative", width: width + bez * 2, height: h + bez * 2, borderRadius: width * 0.16, padding: bez,
        background: "linear-gradient(145deg, #2a2d33, #0d0e10 45%, #1d1f24)", boxShadow: "0 60px 120px rgba(10,30,70,0.35), 0 18px 40px rgba(10,30,70,0.25), inset 0 0 0 2px rgba(255,255,255,0.08)", ...style }}>
        <div style={{ position: "relative", width, height: h, borderRadius: width * 0.13, overflow: "hidden", background: "#fff" }}>
          {children}
          <div style={{ position: "absolute", top: width * 0.025, left: "50%", width: width * 0.3, height: width * 0.075, transform: "translateX(-50%)",
            background: "#000", borderRadius: 999 }} />
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
            background: `linear-gradient(120deg, transparent ${30 + sheen * 40}%, rgba(255,255,255,0.18) ${40 + sheen * 40}%, transparent ${55 + sheen * 40}%)` }} />
        </div>
      </div>
    );
  };

/** A browser window in glass, for the organisation screens (1440 × 900 CSS → scaled). */
export const Window: React.FC<{ width?: number; children: React.ReactNode; url?: string; style?: React.CSSProperties; dark?: boolean }> =
  ({ width = 1500, children, url = "streamproof · Coimbra pilot (demo)", style, dark = false }) => {
    const h = width * (900 / 1440);
    return (
      <div style={{ width, borderRadius: 18, overflow: "hidden", background: dark ? "#1c1c1e" : "#fff",
        boxShadow: dark ? "0 50px 120px rgba(0,0,0,0.6)" : "0 50px 110px rgba(0,0,0,0.16), 0 10px 30px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.08)", ...style }}>
        <div style={{ height: 44, display: "flex", alignItems: "center", gap: 9, padding: "0 18px", background: dark ? "#2a2a2c" : "#f3f3f5",
          borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((col) => <div key={col} style={{ width: 13, height: 13, borderRadius: 7, background: col }} />)}
          <div style={{ marginLeft: 24, flex: 1, height: 26, borderRadius: 8, background: dark ? "#1c1c1e" : "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: font.sans, fontSize: 14, color: c.grey }}>{url}</div>
        </div>
        <div style={{ position: "relative", width, height: h, overflow: "hidden" }}>{children}</div>
      </div>
    );
  };

/** Zoom the footage inside its frame: scale and focus point change smoothly between keys (scene seconds). */
export const Zoom: React.FC<{ keys: { t: number; s: number; x: number; y: number }[]; children: React.ReactNode }> = ({ keys, children }) => {
  const t = useSec();
  const ts = keys.map((k) => k.t);
  const s = interpolate(t, ts, keys.map((k) => k.s), clamp);
  const x = interpolate(t, ts, keys.map((k) => k.x), clamp);
  const y = interpolate(t, ts, keys.map((k) => k.y), clamp);
  return (
    <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: `${x * 100}% ${y * 100}%` }}>{children}</AbsoluteFill>
  );
};
