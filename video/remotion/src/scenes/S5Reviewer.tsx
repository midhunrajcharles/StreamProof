/** Scene 5 · The reviewer (style A, white). The real organiser screens in a browser window, pushed in on what matters:
 * nearby evidence, the mission, the refused export (red stamp), verify, then the decision-grade unlock and the advisory. */
import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import shot from "../../public/footage/reviewer.json";
import { BeatFlash, Camera3D, Check, Cursor, CursorKey, Hud, KineticWord, Layer, Mono, Paper, Stamp, Subtitles, clamp, useSec, Sfx } from "../components/kit";
import { Cut, FootageCuts, Shot, Window, Zoom, vt } from "../components/footage";
import { c, ease, font } from "../theme";
import { nearestBeat, scene } from "../timing";

const S = scene(5);
const L = (i: number) => S.lines[i].start;
const SH = shot as Shot;
const WIN = 1480;
const K = WIN / SH.css.width;
const has = (l: string) => SH.events.some((e) => e.label === l);
const F = {
  detail: Math.max(0, vt(SH, "detail") - 0.1), nearby: vt(SH, "nearby"), mission: has("mission") ? vt(SH, "mission") : vt(SH, "nearby") + 1.5,
  exp: vt(SH, "export"), refused: vt(SH, "refused"), vopen: vt(SH, "verify-open"), verify: vt(SH, "verify"), verified: vt(SH, "verified"),
  advisory: vt(SH, "advisory"),
};
const CUTS: Cut[] = [
  { at: 0, until: L(1) - 0.1, from: F.detail, to: F.nearby + 1.4 },
  { at: L(1) - 0.1, until: L(2) - 0.1, from: F.mission - 0.5, to: F.mission + 1.8 },
  { at: L(2) - 0.1, until: L(3), from: F.exp - 0.6, to: F.exp + 0.15 },
  { at: L(3), until: L(5) - 0.1, from: F.refused, to: F.refused + 2.0 },
  { at: L(5) - 0.1, until: L(6) + 0.2, from: F.vopen - 0.5, to: F.verify + 0.3 },
  { at: L(6) + 0.2, until: L(6) + 3.4, from: F.verified - 0.2, to: F.verified + 2.4 },
  { at: L(6) + 3.4, until: S.duration, from: F.advisory - 0.6, to: F.advisory + 3.2 },
];
function sceneTime(ft: number): number | null {
  for (const cu of CUTS) {
    const slot = cu.until - cu.at;
    const rate = cu.to !== undefined ? Math.max(0.55, Math.min(1.8, (cu.to - cu.from) / slot)) : 1;
    if (ft >= cu.from && ft <= cu.from + slot * rate) return cu.at + (ft - cu.from) / rate;
  }
  return null;
}
const CLICKS: CursorKey[] = SH.events.filter((e) => e.click && e.x !== undefined).flatMap((e) => {
  const st = sceneTime(e.vt ?? e.t - (SH.video_offset ?? 0));
  return st === null ? [] : [{ t: st - 0.5, x: e.x! * K, y: e.y! * K }, { t: st, x: e.x! * K, y: e.y! * K, click: true }];
});

const LADDER = ["Report", "Assessed", "Community", "Expert", "Decision"];

