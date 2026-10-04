/** Scene 4 · Maria reports (style B). Her real recording plays in a phone floating in 3D over a blurred stream; the
 * footage is cut to each sentence; a hand cursor taps where she tapped; badges, kinetic words and the grade unlock. */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import shot from "../../public/footage/citizen.json";
import { Badge, BeatFlash, BlurIn, Camera3D, Cursor, CursorKey, KineticWord, Layer, Mono, Sky, Subtitles, clamp, useSec, Sfx } from "../components/kit";
import { Cut, FootageCuts, Phone, Shot, Zoom, vt } from "../components/footage";
import { c, ease, font } from "../theme";
import { BEAT, nearestBeat, scene } from "../timing";

const S = scene(4);
const L = (i: number) => S.lines[i].start;
const SH = shot as Shot;
const PHONE_W = 410;
const K = PHONE_W / SH.css.width;

// footage moments (seconds into the recording)
const F = {
  home: Math.max(0, vt(SH, "home") - 0.2), lang: vt(SH, "language"), pt: vt(SH, "portugues"), rep: vt(SH, "reportar"),
  cam: vt(SH, "camera-live"), cap: vt(SH, "capture"), chip1: vt(SH, "chip-stagnant"), chip2: vt(SH, "chip-mosquitoes"),
  loc: vt(SH, "locate"), located: vt(SH, "located"), submit: vt(SH, "submit"), card: vt(SH, "card"), reasons: vt(SH, "reasons"),
};

const CUTS: Cut[] = [
  { at: 0, until: L(2) - 0.1, from: F.home, to: F.pt + 1.3 },
  { at: L(2) - 0.1, until: L(3) - 0.2, from: F.rep - 0.5, to: F.cam + 1.6 },
  { at: L(3) - 0.2, until: L(4) - 0.1, from: F.cap - 0.6, to: Math.max(F.chip1, F.chip2) + 0.7 },
  { at: L(4) - 0.1, until: L(5) - 0.1, from: F.loc - 0.5, to: F.submit + 0.4 },
  { at: L(5) - 0.1, until: L(6) - 0.1, from: F.card - 0.2, to: F.card + 2.4 },
  { at: L(6) - 0.1, until: L(7) - 0.1, from: F.reasons - 0.3, to: F.reasons + 2.6 },
  { at: L(7) - 0.1, until: S.duration, from: F.reasons + 2.6, to: F.reasons + 5.2 },
];

/** Scene time at which a footage moment is on screen (first cut that contains it). */
function sceneTime(ft: number): number | null {
  for (const cu of CUTS) {
    const slot = cu.until - cu.at;
    const rate = cu.to !== undefined ? Math.max(0.55, Math.min(1.8, (cu.to - cu.from) / slot)) : 1;
    if (ft >= cu.from && ft <= cu.from + slot * rate) return cu.at + (ft - cu.from) / rate;
  }
  return null;
}

const TAPS: CursorKey[] = SH.events.filter((e) => e.click && e.x !== undefined).flatMap((e) => {
  const st = sceneTime(e.vt ?? e.t - (SH.video_offset ?? 0));
  return st === null ? [] : [{ t: st - 0.45, x: e.x! * K, y: e.y! * K }, { t: st, x: e.x! * K, y: e.y! * K, click: true }];
});

const Icon = {
  cam: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  pin: <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  people: <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14c3 0 6 2 6 5" /></svg>,
};

