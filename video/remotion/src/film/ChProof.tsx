/** Chapter 5 · Proof (dark). The official HL7 validator, file by file: 0 errors, 0 warnings. Then the negative control. */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Glass, Mono, Sfx, Stamp, clamp, useSec } from "../components/kit";
import { c, ease, font } from "../theme";
import { DarkTile, DemoLabel, Eyebrow, Veil } from "./ui";

// the files the validator really checked (fhir/validation): the 4 example Bundles and the 14 published definitions
const FILES = [
  "Bundle-verified-report-example.json", "Bundle-all-clear-example.json", "Bundle-proposed-signs-example.json", "Bundle-diptera-ground-truth-example.json",
  "CodeSystem-citizen-sign.json", "CodeSystem-evidence-attribute.json", "CodeSystem-evidence-grade.json", "CodeSystem-permitted-use.json",
  "CodeSystem-proposed-oah-indicator.json", "CodeSystem-trust-level.json", "ConceptMap-citizen-sign-to-oah.json",
  "StructureDefinition-streamproof-location.json", "StructureDefinition-streamproof-observation.json", "StructureDefinition-streamproof-provenance.json",
  "ValueSet-citizen-sign.json", "ValueSet-evidence-grade.json", "ValueSet-permitted-use.json", "ValueSet-trust-level.json",
];
const ROW = 33, STEP = 0.2, T0 = 1.0;

export const ChProof: React.FC = () => {
  const t = useSec();
  const done = T0 + FILES.length * STEP;
  const count = Math.max(0, Math.min(FILES.length, Math.floor((t - T0) / STEP) + 1));
  const big = ease.outExpo(interpolate(t, [done - 0.4, done + 0.6], [0, 1], clamp));
  const neg = ease.out(interpolate(t, [done + 1.6, done + 2.2], [0, 1], clamp));
  const cap = ease.out(interpolate(t, [done + 3.2, done + 3.9], [0, 1], clamp));
  return (
    <DarkTile>
      <Eyebrow x={120} y={250} dark>05 · Proof · HL7 FHIR Validator 6.10.4</Eyebrow>
      <div style={{ position: "absolute", left: 120, top: 300 }}>
        <div style={{ fontFamily: font.sans, fontWeight: 800, fontSize: 142, lineHeight: 0.98, letterSpacing: "-0.045em", color: "#f5f5f7",
          opacity: Math.min(1, 0.25 + big), transform: `translateY(${(1 - big) * 16}px)` }}>0 errors.</div>
        <div style={{ fontFamily: font.sans, fontWeight: 800, fontSize: 142, lineHeight: 0.98, letterSpacing: "-0.045em", color: "#30d158",
          textShadow: "0 0 70px rgba(48,209,88,0.4)", opacity: Math.min(1, 0.25 + big), transform: `translateY(${(1 - big) * 16}px)` }}>0 warnings.</div>
        <div style={{ fontFamily: font.sans, fontWeight: 500, fontSize: 32, lineHeight: 1.3, color: "rgba(245,245,247,0.62)", marginTop: 26, width: 760,
          opacity: Math.min(1, 0.3 + big) }}>Checked against the official OneAquaHealth FHIR profiles.</div>
        <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 36, lineHeight: 1.25, color: "#ff453a", marginTop: 30, width: 760, opacity: cap,
          transform: `translateY(${(1 - cap) * 12}px)` }}>An unverified record can't validate at all.</div>
      </div>
      <div style={{ position: "absolute", left: 1000, top: 150, width: 810 }}>
        <Glass dark radius={26} style={{ padding: "26px 30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <Mono size={14} color="rgba(255,255,255,0.5)">hl7 fhir validator · hl7.eu.fhir.oah + streamproof add-on</Mono>
            <Mono size={14} color="#30d158">{count} / {FILES.length}</Mono>
          </div>
          {FILES.map((f, i) => {
            const on = t >= T0 + i * STEP;
            return (
              <div key={f} style={{ height: ROW, display: "flex", alignItems: "center", gap: 14, opacity: on ? 1 : 0.14, fontFamily: font.mono, fontSize: 16.5,
                color: "rgba(245,245,247,0.88)", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                <span style={{ width: 22, color: "#30d158", fontWeight: 700 }}>{on ? "✓" : ""}</span>
                <span style={{ flex: 1 }}>{f}</span>
                <span style={{ color: "rgba(48,209,88,0.9)" }}>{on ? "0 errors · 0 warnings" : ""}</span>
              </div>
            );
          })}
          <div style={{ height: ROW + 12, marginTop: 12, display: "flex", alignItems: "center", gap: 14, opacity: neg, fontFamily: font.mono, fontSize: 16.5,
            color: "#ff453a", borderTop: "1px solid rgba(255,69,58,0.4)" }}>
            <span style={{ width: 22, fontWeight: 700 }}>✕</span>
            <span style={{ flex: 1 }}>NEGATIVE CONTROL · unverified record</span>
            <span>rejected by sp-obs-1</span>
          </div>
        </Glass>
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <Stamp at={done + 1.7} text="Rejected" sub="only sp-obs-1 objects" rotate={-6} style={{ left: 250, top: 560 }} />
        </AbsoluteFill>
      </div>
      {FILES.map((_, i) => (i % 3 === 0 ? <Sfx key={i} at={T0 + i * STEP} name="tick" volume={0.3} /> : null))}
      <Sfx at={done} name="chime" volume={0.45} />
      <Sfx at={done + 1.7} name="thud" volume={0.5} />
      <Sfx at={0.1} name="whoosh" volume={0.3} />
      <DemoLabel dark>REAL VALIDATOR OUTPUT · FHIR/VALIDATION/ IN THE REPOSITORY</DemoLabel>
      <Veil color="#000000" dur={0.5} />
    </DarkTile>
  );
};
