/** Chapter 7 · End card (dark). The wordmark, the line, and the honest small print. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Mono, Sfx, clamp, useSec } from "../components/kit";
import { c, ease, font } from "../theme";
import { DarkTile, Veil } from "./ui";

export const ChEnd: React.FC = () => {
  const t = useSec();
  const mark = ease.outExpo(interpolate(t, [0.4, 1.8], [0, 1], clamp));
  const tag = ease.out(interpolate(t, [1.8, 2.7], [0, 1], clamp));
  const small = ease.out(interpolate(t, [3.2, 4.2], [0, 1], clamp));
  return (
    <DarkTile>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 90 }}>
        <div style={{ fontFamily: font.serif, fontSize: 230, color: "#f5f5f7", letterSpacing: "-0.02em", lineHeight: 1, opacity: mark, filter: `blur(${(1 - mark) * 14}px)`,
          transform: `scale(${1.15 - 0.15 * mark})`, textShadow: "0 0 90px rgba(41,151,255,0.3)" }}>
          StreamProof
          <span style={{ display: "inline-block", marginLeft: 14, color: c.blueGlow, fontFamily: font.sans, fontSize: 90, verticalAlign: "top", transform: `rotate(${t * 30}deg) scale(${mark})` }}>✦</span>
        </div>
        <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 56, color: "rgba(245,245,247,0.72)", marginTop: 8, opacity: tag, transform: `translateY(${(1 - tag) * 14}px)`,
          letterSpacing: "-0.015em" }}>Evidence a city can act on.</div>
        <div style={{ marginTop: 56, textAlign: "center", opacity: small, transform: `translateY(${(1 - small) * 10}px)` }}>
          <Mono size={16} color="rgba(245,245,247,0.6)">Open source · Built on the HL7 Europe OneAquaHealth FHIR guide · Demo data</Mono>
          <div style={{ marginTop: 14 }}><Mono size={20} color={c.blueGlow}>github.com/midhunrajcharles/StreamProof</Mono></div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, textAlign: "center", opacity: small }}>
        <Mono size={12} color="rgba(255,255,255,0.32)">An independent hackathon entry · Demo data</Mono>
      </div>
      <Sfx at={0.4} name="riser" volume={0.25} />
      <Sfx at={1.8} name="chime" volume={0.35} />
      <Veil color="#f5f5f7" />
    </DarkTile>
  );
};