export const S4Citizen: React.FC = () => {
  const t = useSec();
  const tilt = interpolate(t, [0, S.duration], [-14, -6], clamp);
  const unlock = nearestBeat(S.start + L(5) + 1.2) - S.start; // the grade lands on a beat
  const zoomKeys = [
    { t: 0, s: 1, x: 0.5, y: 0.3 }, { t: L(5) - 0.1, s: 1, x: 0.5, y: 0.3 }, { t: L(5) + 0.6, s: 1.35, x: 0.3, y: 0.62 },
    { t: L(6) - 0.2, s: 1.35, x: 0.3, y: 0.62 }, { t: L(6) + 0.4, s: 1.12, x: 0.5, y: 0.5 }, { t: S.duration, s: 1.12, x: 0.5, y: 0.5 },
  ];
  return (
    <Sky>
      <AbsoluteFill style={{ opacity: 0.55 }}>
        <Img src={staticFile("bg/stream.png")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) saturate(120%)", transform: "scale(1.15)" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(240,246,255,0.92) 0%, rgba(240,246,255,0.65) 45%, rgba(240,246,255,0.1) 100%)" }} />
      <Camera3D dur={S.duration} rx={[4, 2]} ry={[3, -2]} z={[-60, 50]}>
        <Layer z={40}>
          <div style={{ position: "absolute", left: 1130, top: 70, transform: `rotateY(${tilt}deg) rotateX(3deg)`, transformStyle: "preserve-3d" }}>
            <Phone width={PHONE_W} sheen={interpolate(t, [0, S.duration], [0, 1])}>
              <Zoom keys={zoomKeys}>
                <FootageCuts src="footage/citizen.mp4" cuts={CUTS} length={SH.duration} style={{ width: "100%", height: "100%" }} />
                <Cursor keys={TAPS} hand scale={0.9} />
              </Zoom>
            </Phone>
          </div>
        </Layer>
        <Layer z={90}>
          <Badge at={sceneTime(F.cap) ?? L(3)} x={1110} y={500} icon={Icon.cam} />
          <Badge at={sceneTime(F.located) ?? L(4) + 1} x={1610} y={720} icon={Icon.pin} />
          <Badge at={L(7) + 0.3} x={1100} y={820} icon={Icon.people} color="#248a3d" />
        </Layer>
        <Layer z={20}>
          <div style={{ position: "absolute", left: 150, top: 300, width: 820 }}>
            {t < L(2) - 0.2 ? (
              <BlurIn at={0.3}>
                <Mono size={18} color={c.blue}>Citizen · Coimbra</Mono>
                <div style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 92, color: c.ink, lineHeight: 1.02, marginTop: 14 }}>Maria walks<br />the Coselhas.</div>
                <div style={{ fontFamily: font.sans, fontSize: 30, color: c.grey, marginTop: 22 }}>English → Português, in one tap.</div>
              </BlurIn>
            ) : t < L(3) - 0.2 ? (
              <KineticWord text="Camera, right in the page." at={L(2) + 1.4} size={74} color={c.ink} weight={700} />
            ) : t < L(4) - 0.1 ? (
              <div>
                <KineticWord text="Stagnant water" at={L(3) + 0.05} size={86} color={c.ink} weight={700} />
                <KineticWord text="+ mosquitoes" at={L(3) + 0.05 + BEAT * 2} size={86} color={c.blue} weight={700} />
              </div>
            ) : t < L(5) - 0.1 ? (
              <KineticWord text="Tag. Pin. Send." at={L(4) + 0.3} size={96} color={c.ink} weight={800} />
            ) : t < L(7) - 0.1 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
                <div style={{ fontFamily: font.serif, fontSize: 300, lineHeight: 0.9, color: c.blue,
                  transform: `scale(${0.6 + 0.4 * ease.back(interpolate(t, [unlock, unlock + 0.5], [0, 1], clamp))})`,
                  opacity: interpolate(t, [unlock - 0.05, unlock + 0.15], [0, 1], clamp),
                  textShadow: "0 0 60px rgba(0,102,204,0.35)" }}>A</div>
                <div>
                  <KineticWord text="STRONG EVIDENCE" at={unlock + 0.3} size={46} color={c.ink} weight={800} />
                  <BlurIn at={unlock + 0.7}><div style={{ fontFamily: font.sans, fontSize: 30, color: c.grey, marginTop: 10 }}>7 reasons anyone can read</div></BlurIn>
                </div>
              </div>
            ) : (
              <div>
                <Mono size={18} color={c.green}>2 other people · within 500 m</Mono>
                <KineticWord text="COMMUNITY-SUPPORTED" at={L(7) + 1.0} size={70} color={c.green} weight={800} />
              </div>
            )}
          </div>
        </Layer>
      </Camera3D>
      {TAPS.filter((k) => k.click).map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.45} />)}
      <Sfx at={unlock - 0.05} name="chime" volume={0.35} />
      <BeatFlash at={unlock} strength={0.25} />
      <div style={{ position: "absolute", left: 44, top: 40, fontFamily: font.mono, fontSize: 14, letterSpacing: "0.1em", color: "rgba(0,0,0,0.5)" }}>
        DEMO DATA · REAL STREAM GEOMETRY · RIBEIRA DE COSELHAS, COIMBRA
      </div>
      <Subtitles lines={S.lines} bottom={70} left={150} width={820} />
    </Sky>
  );
};
