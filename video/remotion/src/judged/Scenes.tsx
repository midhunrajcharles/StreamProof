/** The judged film's scenes. All times in the cue lists are absolute film seconds; each scene subtracts its own start. */
import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, staticFile } from "remotion";
import citizen from "../../public/footage/citizen.json";
import reviewer from "../../public/footage/reviewer.json";
import tablet from "../../public/footage/tablet.json";
import duo from "../../public/footage/duo.json";
import { clamp, useSec } from "../components/kit";
import { FootageCuts, Shot } from "../components/footage";
import { Taps } from "../components/devices";
import { AppleDevice, BezelId, appleSize, coverMap } from "../film/apple";
import { Seg, tapsFor } from "../film/ui";
import { ease, font } from "../theme";
import { ACCENT, Caps, CapItem, Cam, FadeIn, Fine, GREY, INK, LIGHT, OK, Scrim, Tile } from "./ui";
import { CIT, DESK_SEGS, PHONE_SEGS, REV, T, deskAt, phoneAt } from "./cues";
import { BAR, BEAT, SCENES } from "./timing";

const local = (segs: Seg[], s0: number): Seg[] => segs.map((s) => ({ ...s, at: s.at - s0, until: s.until - s0 }));
const dur = (id: keyof typeof SCENES) => SCENES[id][1] - SCENES[id][0];
const mk = (s0: number, rows: [number, number, string, string?][]): CapItem[] => rows.map(([a, b, text, sub]) => ({ a: a - s0, b: b - s0, text, sub }));

// ------------------------------------------------------------------------------------------------ OPEN 0:00-0:15
export const SOpen: React.FC = () => {
  const t = useSec();
  const mark = ease.outExpo(interpolate(t, [0.2, 1.4], [0, 1], clamp));
  const markOut = interpolate(t, [1.8, 2.3], [1, 0], clamp);
  const photo = ease.outExpo(interpolate(t, [2.3, 3.4], [0, 1], clamp));
  const grade = ease.out(interpolate(t, [8.4, 9.0], [0, 1], clamp));
  const dark = t >= 10.8;
  const push = 1 + 0.03 * Math.min(1, Math.max(0, t - 2.3) / 8.4);
  return (
    <>
      <Tile dark={dark}>
        {!dark && (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, top: 440, textAlign: "center", opacity: mark * markOut, transform: `translateY(${(1 - mark) * 12}px)`,
              fontFamily: font.sans, fontWeight: 600, fontSize: 130, letterSpacing: "-0.02em", color: INK }}>
              StreamProof<span style={{ color: ACCENT }}>.</span>
            </div>
            <div style={{ position: "absolute", left: 960 - 380, top: 330, width: 760, height: 570, borderRadius: 36, overflow: "hidden", opacity: photo,
              transform: `translateY(${(1 - photo) * 50}px) scale(${push})`, boxShadow: "0 40px 90px rgba(8,16,40,0.22), 0 8px 20px rgba(8,16,40,0.12)" }}>
              <Img src={staticFile("bg/stream.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", right: 22, top: 22, opacity: grade, transform: `scale(${0.8 + 0.2 * grade})`, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)",
                borderRadius: 999, padding: "12px 26px 12px 20px", display: "flex", alignItems: "center", gap: 12, fontFamily: font.sans, fontWeight: 600, fontSize: 30, color: INK }}>
                <span style={{ width: 16, height: 16, borderRadius: 8, background: OK }} />Grade A
              </div>
            </div>
          </>
        )}
        <Caps y={90} size={72} items={[
          { a: 2.3, b: 4.9, text: "This is a stream report." },
          { a: 5.0, b: 7.8, text: "It's not the first one a city has received." },
          { a: 7.9, b: 10.7, text: "It's the first it can trust.", color: ACCENT },
        ]} />
        <Fine a={2.4} b={10.7}>Illustrative image. Demo data.</Fine>
        <Caps dark y={330} size={106} w={1640} items={[
          { a: 10.9, b: 12.9, text: "Citizens report. Cities can't tell what's real." },
          { a: 12.95, b: 15.1, text: "So health teams act late, or never." },
        ]} />
      </Tile>
    </>
  );
};

