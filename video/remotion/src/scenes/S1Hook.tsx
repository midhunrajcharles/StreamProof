/** Scene 1 · Hook (style A, dark). Two identical records float in depth. One is stamped REFUSED, the other
 * passes against the OAH profile. Words RUMOUR? / VERIFIED? slam in on the beat. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Camera3D, Hud, Ink, KineticWord, Layer, Mono, Stamp, Subtitles, Typewriter, clamp, useSec, Sfx } from "../components/kit";
import { c, ease, font } from "../theme";
import { BEAT, scene } from "../timing";

const S = scene(1);

const Record: React.FC<{ at: number; x: number; tag: string }> = ({ at, x, tag }) => {
  const t = useSec();
  const p = ease.outExpo(interpolate(t, [at, at + 0.9], [0, 1], clamp));
  const rows: [string, string][] = [
    ["resourceType", '"Observation"'], ["code", "#hydrology  ·  OAH"], ["value", '"stagnant water"'],
    ["subject", "Ribeira de Coselhas"], ["effective", "2026-10-04T18:41Z"], ["status", '"final"'],
  ];
  return (
    <div style={{ position: "absolute", left: x, top: 250, width: 560, opacity: p, transform: `translateY(${(1 - p) * 60}px) rotateY(${(1 - p) * 18}deg)`,
      fontFamily: font.mono, fontSize: 21, color: "rgba(255,255,255,0.86)", border: "1.5px solid rgba(255,255,255,0.22)", borderRadius: 18,
      padding: "28px 34px", background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
      boxShadow: "0 40px 90px rgba(0,0,0,0.6)" }}>
      <Mono size={13} color="rgba(255,255,255,0.45)">Observation · stagnant water · Coimbra</Mono>
      <div style={{ height: 1, background: "rgba(255,255,255,0.14)", margin: "16px 0 18px" }} />
      {rows.map(([k, v], i) => (
        <div key={k} style={{ display: "flex", gap: 18, lineHeight: "40px", opacity: interpolate(t, [at + 0.3 + i * 0.07, at + 0.6 + i * 0.07], [0, 1], clamp) }}>
          <span style={{ color: "rgba(255,255,255,0.4)", width: 190 }}>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div style={{ marginTop: 18 }}><Mono size={13} color="rgba(255,255,255,0.5)">{tag}</Mono></div>
    </div>
  );
};

export const S1Hook: React.FC = () => {
  const t = useSec();
  const l1 = S.lines[0];
  const l2 = S.lines[1];
  const refusedAt = l1.start + 2.6; // "...look exactly the same" lands, then the stamp
  const passAt = refusedAt + BEAT * 2;
  const fadeOut = interpolate(t, [S.duration - 0.5, S.duration], [1, 0], clamp);
  return (
    <Ink>
      <AbsoluteFill style={{ opacity: fadeOut }}>
        <Camera3D dur={S.duration} rx={[10, 3]} ry={[-8, 6]} z={[-260, 60]}>
          <Layer z={-200}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(40% 35% at 50% 50%, rgba(41,151,255,0.10), transparent)" }} />
          </Layer>
          <Layer z={0}>
            <Record at={0.25} x={300} tag="rumour?" />
            <Record at={0.45} x={1060} tag="verified?" />
          </Layer>
          <Layer z={120}>
            <div style={{ position: "absolute", left: 360, top: 430 }}>
              <Stamp at={refusedAt} text="Refused" sub="not verified · blocked by the gate" />
            </div>
            {t > passAt ? (
              <div style={{ position: "absolute", left: 1090, top: 735, fontFamily: font.mono, fontSize: 22, color: "#30d158" }}>
                <Typewriter text="✓ 0 errors · ObservationIndicatorsOah" at={passAt} cps={40} />
              </div>
            ) : null}
          </Layer>
        </Camera3D>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 120 }}>
          {t < l2.start ? (
            <div style={{ display: "flex", gap: 80, opacity: interpolate(t, [l2.start - 0.4, l2.start], [1, 0], clamp) }}>
              <KineticWord text="RUMOUR?" at={l1.start + 0.4} size={84} color="rgba(255,255,255,0.92)" />
              <KineticWord text="VERIFIED?" at={l1.start + 0.4 + BEAT * 2} size={84} color="rgba(255,255,255,0.92)" />
            </div>
          ) : (
            <KineticWord text="TRUST, MACHINE-READABLE" at={l2.start + 0.2} size={74} color="#ffffff" glow="rgba(41,151,255,0.6)" />
          )}
        </AbsoluteFill>
        <Sfx at={refusedAt} name="thud" volume={0.7} />
        <Sfx at={passAt} name="check" volume={0.4} />
        <Hud label="StreamProof · OneAquaHealth IEEE Hackathon · Track 7" dark coords="40.2227° N · 8.4275° W · Coimbra" />
        <Subtitles lines={S.lines} dark />
      </AbsoluteFill>
    </Ink>
  );
};
