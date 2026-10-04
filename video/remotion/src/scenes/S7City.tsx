/** Scene 7 · For the city (mixed). The brief's real Catalogue card; the animated Coselhas map with its under-observed
 * stretches pulsing, a mission sent; then the DipteraCAST ground truth, with the real CSV rows sliding out. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import shot from "../../public/footage/city.json";
import coverage from "../data/coverage.json";
import gtCsv from "../data/groundtruth.json";
import { BlurIn, Camera3D, Cursor, CursorKey, Glass, Hud, KineticWord, Layer, Mono, Sky, Subtitles, clamp, useSec, Sfx } from "../components/kit";
import { Cut, FootageCuts, Shot, Window, Zoom, vt } from "../components/footage";
import { StreamMap, stream } from "../components/maps";
import { c, font } from "../theme";
import { scene } from "../timing";

const S = scene(7);
const L = (i: number) => S.lines[i].start;
const SH = shot as Shot;
const WIN = 1180;
const K = WIN / SH.css.width;
const F = { measures: vt(SH, "measures"), coverage: vt(SH, "coverage"), ask: vt(SH, "ask"), gt: vt(SH, "groundtruth") };
const CUTS: Cut[] = [
  { at: 0, until: L(1) - 0.1, from: F.measures - 0.2, to: F.measures + 3.4 },
  { at: L(1) - 0.1, until: L(2) - 0.1, from: F.coverage - 0.3, to: F.ask + 1.6 },
  { at: L(2) - 0.1, until: S.duration, from: F.gt - 0.3, to: F.gt + 2.4 },
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
const COV = coverage as { reach_m: number; under: { id: string; status: string; start_m: number; label: string }[]; covered: number; total: number };
const ALL = (gtCsv as { rows: string[][] }).rows;
const PRESENT = ALL.filter((r) => r[6] === "present");
const SEEN = ALL.filter((r) => r[6] !== "present");
// interleave: present, not seen, present ... (both kinds are in the export)
const ROWS = { rows: Array.from({ length: 7 }, (_, i) => (i % 2 === 0 ? PRESENT[i / 2] : SEEN[(i - 1) / 2])).filter(Boolean) as string[][] };

export const S7City: React.FC = () => {
  const t = useSec();
  const co = stream("coselhas");
  const hl = COV.under.map((u, i) => ({ from: u.start_m, to: u.start_m + COV.reach_m, color: u.status === "none" ? "#ff453a" : "#ff9f0a", at: L(1) + 0.6 + i * 0.25 }));
  const showMap = t > L(1) - 0.2 && t < L(2) - 0.1;
  return (
    <Sky>
      <Camera3D dur={S.duration} rx={[5, 2]} ry={[5, -4]} z={[-90, 40]}>
        <Layer z={0}>
          <div style={{ position: "absolute", left: 650, top: 150 }}>
            <Window width={WIN}>
              <Zoom keys={[{ t: 0, s: 1.25, x: 0.35, y: 0.3 }, { t: L(1) - 0.3, s: 1.45, x: 0.3, y: 0.35 }, { t: L(1), s: 1.2, x: 0.4, y: 0.75 },
                { t: L(2) - 0.2, s: 1.2, x: 0.4, y: 0.75 }, { t: L(2) + 0.2, s: 1.5, x: 0.5, y: 0.45 }, { t: S.duration, s: 1.55, x: 0.5, y: 0.45 }]}>
                <FootageCuts src="footage/city.mp4" cuts={CUTS} length={SH.duration} style={{ width: "100%", height: "100%" }} />
                <Cursor keys={CLICKS} />
              </Zoom>
            </Window>
          </div>
        </Layer>
        <Layer z={110}>
          {showMap ? (
            <div style={{ position: "absolute", left: 70, top: 230, opacity: interpolate(t, [L(1) - 0.2, L(1) + 0.4, L(2) - 0.6, L(2) - 0.1], [0, 1, 1, 0], clamp) }}>
              <Glass dark style={{ width: 620, height: 520, padding: 26 }} sheenAt={L(1) + 0.2}>
                <Mono size={13} color="rgba(255,255,255,0.6)">Ribeira de Coselhas · 500 m stretches · last 30 days</Mono>
                <div style={{ marginTop: 8 }}>
                  <StreamMap id="coselhas" w={570} h={380} at={L(1) - 0.2} highlight={hl} pulses={10} dark />
                </div>
                <div style={{ display: "flex", gap: 22, fontFamily: font.mono, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  <span><span style={{ color: "#ff453a" }}>■</span> no reports</span><span><span style={{ color: "#ff9f0a" }}>■</span> one observer</span>
                  <span><span style={{ color: "#38bdf8" }}>■</span> {COV.covered} of {COV.total} covered</span>
                </div>
              </Glass>
            </div>
          ) : null}
          {t < L(1) - 0.1 ? (
            <div style={{ position: "absolute", left: 90, top: 330, width: 520 }}>
              <BlurIn at={0.4}><Mono size={17} color={c.blue}>OneAquaHealth Catalogue of Measures</Mono></BlurIn>
              <KineticWord text="Real measures." at={0.8} size={76} color={c.ink} weight={800} />
              <KineticWord text="Section. Page." at={1.5} size={76} color={c.blue} weight={800} />
              <BlurIn at={2.4}><div style={{ fontFamily: font.sans, fontSize: 26, color: c.grey, marginTop: 14 }}>D2.4 · Dias, Serra, Feio · CC BY 4.0</div></BlurIn>
            </div>
          ) : null}
          {t > L(2) - 0.1 ? (
            <div style={{ position: "absolute", left: 130, top: 250, width: 540 }}>
              <KineticWord text="Ground truth" at={L(2) + 0.1} size={70} color={c.ink} weight={800} />
              <KineticWord text="for DipteraCAST" at={L(2) + 0.5} size={56} color={c.blue} weight={700} />
              <div style={{ marginTop: 26 }}>
                {ROWS.rows.slice(0, 7).map((r, i) => {
                  const p = interpolate(t, [L(2) + 1.0 + i * 0.16, L(2) + 1.4 + i * 0.16], [0, 1], clamp);
                  return (
                    <div key={i} style={{ display: "flex", gap: 14, fontFamily: font.mono, fontSize: 16, lineHeight: "32px", opacity: p,
                      transform: `translateX(${(1 - p) * -60}px)`, color: c.ink }}>
                      <span style={{ width: 90 }}>{r[0]}</span><span style={{ width: 110, color: c.grey }}>{r[3]}</span>
                      <span style={{ width: 92, color: r[6] === "present" ? "#d70015" : "#248a3d", fontWeight: 600 }}>{r[6]}</span>
                      <span style={{ color: c.grey }}>grade {r[10]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Layer>
      </Camera3D>
      {CLICKS.filter((k) => k.click).map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.4} />)}
      <Hud label="For the city · River Health Brief · demo data" />
      <Subtitles lines={S.lines} bottom={34} />
    </Sky>
  );
};

export const _unused = stream;
