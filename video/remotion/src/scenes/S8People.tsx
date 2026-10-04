/** Scene 8 · People and reach (style B). The signed record and the tamper check failing; then the five OneAquaHealth
 * streams light up as a montage; then the app's own "Report a stream" rolls through all 45 languages. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import shot from "../../public/footage/people.json";
import langs from "../data/langs.json";
import { Badge, BlurIn, Camera3D, Cursor, CursorKey, KineticWord, Layer, Mono, Sky, Subtitles, clamp, useSec, Sfx } from "../components/kit";
import { Cut, FootageCuts, Phone, Shot, vt } from "../components/footage";
import { StreamMap } from "../components/maps";
import { c, ease, font } from "../theme";
import { BEAT, scene } from "../timing";

const S = scene(8);
const L = (i: number) => S.lines[i].start;
const SH = shot as Shot;
const PW = 380;
const K = PW / SH.css.width;
const F = { valid: Math.max(0, vt(SH, "valid") - 0.1), check: vt(SH, "check"), mismatch: vt(SH, "mismatch") };
const CUTS: Cut[] = [
  { at: 0, until: L(0) + 2.2, from: F.valid, to: F.valid + 2.0 },
  { at: L(0) + 2.2, until: L(1) - 0.1, from: F.check - 1.0, to: F.mismatch + 1.6 },
];
const CLICKS: CursorKey[] = SH.events.filter((e) => e.click && e.x !== undefined).flatMap((e) => {
  const ft = e.vt ?? e.t;
  const cu = CUTS[1];
  const rate = Math.max(0.55, Math.min(1.8, (cu.to! - cu.from) / (cu.until - cu.at)));
  const st = cu.at + (ft - cu.from) / rate;
  return [{ t: st - 0.45, x: e.x! * K, y: e.y! * K }, { t: st, x: e.x! * K, y: e.y! * K, click: true }];
});
const CITIES = [["coselhas", "Coimbra"], ["sabato-benevento", "Benevento"], ["leie-gent", "Ghent"], ["akerselva", "Oslo"], ["hers-mort-toulouse", "Toulouse"]];
const LANGS = langs as { code: string; name: string; phrase: string; rtl: boolean }[];

const LanguageRoll: React.FC<{ at: number }> = ({ at }) => {
  const t = useSec();
  const k = Math.max(0, t - at);
  const idx = Math.min(LANGS.length - 1, Math.floor(k / (BEAT / 2)));
  const cur = LANGS[idx];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 260, display: "flex", alignItems: "center", justifyContent: "center", gap: 70 }}>
      <div style={{ width: 360, height: 420, overflow: "hidden", position: "relative",
        maskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)", WebkitMaskImage: "linear-gradient(transparent, black 30%, black 70%, transparent)" }}>
        <div style={{ position: "absolute", top: 180 - idx * 60, transition: "none" }}>
          {LANGS.map((l, i) => (
            <div key={l.code} style={{ height: 60, display: "flex", alignItems: "center", gap: 14, fontFamily: font.sans, fontSize: i === idx ? 32 : 26,
              color: i === idx ? c.ink : "rgba(0,0,0,0.3)", fontWeight: i === idx ? 700 : 400 }}>
              <span style={{ fontFamily: font.mono, fontSize: 14, color: c.blue, width: 34 }}>{l.code.toUpperCase()}</span>{l.name}
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 2, height: 300, background: "linear-gradient(transparent, #0066cc, transparent)" }} />
      <div style={{ width: 800 }}>
        <Mono size={16} color={c.blue}>Report a stream · in the app, in {LANGS.length} languages</Mono>
        <div key={idx} style={{ fontFamily: font.sans, fontWeight: 700, fontSize: 70, color: c.ink, marginTop: 12, direction: cur.rtl ? "rtl" : "ltr",
          textAlign: "left", opacity: ease.out(Math.min(1, ((k % (BEAT / 2)) / (BEAT / 2)) * 3)) }}>{cur.phrase}</div>
      </div>
    </div>
  );
};

export const S8People: React.FC = () => {
  const t = useSec();
  const montageAt = L(1) - 0.1;
  const rollAt = L(1) + 4.0;
  return (
    <Sky>
      {t < montageAt ? (
        <Camera3D dur={montageAt} rx={[3, 1]} ry={[8, 2]} z={[-60, 40]}>
          <Layer z={0}>
            <div style={{ position: "absolute", left: 1150, top: 90, transform: "rotateY(-10deg)" }}>
              <Phone width={PW}>
                <FootageCuts src="footage/people.mp4" cuts={CUTS} length={SH.duration} style={{ width: "100%", height: "100%" }} />
                <Cursor keys={CLICKS} hand scale={0.9} />
              </Phone>
            </div>
          </Layer>
          <Layer z={60}>
            <div style={{ position: "absolute", left: 160, top: 330, width: 820 }}>
              <BlurIn at={0.3}><Mono size={18} color={c.blue}>Recognition · Ed25519 signature</Mono></BlurIn>
              {t < L(0) + 2.6 ? (
                <KineticWord text="A signed record." at={0.6} size={88} color={c.ink} weight={800} />
              ) : (
                <KineticWord text="Change one value: it fails." at={L(0) + 2.7} size={70} color="#d70015" weight={800} />
              )}
            </div>
            {t < L(0) + 2.4 ? (
              <Badge at={L(0) + 0.6} x={1150} y={420} color="#248a3d"
                icon={<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4"><path d="M5 12l5 5 9-10" /></svg>} />
            ) : (
              <Badge at={L(0) + 3.2} x={1150} y={420} color="#d70015"
                icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6"><path d="M6 6l12 12M18 6L6 18" /></svg>} />
            )}
          </Layer>
        </Camera3D>
      ) : t < rollAt ? (
        <AbsoluteFill>
          <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center" }}>
            <KineticWord text="Five OneAquaHealth cities. Any city by search." at={montageAt + 0.1} size={52} color={c.ink} weight={800} />
          </div>
          <div style={{ position: "absolute", top: 260, left: 60, right: 60, display: "flex", justifyContent: "space-between" }}>
            {CITIES.map(([id, city], i) => {
              const at = montageAt + 0.3 + i * (BEAT / 1.2);
              const p = ease.back(interpolate(t, [at, at + 0.5], [0, 1], clamp));
              return (
                <div key={id} style={{ width: 340, height: 520, borderRadius: 26, padding: 18, background: "rgba(10,25,45,0.88)", transform: `scale(${p}) translateY(${(1 - p) * 40}px)`,
                  opacity: p, boxShadow: "0 30px 60px rgba(0,40,90,0.3)" }}>
                  <Mono size={14} color="rgba(255,255,255,0.7)">{city}</Mono>
                  <div style={{ marginTop: 14 }}><StreamMap id={id} w={304} h={420} at={at + 0.2} pulses={8} dark /></div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      ) : (
        <LanguageRoll at={rollAt} />
      )}
      {CLICKS.filter((k) => k.click).map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.4} />)}
      <Sfx at={L(0) + 3.2} name="thud" volume={0.55} />
      <Subtitles lines={S.lines} bottom={36} />
    </Sky>
  );
};
