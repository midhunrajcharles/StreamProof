/** Scene 3 · Solution (style B). Typewriter "So we built", the wordmark lands, then four glass chips light up
 * one by one with evidence flowing Citizen → Engine → Gate → OneAquaHealth. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Camera3D, Glass, Layer, Sky, Stream, Subtitles, Typewriter, clamp, useSec } from "../components/kit";
import { c, ease, font } from "../theme";
import { BEAT, scene } from "../timing";

const S = scene(3);
const CHIPS = [
  { t: "Citizen", s: "photo · signs · place" },
  { t: "Evidence engine", s: "grade A–D · 7 reasons" },
  { t: "Permitted-use gate", s: "what each level may do" },
  { t: "OneAquaHealth", s: "FHIR · Catalogue · DipteraCAST" },
];

export const S3Solution: React.FC = () => {
  const t = useSec();
  const l = S.lines[0];
  const markAt = l.start + 1.0;
  const chipsAt = l.start + 3.0;
  const mark = ease.outExpo(interpolate(t, [markAt, markAt + 0.8], [0, 1], clamp));
  const up = ease.inOut(interpolate(t, [chipsAt - 0.4, chipsAt + 0.5], [0, 1], clamp));
  const xs = [345, 755, 1165, 1575];
  return (
    <Sky>
      <Camera3D dur={S.duration} rx={[8, 2]} ry={[-5, 5]} z={[-140, 80]}>
        <Layer z={60}>
          <AbsoluteFill style={{ alignItems: "center", top: 300 - up * 160 }}>
            <div style={{ fontFamily: font.sans, fontSize: 44, fontWeight: 500, color: c.grey, height: 60 }}>
              <Typewriter text="So we built" at={0.3} cps={14} caret={t < markAt} />
            </div>
            <div style={{ fontFamily: font.serif, fontSize: 168, color: c.ink, letterSpacing: "-0.02em", opacity: mark,
              transform: `scale(${1.25 - 0.25 * mark})`, filter: `blur(${(1 - mark) * 12}px)`, marginTop: 8 }}>
              StreamProof
              <span style={{ display: "inline-block", marginLeft: 12, color: c.blue, fontFamily: font.sans, fontSize: 70,
                transform: `rotate(${t * 40}deg) scale(${mark})`, verticalAlign: "top" }}>✦</span>
            </div>
            <div style={{ fontFamily: font.sans, fontSize: 30, color: c.grey, opacity: mark, marginTop: -6 }}>
              a trust layer for citizen stream reports · an add-on to the HL7 Europe OneAquaHealth guide
            </div>
          </AbsoluteFill>
        </Layer>
        <Layer z={0}>
          <Stream points={[[xs[0] + 150, 760], [xs[3] - 150, 760]]} at={chipsAt + 0.3} color={c.blue} count={40} speed={0.28} dot={5} seed="sol" />
          {CHIPS.map((ch, i) => {
            const at = chipsAt + i * BEAT;
            const p = ease.back(interpolate(t, [at, at + 0.5], [0, 1], clamp));
            const lit = t > at + 0.5 ? 1 : 0;
            return (
              <div key={ch.t} style={{ position: "absolute", left: xs[i] - 185, top: 690, width: 370, transform: `scale(${p}) translateZ(${i * 10}px)`, opacity: p }}>
                <Glass sheenAt={at + 0.4} style={{ padding: "26px 28px", textAlign: "center",
                  boxShadow: lit ? `0 24px 60px rgba(0,102,204,${0.18 + 0.12 * i / 3}), 0 0 0 2px rgba(0,102,204,0.18)` : undefined }}>
                  <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 29, whiteSpace: "nowrap", color: i === 2 ? c.blue : c.ink }}>{ch.t}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 14, letterSpacing: "0.06em", color: c.grey, marginTop: 8, textTransform: "uppercase" }}>{ch.s}</div>
                </Glass>
              </div>
            );
          })}
        </Layer>
      </Camera3D>
      <Subtitles lines={S.lines} bottom={40} />
    </Sky>
  );
};