// ------------------------------------------------------------------------------------------------ PHONE (hero)
const S_PH = SCENES.phone[0];
const PH_ID: BezelId = "phone-black";
const PH_W = 400;
const PA = appleSize(PH_ID, PH_W);
const PM = coverMap(CIT.css.width, CIT.css.height, PA.sw, PA.sh);
const PH_TOP = 135;
const PH_CX = 1280;
const PH_LOCAL = local(PHONE_SEGS, S_PH);
const PH_TAPS = tapsFor(CIT as Shot, PH_LOCAL, PM.k, PM.ox, PM.oy);

export const SPhone: React.FC = () => {
  const t = useSec();
  const D = dur("phone");
  const sheen = interpolate(t, [0, D], [0, 1], clamp);
  const cardAt = T.card - S_PH;
  const reasonsAt = phoneAt("reasons") - S_PH;
  const yOf = (css: number) => PH_TOP + PA.sy + css * PM.k; // canvas y of a point of the app screen
  const c0 = 540, X = PH_CX;
  const cam = [
    { t: 0, s: 1, fx: X, fy: c0 },
    { t: 19.0 - S_PH, s: 1, fx: X, fy: c0 },
    { t: 20.0 - S_PH, s: 1.3, fx: X, fy: yOf(260) },
    { t: 23.4 - S_PH, s: 1.3, fx: X, fy: yOf(260) },
    { t: 24.6 - S_PH, s: 1.3, fx: X, fy: yOf(560) },
    { t: 32.4 - S_PH, s: 1.3, fx: X, fy: yOf(560) },
    { t: 33.4 - S_PH, s: 1.3, fx: X, fy: yOf(340) },
    { t: 38.0 - S_PH, s: 1.3, fx: X, fy: yOf(340) },
    { t: 39.0 - S_PH, s: 1.3, fx: X, fy: yOf(600) },
    { t: cardAt - 0.2, s: 1.3, fx: X, fy: yOf(600) },
    { t: cardAt + 1.2, s: 2.3, fx: X, fy: yOf(210) },
    { t: reasonsAt + 1.0, s: 2.3, fx: X, fy: yOf(330) },
    { t: reasonsAt + 2.6, s: 1.0, fx: X, fy: c0 },
  ];
  const items = mk(S_PH, [
    [15.4, 19.2, "Maria sees stagnant water by the footbridge."],
    [19.4, 23.2, "45 languages. So anyone can report.¹"],
    [23.8, 27.8, "The camera opens right in the app."],
    [31.2, 36.0, "Two taps tag it. One places it."],
    [47.4, 51.0, "Seven checks, each in plain words."],
    [51.3, 54.9, "A neighbour's report backs it up."],
  ]);
  const left = PH_CX - PA.w / 2;
  return (
    <FadeIn dur={0.4}>
      <Tile>
        <div style={{ position: "absolute", left: 1000, top: 100, width: 1100, height: 1100, background: "radial-gradient(50% 50% at 50% 50%, rgba(10,110,189,0.10), rgba(10,110,189,0))" }} />
        <Cam keys={cam} dur={D} push={0.02}>
          <div style={{ position: "absolute", left, top: PH_TOP }}>
            <AppleDevice id={PH_ID} screenW={PH_W} sheen={sheen}>
              <FootageCuts src="footage/citizen.mp4" cuts={PH_LOCAL} length={CIT.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <Taps taps={PH_TAPS} t={t} size={60} />
            </AppleDevice>
          </div>
        </Cam>
        <Caps align="left" x={70} w={560} y={400} size={56} items={items} />
        <Scrim a={cardAt + 0.8 - 0} b={47.0 - S_PH} strength={0.42} />
        <Caps y={90} size={104} dark w={1500} items={mk(S_PH, [[T.card + 1.0, 47.0, "Grade A. 92 out of 100.¹"]])} />
        <Fine left={70}>¹ Demo data: report SP-1138 is a synthetic example.</Fine>
      </Tile>
    </FadeIn>
  );
};

// ------------------------------------------------------------------------------------------------ DESK + proof
const S_DK = SCENES.desk[0];
const LP_ID: BezelId = "laptop-black";
const LP_W = 1160;
const LA = appleSize(LP_ID, LP_W);
const LM = coverMap(REV.css.width, REV.css.height, LA.sw, LA.sh);
const LP_TOP = 135;
const DK_LOCAL = local(DESK_SEGS, S_DK);
const DK_TAPS = tapsFor(REV as Shot, DK_LOCAL, LM.k, LM.ox, LM.oy);
const FILES = 18;

export const SDesk: React.FC = () => {
  const t = useSec();
  const D = SCENES.desk[1] - S_DK;
  const proofAt = 80.0 - S_DK;
  const verified = T.verified - S_DK;
  const sheen = interpolate(t, [0, 25], [0, 1], clamp);
  const cy = LP_TOP + LA.sy + LA.sh / 2;
  const cam = [
    { t: 0, s: 1, fx: 960, fy: 540 },
    { t: verified - 0.8, s: 1, fx: 960, fy: 540 },
    { t: verified + 0.6, s: 1.8, fx: 960, fy: cy },
    { t: verified + 5.4, s: 1.8, fx: 960, fy: cy },
    { t: verified + 6.6, s: 1, fx: 960, fy: 540 },
  ];
  const items = mk(S_DK, [
    [54.9, 58.9, "Across town, the city team opens it."],
    [59.6, 63.8, "This can't leave the system..."],
    [64.0, 69.0, "...until an expert verifies it."],
    [75.6, 79.6, "An advisory goes to public-health partners."],
  ]);
  const left = 960 - LA.w / 2;
  const spec = ease.out(interpolate(t, [T.refused - S_DK + 0.2, T.refused - S_DK + 0.8], [0, 1], clamp)) * (1 - interpolate(t, [T.refused - S_DK + 3.2, T.refused - S_DK + 3.8], [0, 1], clamp));
  return (
    <>
      <FadeIn dur={0.6}>
        <Tile>
          <Cam keys={cam} dur={proofAt} push={0.02}>
            <div style={{ position: "absolute", left, top: LP_TOP }}>
              <AppleDevice id={LP_ID} screenW={LP_W} sheen={sheen}>
                <FootageCuts src="footage/reviewer.mp4" cuts={DK_LOCAL} length={REV.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <Taps taps={DK_TAPS} t={t} size={52} />
              </AppleDevice>
            </div>
          </Cam>
          <Caps y={76} items={items} />
          <Scrim a={verified + 0.5} b={verified + 4.6} strength={0.55} />
          <Caps y={400} size={104} dark w={1500} items={[{ a: verified + 0.9, b: verified + 4.8, text: "Two people agree. Decision-grade." }]} />
          <div style={{ position: "absolute", left: 60, bottom: 70, opacity: spec, fontFamily: font.sans, fontSize: 30, fontWeight: 600, color: "#b00012", background: "rgba(255,255,255,0.9)",
            padding: "10px 22px", borderRadius: 999, backdropFilter: "blur(16px)" }}>Export refused: not verified yet</div>
          <Fine a={0} b={proofAt}>¹ Demo data: report SP-1138 is a synthetic example.</Fine>
        </Tile>
      </FadeIn>
      <Sequence from={Math.round(proofAt * 30)}><Proof /></Sequence>
    </>
  );
};

const FILE_NAMES = [
  "Bundle-verified-report-example.json", "Bundle-all-clear-example.json", "Bundle-proposed-signs-example.json", "Bundle-diptera-ground-truth-example.json",
  "CodeSystem-citizen-sign.json", "CodeSystem-evidence-attribute.json", "CodeSystem-evidence-grade.json", "CodeSystem-permitted-use.json",
  "CodeSystem-proposed-oah-indicator.json", "CodeSystem-trust-level.json", "ConceptMap-citizen-sign-to-oah.json",
  "StructureDefinition-streamproof-location.json", "StructureDefinition-streamproof-observation.json", "StructureDefinition-streamproof-provenance.json",
  "ValueSet-citizen-sign.json", "ValueSet-evidence-grade.json", "ValueSet-permitted-use.json", "ValueSet-trust-level.json",
];

/** The real HL7 validator result for the exported records, shown as a dark tile at the end of act 1. */
const Proof: React.FC = () => {
  const t = useSec();
  const T0 = 0.6, STEP = 0.2;
  const count = Math.max(0, Math.min(FILES, Math.floor((t - T0) / STEP) + 1));
  const done = T0 + FILES * STEP;
  const big = ease.outExpo(interpolate(t, [done + 0.2, done + 1.0], [0, 1], clamp));
  const bigOut = interpolate(t, [done + 4.4, done + 4.8], [0, 1], clamp);
  const panel = ease.outExpo(interpolate(t, [0, 0.9], [0, 1], clamp));
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, t / 0.5) }}>
      <Tile dark>
        <div style={{ position: "absolute", left: 1000, top: 140, width: 820, opacity: panel, transform: `translateY(${(1 - panel) * 24}px)`, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: 36, padding: "30px 34px", backdropFilter: "blur(30px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: font.sans, fontSize: 20, color: "rgba(245,245,247,0.55)", marginBottom: 14 }}>
            <span>HL7 FHIR Validator · OneAquaHealth profiles</span><span style={{ color: "#30d158" }}>{count} / {FILES}</span>
          </div>
          {FILE_NAMES.map((f, i) => {
            const on = t >= T0 + i * STEP;
            return (
              <div key={f} style={{ height: 36, display: "flex", alignItems: "center", gap: 14, opacity: on ? 1 : 0.16, fontFamily: font.mono, fontSize: 16, color: "rgba(245,245,247,0.88)",
                borderTop: i ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
                <span style={{ width: 20, color: "#30d158", fontWeight: 600 }}>{on ? "✓" : ""}</span>
                <span style={{ flex: 1 }}>{f}</span>
                <span style={{ color: "rgba(48,209,88,0.92)" }}>{on ? "0 errors · 0 warnings" : ""}</span>
              </div>
            );
          })}
        </div>
        <Caps dark x={560} w={880} y={420} size={92} items={[{ a: 0.3, b: done + 0.1, text: "Export it as FHIR." }]} />
        <div style={{ position: "absolute", left: 120, top: 330, width: 800, opacity: big * (1 - bigOut), transform: `translateY(${(1 - big) * 22}px)` }}>
          <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 128, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#f5f5f7" }}>0 errors.</div>
          <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 128, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#30d158" }}>0 warnings.²</div>
        </div>
        <Caps dark x={560} w={880} y={400} size={80} items={[{ a: done + 4.8, b: 99, text: "So any hospital system can read it." }]} />
        <Fine dark a={done}>² 18 files checked with the HL7 validator against the official hl7.eu OneAquaHealth profiles. Demo data.</Fine>
      </Tile>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------ ACT 2: highlights carousel
const CARD_W = 1180, CARD_H = 640, CARD_GAP = 60, CARD_Y = 340;
const HIGH_BOUNDS = [107.6, 121.1];

export const SHigh: React.FC = () => {
  const t = useSec();
  const s0 = SCENES.high[0];
  const D = dur("high");
  const b1 = HIGH_BOUNDS[0] - s0, b2 = HIGH_BOUNDS[1] - s0;
  const step = (b: number) => ease.inOut(interpolate(t, [b - 0.45, b + 0.55], [0, 1], clamp));
  const off = step(b1) + step(b2);
  const idx = t < b1 ? 0 : t < b2 ? 1 : 2;
  const cardX = (i: number) => 960 - CARD_W / 2 + (i - off) * (CARD_W + CARD_GAP);
  const caps: CapItem[] = [
    { a: 0.5, b: b1 - 0.1, text: "Every grade has reasons.", sub: "So you can argue with it." },
    { a: b1 + 0.7, b: b2 - 0.1, text: "A gate on every output.", sub: "So untrusted data never leaves." },
    { a: b2 + 0.7, b: D + 1, text: "Built on the official standard.", sub: "So it fits the systems hospitals already run." },
  ];
  // card 1: the phone with the reasons, cropped by the card's bottom edge
  const P1 = appleSize("phone-black", 330);
  const M1 = coverMap(CIT.css.width, CIT.css.height, P1.sw, P1.sh);
  const seg1: Seg[] = [{ at: 0, until: D, from: 27.0, rate: 0.52 }];
  // card 2: the city desk, refused then verified
  const P2 = appleSize("laptop-black", 800);
  const M2 = coverMap(REV.css.width, REV.css.height, P2.sw, P2.sh);
  const seg2: Seg[] = [{ at: b1 + 0.2, until: b2 + 0.5, from: 6.4, rate: 0.75 }];
  const taps2 = tapsFor(REV as Shot, seg2, M2.k, M2.ox, M2.oy);
  const st = ease.outExpo(interpolate(t, [b2 + 0.9, b2 + 1.9], [0, 1], clamp));
  const cardBase: React.CSSProperties = { position: "absolute", top: CARD_Y, width: CARD_W, height: CARD_H, borderRadius: 36, overflow: "hidden" };
  void idx;
  return (
    <FadeIn dur={0.5}>
      <Tile plain>
        <Caps y={96} items={caps} />
        <div style={{ ...cardBase, left: cardX(0), background: "#fff", boxShadow: "0 24px 60px rgba(8,16,40,0.10)" }}>
          <div style={{ position: "absolute", left: 90, top: 70 }}>
            <AppleDevice id="phone-black" screenW={330} sheen={0.3}>
              <FootageCuts src="footage/citizen.mp4" cuts={seg1} length={CIT.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AppleDevice>
          </div>
          <div style={{ position: "absolute", left: 580, top: 150, width: 580 }}>
            <div style={{ fontFamily: font.sans, fontSize: 28, fontWeight: 600, color: ACCENT }}>The grade</div>
            <div style={{ fontFamily: font.sans, fontSize: 100, fontWeight: 600, lineHeight: 1.04, letterSpacing: "-0.015em", color: INK, marginTop: 12 }}>7 checks.<br />100 points.</div>
            <div style={{ fontFamily: font.sans, fontSize: 28, lineHeight: 1.35, color: GREY, marginTop: 24 }}>Each one explained in a sentence a person <b style={{ color: INK, fontWeight: 600 }}>can read and argue with.</b></div>
          </div>
        </div>
        <div style={{ ...cardBase, left: cardX(1), background: "#fff", boxShadow: "0 24px 60px rgba(8,16,40,0.10)" }}>
          <div style={{ position: "absolute", left: (CARD_W - P2.w) / 2, top: 60 }}>
            <AppleDevice id="laptop-black" screenW={800} sheen={0.4}>
              <FootageCuts src="footage/reviewer.mp4" cuts={seg2} length={REV.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <Taps taps={taps2} t={t} size={40} />
            </AppleDevice>
          </div>
        </div>
        <div style={{ ...cardBase, left: cardX(2), background: "#000", boxShadow: "0 24px 60px rgba(8,16,40,0.18)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 54, textAlign: "center", fontFamily: font.sans, fontSize: 28, color: "rgba(245,245,247,0.66)" }}>
            Checked against the official HL7 Europe OneAquaHealth profiles²
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 130, display: "flex", justifyContent: "center", gap: 90, opacity: st, transform: `translateY(${(1 - st) * 20}px)` }}>
            {[["0", "errors", "#f5f5f7"], ["0", "warnings", "#30d158"]].map(([n, w, col]) => (
              <div key={w} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: font.sans, fontSize: 280, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.04em", color: col }}>{n}</div>
                <div style={{ fontFamily: font.sans, fontSize: 48, fontWeight: 600, color: col, marginTop: -8 }}>{w}</div>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, textAlign: "center", fontFamily: font.sans, fontSize: 24, color: "rgba(245,245,247,0.55)", opacity: st }}>
            Across 18 files: 4 example bundles and 14 published definitions. Baseline: the official ObservationIndicatorsOah and LocationOah profiles.
          </div>
        </div>
        <Fine a={b2 + 1.0}>² Checked with the HL7 validator. Demo data.</Fine>
        <Fine a={0} b={b2 - 0.2}>Demo data.</Fine>
      </Tile>
    </FadeIn>
  );
};

// ------------------------------------------------------------------------------------------------ ACT 3: everywhere
const EV: { id: BezelId; screenW: number; src: string; sh: Shot; from: number; at: number }[] = [
  { id: "tablet-black", screenW: 300, src: "footage/tablet.mp4", sh: tablet as Shot, from: 11.8, at: 1.3 },
  { id: "duo-black", screenW: 520, src: "footage/duo.mp4", sh: duo as Shot, from: 5.1, at: 2.4 },
  { id: "laptop-black", screenW: 470, src: "footage/reviewer.mp4", sh: reviewer as Shot, from: 0.5, at: 3.5 },
];

const TileHead: React.FC<{ eyebrow: string; title: string; at: number; dark?: boolean }> = ({ eyebrow, title, at, dark }) => {
  const t = useSec();
  const p = ease.outExpo(interpolate(t, [at, at + 0.8], [0, 1], clamp));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 54, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
      <div style={{ fontFamily: font.sans, fontSize: 28, fontWeight: 600, color: dark ? "#2997ff" : ACCENT }}>{eyebrow}</div>
      <div style={{ fontFamily: font.sans, fontSize: 64, fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.003em", color: dark ? "#f5f5f7" : INK, marginTop: 8 }}>{title}</div>
    </div>
  );
};

export const SEvery: React.FC = () => {
  const t = useSec();
  const s0 = SCENES.every[0];
  const D = dur("every");
  const gridAt = 141.4 - s0;
  const g = ease.inOut(interpolate(t, [gridAt - 0.3, gridAt + 0.5], [0, 1], clamp));
  const sizes = EV.map((d) => appleSize(d.id, d.screenW));
  const GAP = 70;
  const X0 = (1920 - (sizes.reduce((a, s) => a + s.w, 0) + GAP * 2)) / 2;
  const base = 950;
  const sheen = interpolate(t, [0, D], [0, 1], clamp);
  // the grid
  const PH = appleSize("phone-black", 250), TB = appleSize("tablet-black", 330), LP = appleSize("laptop-black", 560);
  const row1 = { top: 72, h: 500 }, row2 = { top: 588, h: 492 };
  const dev = (id: BezelId, sw: number, src: string, sh: Shot, from: number) => (
    <AppleDevice id={id} screenW={sw} sheen={sheen}>
      <FootageCuts src={src} cuts={[{ at: 0, until: 17, from, rate: 1 }]} length={sh.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AppleDevice>
  );
  return (
    <FadeIn dur={0.5}>
      <Tile>
        <Caps y={84} size={84} items={[{ a: 0.5, b: gridAt - 0.3, text: "Also on tablets. Foldables. Desktops.³" }]} />
        <div style={{ opacity: 1 - g }}>
          {EV.map((d, i) => {
            const x = X0 + sizes.slice(0, i).reduce((a, s) => a + s.w, 0) + GAP * i;
            const p = ease.outExpo(interpolate(t, [d.at, d.at + 1.0], [0, 1], clamp));
            return (
              <div key={d.id} style={{ position: "absolute", left: x, top: base - sizes[i].h, opacity: p, transform: `translateY(${(1 - p) * 70}px)` }}>
                {dev(d.id, d.screenW, d.src, d.sh, d.from)}
              </div>
            );
          })}
        </div>
        <AbsoluteFill style={{ opacity: g, background: "#fff" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 56, background: "rgba(245,245,247,0.8)", backdropFilter: "blur(20px) saturate(180%)",
            borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", paddingLeft: 40, fontFamily: font.sans, fontWeight: 600, fontSize: 22, color: INK, zIndex: 5 }}>StreamProof</div>
          <div style={{ position: "absolute", left: 0, right: 0, top: row1.top, height: row1.h, background: LIGHT, overflow: "hidden" }}>
            <TileHead eyebrow="Desktop" title="Decide at the city desk." at={gridAt + 0.4 - 0} />
            <div style={{ position: "absolute", left: 960 - LP.w / 2, top: 250 }}>{dev("laptop-black", 560, "footage/reviewer.mp4", reviewer as Shot, 7.0)}</div>
          </div>
          <div style={{ position: "absolute", left: 0, width: 952, top: row2.top, height: row2.h, background: "#000", overflow: "hidden" }}>
            <TileHead dark eyebrow="Phone" title="Report from the stream." at={gridAt + 2.0} />
            <div style={{ position: "absolute", left: 476 - PH.w / 2, top: 235 }}>{dev("phone-black", 250, "footage/citizen.mp4", citizen as Shot, 14.0)}</div>
          </div>
          <div style={{ position: "absolute", left: 968, width: 952, top: row2.top, height: row2.h, background: LIGHT, overflow: "hidden" }}>
            <TileHead eyebrow="Tablet" title="Review in the field.³" at={gridAt + 3.6} />
            <div style={{ position: "absolute", left: 476 - TB.w / 2, top: 235 }}>{dev("tablet-black", 330, "footage/tablet.mp4", tablet as Shot, 11.8)}</div>
          </div>
        </AbsoluteFill>
        <Fine a={0.5}>³ Tablet and foldable shown as screen-size emulations. Demo data.</Fine>
      </Tile>
    </FadeIn>
  );
};

// ------------------------------------------------------------------------------------------------ CLOSE
export const SClose: React.FC = () => {
  const t = useSec();
  const s0 = SCENES.close[0];
  const D = dur("close");
  const a = (x: number) => x - s0;
  const WORDS = ["Reported.", "Checked.", "Trusted."];
  const r3 = a(149.9);
  const phaseDark1 = t < a(153.9);
  const endAt = a(159.0);
  const endP = ease.out(interpolate(t, [endAt, endAt + 1.0], [0, 1], clamp));
  const sigOut = interpolate(t, [D - 0.25, D], [0, 0.0], clamp);
  const wm = ease.outExpo(interpolate(t, [endAt + 0.2, endAt + 1.4], [0, 1], clamp));
  const sub = ease.out(interpolate(t, [endAt + 1.2, endAt + 2.0], [0, 1], clamp));
  const slow = 1 + 0.03 * Math.min(1, Math.max(0, t - endAt) / (D - endAt));
  return (
    <FadeIn dur={0.5}>
      {phaseDark1 ? (
        <Tile dark>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 40, display: "flex" }}>
            {WORDS.map((w, i) => {
              const at = r3 + i * 1.05;
              const p = ease.outExpo(interpolate(t, [at, at + 0.7], [0, 1], clamp));
              const last = i === 2;
              return <span key={w} style={{ fontFamily: font.sans, fontWeight: 600, fontSize: last ? 150 : 106, letterSpacing: "-0.015em", color: last ? "#fff" : "rgba(245,245,247,0.82)",
                opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{w}</span>;
            })}
          </AbsoluteFill>
        </Tile>
      ) : t < endAt ? (
        <Tile>
          <Caps y={330} size={106} w={1640} items={[
            { a: a(154.0), b: a(156.4), text: "Made for citizens and city health teams.", sub: "So streams get cared for sooner." },
            { a: a(156.5), b: a(158.95), text: "Not the first report. The first you can trust.", color: ACCENT },
          ]} />
        </Tile>
      ) : (
        <Tile dark plain>
          <AbsoluteFill style={{ opacity: endP * (1 - sigOut), alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column", transform: `scale(${slow})` }}>
            <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 150, letterSpacing: "-0.02em", color: "#f5f5f7", opacity: wm, transform: `translateY(${(1 - wm) * 18}px)` }}>
              StreamProof<span style={{ color: "#2997ff" }}>.</span>
            </div>
            <div style={{ fontFamily: font.sans, fontWeight: 400, fontSize: 40, color: "rgba(245,245,247,0.7)", marginTop: 14, opacity: sub }}>Stream reports a city can trust.</div>
          </AbsoluteFill>
        </Tile>
      )}
    </FadeIn>
  );
};

void BAR; void BEAT; void deskAt; void LIGHT;
