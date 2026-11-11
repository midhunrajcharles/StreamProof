/** Chapter 0 · Open (dark). The wordmark, the promise, then the four screens named one beat at a time. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { KineticWord, Sfx, clamp, useSec } from "../components/kit";
import { c, ease, font } from "../theme";
import { BEAT, snap } from "./timing";
import { DarkTile } from "./ui";

const WORDS = ["Phone.", "Foldable.", "Tablet.", "Desktop."];
const W0 = snap("open", 6.1);

export const ChOpen: React.FC = () => {
  const t = useSec();
  const mark = ease.outExpo(interpolate(t, [0.5, 1.9], [0, 1], clamp));
  const tag = ease.out(interpolate(t, [3.0, 3.9], [0, 1], clamp));
  const lift = ease.inOut(interpolate(t, [5.0, 6.0], [0, 1], clamp));
  const finalAt = W0 + WORDS.length * 2 * BEAT;
  const idx = Math.floor((t - W0) / (2 * BEAT));
  return (
    <DarkTile>
      <AbsoluteFill style={{ alignItems: "center" }}>
        <div style={{ position: "absolute", top: 400 - 330 * lift, transform: `scale(${1 - 0.58 * lift})`, transformOrigin: "50% 0%", textAlign: "center",
          opacity: mark, filter: `blur(${(1 - mark) * 14}px)` }}>
          <div style={{ fontFamily: font.serif, fontSize: 210, color: "#f5f5f7", letterSpacing: "-0.02em", lineHeight: 1,
            transform: `scale(${1.18 - 0.18 * mark})`, textShadow: "0 0 80px rgba(41,151,255,0.28)" }}>
            StreamProof
            <span style={{ display: "inline-block", marginLeft: 14, color: c.blueGlow, fontFamily: font.sans, fontSize: 80, verticalAlign: "top",
              transform: `rotate(${t * 36}deg) scale(${mark})` }}>✦</span>
          </div>
          <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 48, color: "rgba(245,245,247,0.7)", marginTop: 6, opacity: tag,
            transform: `translateY(${(1 - tag) * 14}px)`, letterSpacing: "-0.01em" }}>Evidence a city can act on.</div>
        </div>
        {t >= W0 && t < finalAt ? (
          <div style={{ position: "absolute", top: 400 }}>
            <KineticWord key={idx} text={WORDS[Math.max(0, Math.min(WORDS.length - 1, idx))]} at={W0 + Math.max(0, idx) * 2 * BEAT} size={170} weight={800} color="#f5f5f7"
              glow="rgba(41,151,255,0.35)" style={{ textAlign: "center" }} />
          </div>
        ) : null}
        {t >= finalAt - 0.05 ? (
          <div style={{ position: "absolute", top: 380, textAlign: "center" }}>
            <KineticWord text="One app." at={finalAt} size={150} weight={800} color="#f5f5f7" />
            <KineticWord text="Every screen." at={finalAt + BEAT * 2} size={150} weight={800} color={c.blueGlow} glow="rgba(41,151,255,0.5)" style={{ marginTop: 10 }} />
          </div>
        ) : null}
      </AbsoluteFill>
      <Sfx at={0.5} name="riser" volume={0.28} />
      {WORDS.map((_, i) => <Sfx key={i} at={W0 + i * 2 * BEAT} name="tick" volume={0.5} />)}
      <Sfx at={finalAt} name="thud" volume={0.35} />
      <Sfx at={finalAt + 2 * BEAT} name="chime" volume={0.3} />
      <div style={{ position: "absolute", left: 44, bottom: 34, fontFamily: font.mono, fontSize: 13, letterSpacing: "0.1em", color: "rgba(255,255,255,0.34)" }}>
        STREAMPROOF · ONEAQUAHEALTH IEEE HACKATHON · TRACK 7
      </div>
    </DarkTile>
  );
};
