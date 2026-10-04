/** Scene 6 · The standard (style A, dark). The exported record floats in depth; fields light up as they are named
 * and connect to labels; the published trust-level rule feeds the gate; the HL7 validator counts to zero; then the
 * trust level is lowered and the profile itself rejects the record. All values come from the real files. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import data from "../data/fhir-view.json";
import { Camera3D, Check, Hud, Ink, KineticWord, Layer, Mono, Stamp, Stream, Subtitles, clamp, useSec, Sfx } from "../components/kit";
import { c, ease, font } from "../theme";
import { scene } from "../timing";

const S = scene(6);
const L = (i: number) => S.lines[i];

type Row = { text: string; tag?: "code" | "value" | "trust" | "uses" | "profile"; indent: number };
const o = data.observation;
const ROWS: Row[] = [
  { text: "{", indent: 0 },
  { text: `"resourceType": "Observation",`, indent: 1 },
  { text: `"meta": { "profile": [ "${o.meta.profile[0]}", "${o.meta.profile[1]}" ] },`, indent: 1, tag: "profile" },
  { text: `"status": "${o.status}",`, indent: 1 },
  { text: `"code": { "system": "${o.code.coding[0].system}",`, indent: 1, tag: "code" },
  { text: `          "code": "${o.code.coding[0].code}", "display": "${o.code.coding[0].display}" },`, indent: 1, tag: "code" },
  { text: `"valueCodeableConcept": { "system": "${o.valueCodeableConcept.coding[0].system}",`, indent: 1, tag: "value" },
  { text: `          "code": "${o.valueCodeableConcept.coding[0].code}" },`, indent: 1, tag: "value" },
  { text: `"component": [`, indent: 1, tag: "trust" },
  ...o.component.map((cp) => ({ text: `{ "code": "${cp.code}", "value": "${cp.value}" },`, indent: 2,
    tag: (cp.code === "permitted-use" ? "uses" : "trust") as Row["tag"] })),
  { text: "]", indent: 1, tag: "trust" },
  { text: "}", indent: 0 },
];

const LABELS: Record<string, string> = { code: "OAH indicator", value: "what Maria saw", trust: "trust travels with the data", uses: "permitted uses, inside the record" };

export const S6Standard: React.FC = () => {
  const t = useSec();
  const hl: Record<string, number> = {
    code: interpolate(t, [L(1).start, L(1).start + 0.4, L(3).start, L(3).start + 0.3], [0, 1, 1, 0.25], clamp),
    value: interpolate(t, [L(2).start, L(2).start + 0.4, L(3).start, L(3).start + 0.3], [0, 1, 1, 0.25], clamp),
    trust: interpolate(t, [L(3).start, L(3).start + 0.4], [0, 1], clamp),
    uses: interpolate(t, [L(3).start + 0.8, L(3).start + 1.2], [0, 1], clamp),
    profile: interpolate(t, [L(5).start, L(5).start + 0.4], [0, 1], clamp),
  };
  const fly = ease.outExpo(interpolate(t, [0.1, 1.6], [0, 1], clamp));
  const shift = ease.inOut(interpolate(t, [L(4).start - 0.3, L(4).start + 0.9], [0, 1], clamp)); // camera pans to the rule
  const valShift = ease.inOut(interpolate(t, [L(5).start - 0.3, L(5).start + 0.8], [0, 1], clamp)); // and to the validator
  const lowered = t > L(6).start + 1.1;
  const rows = data.validation;
  return (
    <Ink>
      <Camera3D dur={S.duration} rx={[12, 6]} ry={[-16, -8]} z={[-220, 40]}>
        <Layer z={0} style={{ transform: `translateX(${-shift * 520 - valShift * 1350}px)` }}>
          {/* the record */}
          <div style={{ position: "absolute", left: 160, top: 170, width: 1180, transform: `translateZ(${(1 - fly) * -900}px) rotateY(${(1 - fly) * 30}deg)`,
            opacity: fly, fontFamily: font.mono, fontSize: 23, lineHeight: "40px", color: "rgba(255,255,255,0.55)" }}>
            <Mono size={13} color="rgba(255,255,255,0.4)">Bundle excerpt · simplified · Observation (Diptera)</Mono>
            <div style={{ height: 14 }} />
            {ROWS.map((r, i) => {
              const h = r.tag ? hl[r.tag] : 0;
              let text = r.text;
              if (lowered && r.text.includes('"trust-level"')) text = text.replace("expert-verified", "community-supported");
              const red = lowered && r.text.includes('"trust-level"');
              return (
                <div key={i} style={{ paddingLeft: r.indent * 34, position: "relative", whiteSpace: "pre",
                  opacity: interpolate(t, [0.3 + i * 0.05, 0.6 + i * 0.05], [0, 1], clamp),
                  color: red ? c.red : h > 0.5 ? "#ffffff" : undefined,
                  textShadow: h > 0.5 ? `0 0 18px ${r.tag === "uses" || r.tag === "trust" ? "rgba(48,209,88,0.7)" : "rgba(41,151,255,0.8)"}` : undefined,
                  background: h > 0 ? `rgba(41,151,255,${0.10 * h})` : undefined, borderRadius: 6,
                  transform: `translateZ(${h * 40}px)` }}>
                  {text}
                </div>
              );
            })}
          </div>
          {/* labels connected to the lit fields */}
          {(["code", "value", "trust"] as const).map((tag, i) => {
            const p = hl[tag];
            const y = [362, 442, 600][i];
            return p > 0.05 ? (
              <div key={tag} style={{ position: "absolute", left: 1380, top: y - 14, opacity: p, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 80 * p, height: 1.5, background: tag === "trust" ? "#30d158" : c.blueGlow }} />
                <KineticWord text={LABELS[tag].toUpperCase()} at={tag === "code" ? L(1).start + 0.3 : tag === "value" ? L(2).start + 0.2 : L(3).start + 0.3}
                  size={24} family={font.mono} weight={500} color={tag === "trust" ? "#30d158" : c.blueGlow} />
              </div>
            ) : null;
          })}
          {/* the published rule → the gate */}
          <div style={{ position: "absolute", left: 1760, top: 200, width: 560, opacity: shift, fontFamily: font.mono, fontSize: 21,
            color: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: "24px 30px",
            background: "rgba(255,255,255,0.03)" }}>
            <Mono size={13} color="rgba(255,255,255,0.45)">CodeSystem · trust-level · expert-verified</Mono>
            <div style={{ height: 12 }} />
            {data.permits.map((p, i) => (
              <div key={p} style={{ lineHeight: "34px", opacity: interpolate(t, [L(4).start + 0.4 + i * 0.12, L(4).start + 0.6 + i * 0.12], [0.15, 1], clamp),
                color: interpolate(t, [L(4).start + 0.4 + i * 0.12, L(4).start + 0.6 + i * 0.12], [0, 1], clamp) > 0.5 ? "#30d158" : undefined }}>
                permits → {p}
              </div>
            ))}
          </div>
          <Stream points={[[2040, 560], [2040, 640], [2040, 700]]} at={L(4).start + 1.6} color="#30d158" count={14} speed={0.6} dot={4} seed="gate" />
          <div style={{ position: "absolute", left: 1850, top: 710, width: 380, whiteSpace: "nowrap", padding: "18px 22px", borderRadius: 14, border: "2px solid #30d158",
            textAlign: "center", opacity: interpolate(t, [L(4).start + 1.4, L(4).start + 1.9], [0, 1], clamp), color: "#fff", fontFamily: font.mono, fontSize: 20 }}>
            GATE · LOADS AT START-UP
          </div>
          {/* the validator */}
          <div style={{ position: "absolute", left: 2380, top: 160, width: 760, opacity: valShift, fontFamily: font.mono, fontSize: 19, color: "rgba(255,255,255,0.75)" }}>
            <Mono size={13} color="rgba(255,255,255,0.45)">HL7 FHIR Validator · hl7.eu.fhir.oah + StreamProof add-on</Mono>
            <div style={{ height: 14 }} />
            {rows.slice(0, 12).map((r, i) => {
              const p = interpolate(t, [L(5).start + 0.4 + i * 0.12, L(5).start + 0.55 + i * 0.12], [0, 1], clamp);
              return (
                <div key={r.file} style={{ display: "flex", justifyContent: "space-between", lineHeight: "33px", opacity: p, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span>{r.file}</span>
                  <span style={{ color: "#30d158" }}>{r.errors} errors · {r.warnings} warnings</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", lineHeight: "40px", marginTop: 10,
              opacity: interpolate(t, [L(6).start + 1.0, L(6).start + 1.3], [0, 1], clamp), color: c.red, fontWeight: 500 }}>
              <span>NEGATIVE CONTROL · trust level lowered</span><span>rejected by {data.negative.rule}</span>
            </div>
          </div>
        </Layer>
      </Camera3D>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        {t > L(5).start + 2.6 && t < L(6).start + 0.2 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "26px 44px", borderRadius: 20, background: "rgba(10,10,10,0.82)",
            border: "1px solid rgba(48,209,88,0.4)", boxShadow: "0 0 80px rgba(48,209,88,0.25)",
            opacity: interpolate(t, [L(5).start + 2.6, L(5).start + 3.0, L(6).start - 0.2, L(6).start + 0.2], [0, 1, 1, 0], clamp) }}>
            <Check at={L(5).start + 2.7} size={84} color="#30d158" />
            <KineticWord text={`${rows.reduce((a, r) => a + r.errors, 0)} ERRORS · ${rows.reduce((a, r) => a + r.warnings, 0)} WARNINGS`} at={L(5).start + 2.8}
              size={64} color="#ffffff" glow="rgba(48,209,88,0.6)" />
          </div>
        ) : null}
        {t > L(6).start + 1.2 ? (
          <div style={{ position: "absolute", top: 640, left: 760 }}>
            <Stamp at={L(6).start + 1.3} text="Rejected" sub={`by the profile itself · ${data.negative.rule}`} />
          </div>
        ) : null}
      </AbsoluteFill>
      <Sfx at={L(5).start + 2.7} name="check" volume={0.5} />
      <Sfx at={L(6).start + 1.3} name="thud" volume={0.7} />
      <Hud label="What leaves the system · HL7 FHIR R4 · OneAquaHealth guide" dark />
      <Subtitles lines={S.lines} dark />
    </Ink>
  );
};