/** The unlock: a ring bursts, particles fly out, the ladder fills to the last rung, DECISION-GRADE lands. */
const Unlock: React.FC<{ at: number }> = ({ at }) => {
  const t = useSec();
  if (t < at - 0.1 || t > at + 3.3) return null;
  const k = t - at;
  const ring = ease.outExpo(interpolate(k, [0, 0.9], [0, 1], clamp));
  const fade = interpolate(k, [2.7, 3.3], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: fade, background: `rgba(10,10,10,${0.78 * Math.min(1, k * 4)})` }}>
      <div style={{ position: "absolute", width: 300 + ring * 1300, height: 300 + ring * 1300, borderRadius: "50%",
        border: `3px solid rgba(48,209,88,${0.8 * (1 - ring)})`, boxShadow: `0 0 80px rgba(48,209,88,${0.5 * (1 - ring)})` }} />
      {Array.from({ length: 90 }, (_, i) => {
        const a = random(`ua${i}`) * Math.PI * 2;
        const r = ease.outExpo(interpolate(k, [0, 1.4], [0, 1], clamp)) * (260 + random(`ur${i}`) * 620);
        return <div key={i} style={{ position: "absolute", left: 960 + Math.cos(a) * r, top: 540 + Math.sin(a) * r, width: 6, height: 6, borderRadius: 3,
          background: i % 3 ? "#30d158" : "#fff", opacity: 1 - interpolate(k, [0.6, 1.6], [0, 1], clamp), boxShadow: "0 0 12px #30d158" }} />;
      })}
      <div style={{ display: "flex", gap: 14, marginBottom: 40 }}>
        {LADDER.map((s, i) => {
          const on = k > 0.25 + i * 0.12;
          return (
            <div key={s} style={{ width: 170, textAlign: "center" }}>
              <div style={{ height: 10, borderRadius: 5, background: on ? (i === 4 ? "#30d158" : "#fff") : "rgba(255,255,255,0.15)",
                boxShadow: on && i === 4 ? "0 0 24px #30d158" : undefined }} />
              <div style={{ marginTop: 10, fontFamily: font.mono, fontSize: 15, letterSpacing: "0.08em", color: on ? "#fff" : "rgba(255,255,255,0.35)" }}>{s.toUpperCase()}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Check at={at + 0.75} size={110} color="#30d158" />
        <KineticWord text="DECISION-GRADE" at={at + 0.8} size={120} color="#ffffff" glow="rgba(48,209,88,0.75)" />
      </div>
      <div style={{ marginTop: 22, opacity: interpolate(k, [1.3, 1.7], [0, 1], clamp) }}>
        <Mono size={18} color="rgba(255,255,255,0.75)">2 different people · both expert-verified · within 500 m and 14 days</Mono>
      </div>
    </AbsoluteFill>
  );
};

export const S5Reviewer: React.FC = () => {
  const t = useSec();
  const refusedAt = L(3);
  const unlockAt = nearestBeat(S.start + L(6) + 1.6) - S.start;
  const zoom = [
    { t: 0, s: 1.0, x: 0.5, y: 0.4 }, { t: 0.8, s: 1.0, x: 0.5, y: 0.4 }, { t: L(0) + 2.4, s: 1.55, x: 0.72, y: 0.62 },
    { t: L(1) + 1.2, s: 1.55, x: 0.72, y: 0.62 }, { t: L(2) + 0.2, s: 1.25, x: 0.66, y: 0.5 }, { t: L(3) + 0.3, s: 1.7, x: 0.72, y: 0.55 },
    { t: L(5) - 0.2, s: 1.7, x: 0.72, y: 0.55 }, { t: L(5) + 0.6, s: 1.15, x: 0.5, y: 0.45 }, { t: L(6) + 3.3, s: 1.15, x: 0.5, y: 0.45 },
    { t: L(6) + 3.6, s: 1.0, x: 0.5, y: 0.4 }, { t: L(7) - 0.4, s: 1.0, x: 0.5, y: 0.4 }, { t: L(7) + 1.0, s: 1.75, x: 0.5, y: 0.5 },
  ];
  return (
    <Paper>
      <Camera3D dur={S.duration} rx={[5, 2]} ry={[-4, 3]} z={[-80, 30]}>
        <Layer z={0}>
          <div style={{ position: "absolute", left: (1920 - WIN) / 2, top: 92 }}>
            <Window width={WIN}>
              <Zoom keys={zoom}>
                <FootageCuts src="footage/reviewer.mp4" cuts={CUTS} length={SH.duration} style={{ width: "100%", height: "100%" }} />
                <Cursor keys={CLICKS} scale={1} />
              </Zoom>
            </Window>
          </div>
        </Layer>
        <Layer z={140}>
          <div style={{ position: "absolute", left: 1040, top: 470 }}>
            <Stamp at={refusedAt} until={L(5) + 0.2} text="Refused" sub="needs Expert-verified · permitted-use gate" />
          </div>
        </Layer>
      </Camera3D>
      {CLICKS.filter((k) => k.click).map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.4} />)}
      <Sfx at={refusedAt} name="thud" volume={0.75} />
      <Sfx at={unlockAt - 1.55} name="riser" volume={0.45} />
      <Sfx at={unlockAt + 0.75} name="chime" volume={0.5} />
      <BeatFlash at={refusedAt} color="#d70015" strength={0.12} />
      <Unlock at={unlockAt} />
      {t > L(7) - 0.2 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 70 }}>
          <KineticWord text="ADVISORY · NEVER A DIAGNOSIS" at={L(7) + 0.1} size={46} color={c.ink} weight={800} />
        </AbsoluteFill>
      ) : null}
      <Hud label="Coimbra pilot · reviewer view · demo data" />
      <Subtitles lines={S.lines} bottom={30} />
    </Paper>
  );
};
