/** Scene 2 · Problem (style A, white). Five cities on a hairline; photos stream from each into a CITY box that
 * can't tell what to trust; then the OAH Observation card with its two empty rows: trust? / may be used for? */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { BlurIn, Camera3D, Hud, KineticWord, Layer, Mono, Paper, Stream, Subtitles, clamp, useSec } from "../components/kit";
import { c, ease, font } from "../theme";
import { scene } from "../timing";

const S = scene(2);
const CITIES = ["Coimbra", "Benevento", "Ghent", "Oslo", "Toulouse"];

export const S2Problem: React.FC = () => {
  const t = useSec();
  const [l1, l2, l3] = S.lines;
  const part2 = l3.start - 0.4; // the card takes over
  const a = interpolate(t, [part2 - 0.4, part2 + 0.3], [1, 0], clamp);
  const b = interpolate(t, [part2, part2 + 0.6], [0, 1], clamp);
  const line = ease.out(interpolate(t, [0.1, 1.4], [0, 1], clamp));
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  return (
    <Paper>
      <Camera3D dur={S.duration} rx={[4, 1]} ry={[3, -3]} z={[-80, 60]}>
        <Layer z={0} style={{ opacity: a }}>
          <div style={{ position: "absolute", left: 260, top: 330, width: 1400 * line, height: 2, background: c.hair }} />
          {CITIES.map((name, i) => {
            const x = 260 + i * 350;
            const p = ease.back(interpolate(t, [0.4 + i * 0.12, 0.8 + i * 0.12], [0, 1], clamp));
            return (
              <div key={name} style={{ position: "absolute", left: x - 14, top: 316, textAlign: "center", transform: `scale(${p})` }}>
                <div style={{ width: 28, height: 28, border: `2px solid ${c.hair}`, background: "#fff", borderRadius: 14 }} />
                <div style={{ position: "absolute", top: -42, left: -70, width: 168 }}><Mono size={14} color={c.hair}>{name}</Mono></div>
              </div>
            );
          })}
          {CITIES.map((_, i) => (
            <Stream key={i} points={[[260 + i * 350, 344], [260 + i * 350, 470], [960, 610], [960, 660]]} at={l1.start + 2 + i * 0.15}
              color={c.ink} count={10} speed={0.45} dot={3.5} seed={`p${i}`} />
          ))}
          <div style={{ position: "absolute", left: 810, top: 660, width: 300, height: 150, border: `2px solid ${c.hair}`, borderRadius: 12,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff",
            opacity: interpolate(t, [l1.start + 1.6, l1.start + 2.2], [0, 1], clamp) }}>
            <Mono size={15} color={c.hair}>City</Mono>
            <div style={{ fontFamily: font.sans, fontWeight: 800, fontSize: 64, color: t > l2.start ? c.red : c.hair, lineHeight: 1.1 }}>?</div>
          </div>
          <div style={{ position: "absolute", left: 1150, top: 700 }}>
            {t > l2.start ? <BlurIn at={l2.start + 0.3}><Mono size={16} color={c.red}>which reports can we trust?</Mono></BlurIn> : null}
          </div>
        </Layer>
        <Layer z={40} style={{ opacity: b }}>
          <div style={{ position: "absolute", left: 610, top: 300, width: 700, border: `2px solid ${c.hair}`, borderRadius: 18, background: "#fff",
            padding: "30px 40px", fontFamily: font.mono, fontSize: 24, boxShadow: "0 30px 80px rgba(0,0,0,0.08)" }}>
            <Mono size={14} color={c.grey}>FHIR Observation · OneAquaHealth guide</Mono>
            <div style={{ height: 1, background: c.faint, margin: "16px 0 10px" }} />
            {[["code", "#hydrology"], ["value", '"stagnant water"'], ["subject", "LocationOah"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", lineHeight: "48px" }}>
                <span style={{ width: 230, color: c.grey }}>{k}</span><span style={{ color: c.ink }}>{v}</span>
              </div>
            ))}
            {[["trust", "?"], ["may be used for", "?"]].map(([k, v], i) => (
              <div key={k} style={{ display: "flex", lineHeight: "52px", marginTop: 6, border: `2px dashed rgba(215,0,21,${0.35 + 0.45 * pulse})`,
                borderRadius: 10, padding: "0 14px", opacity: interpolate(t, [l3.start + 2.4 + i * 0.5, l3.start + 2.8 + i * 0.5], [0, 1], clamp) }}>
                <span style={{ width: 216, color: c.red }}>{k}</span><span style={{ color: c.red, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        </Layer>
      </Camera3D>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 96, opacity: b }}>
        <KineticWord text="What was seen. Not how far to trust it." at={part2 + 0.3} size={58} color={c.ink} weight={700} />
      </AbsoluteFill>
      <Hud label="The problem" coords="5 OneAquaHealth pilot cities" />
      <Subtitles lines={S.lines} />
    </Paper>
  );
};
