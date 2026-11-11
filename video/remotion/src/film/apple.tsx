/**
 * Apple's official device frames (Apple Design Resources, transparent PNG bezels) with a recording placed exactly inside the
 * screen opening. The bezel is drawn over the recording, so the opening's own rounded corners cut the picture, nothing is faked.
 * Frame art © Apple Inc.; used for a non-commercial hackathon demo. Not endorsed by Apple.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import bezels from "../data/bezels.json";

export type BezelId = keyof typeof bezels;

/** Size of a bezel image when its screen opening is `screenW` pixels wide. Children are laid out in the screen box. */
export function appleSize(id: BezelId, screenW: number) {
  const b = bezels[id];
  const h = b.holes[0];
  const s = screenW / h.w;
  return { s, w: b.w * s, h: b.h * s, sx: h.x * s, sy: h.y * s, sw: screenW, sh: h.h * s };
}

/** How a recording of cw × ch CSS pixels is placed in a screen box with object-fit: cover (scale and offsets). */
export function coverMap(cw: number, ch: number, sw: number, sh: number) {
  const k = Math.max(sw / cw, sh / ch);
  return { k, ox: (sw - cw * k) / 2, oy: (sh - ch * k) / 2 };
}

export const AppleDevice: React.FC<{ id: BezelId; screenW: number; sheen?: number; crease?: boolean; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ id, screenW, sheen = 0, crease = false, children, style }) => {
    const A = appleSize(id, screenW);
    const box: React.CSSProperties = { position: "absolute", left: A.sx, top: A.sy, width: A.sw, height: A.sh };
    return (
      <div style={{ position: "relative", width: A.w, height: A.h, filter: "drop-shadow(0 38px 42px rgba(8,16,40,0.26)) drop-shadow(0 10px 14px rgba(8,16,40,0.20))", ...style }}>
        <div style={{ ...box, overflow: "hidden", background: "#fff" }}>{children}</div>
        <Img src={staticFile(bezels[id].file)} style={{ position: "absolute", left: 0, top: 0, width: A.w, height: A.h }} />
        {/* the glass: one soft diagonal reflection that slides slowly across the screen */}
        <div style={{ ...box, pointerEvents: "none", background: `linear-gradient(115deg, rgba(255,255,255,0) ${14 + sheen * 60}%, rgba(255,255,255,0.10) ${30 + sheen * 60}%, rgba(255,255,255,0) ${46 + sheen * 60}%),
          linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 24%)` }} />
        {crease ? (
          <div style={{ ...box, pointerEvents: "none", background: "linear-gradient(90deg, rgba(0,0,0,0) 47.2%, rgba(0,0,0,0.10) 49.4%, rgba(255,255,255,0.18) 50%, rgba(0,0,0,0.06) 50.7%, rgba(0,0,0,0) 52.8%)" }} />
        ) : null}
      </div>
    );
  };
