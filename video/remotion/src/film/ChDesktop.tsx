/** Chapter 4 · Desktop (dark). The city's view on a MacBook: the evidence, the gate, the verification, then the Brief. */
import React from "react";
import { interpolate } from "remotion";
import reviewer from "../../public/footage/reviewer.json";
import city from "../../public/footage/city.json";
import { Cursor, Sfx, Stamp, clamp, useSec } from "../components/kit";
import { FootageCuts, Shot } from "../components/footage";
import { AppleDevice, appleSize, coverMap } from "./apple";
import { Cap, Caps, DarkTile, DemoLabel, Eyebrow, Rise, Seg, Veil, cursorKeys, evAt, tapsFor } from "./ui";
import { chapter } from "./timing";

const CH = chapter("desktop");
const R = reviewer as Shot;
const C = city as Shot;
const ID = "laptop-silver";
const A = appleSize(ID, 930);
const M = coverMap(R.css.width, R.css.height, A.sw, A.sh);
const SEG_R: Seg[] = [{ at: 1.0, until: 25.6, from: 0.5, rate: 1 }];
const SEG_C: Seg[] = [{ at: 25.6, until: CH.duration, from: 0.4, rate: 1 }];
const TAPS = [...tapsFor(R, SEG_R, M.k, M.ox, M.oy), ...tapsFor(C, SEG_C, M.k, M.ox, M.oy)];
const r = (l: string) => evAt(R, SEG_R, l);
const cy = (l: string) => evAt(C, SEG_C, l);

const CAPS: Cap[] = [
  { a: 0.7, b: r("mission") - 0.7, title: "Everything in one view.", sub: "The report, its photo, the map, and who else saw it." },
  { a: r("mission") - 0.5, b: r("export") - 0.2, title: "Ask for more evidence.", sub: "One tap sends residents 400 m upstream." },
  { a: r("export") - 0.1, b: r("verify-open") - 0.3, title: "The gate says no.", sub: "A community-supported report can't leave as FHIR." },
  { a: r("verify-open") - 0.1, b: r("brief") - 0.6, title: "Verified in the field.", sub: "Decision-grade, and a signed record is issued." },
  { a: r("brief") - 0.4, b: 24.8, title: "Advisory, never a diagnosis.", sub: "The River Health Brief: may warrant inspection." },
  { a: cy("measures") - 0.1, b: cy("coverage") - 0.3, title: "Real measures. Real pages.", sub: "From the OneAquaHealth Catalogue of Measures." },
  { a: cy("coverage") - 0.2, b: cy("mission-open") - 0.1, title: "Find the gaps.", sub: "Stretches nobody has checked lately: one tap to ask." },
  { a: cy("groundtruth") - 0.5, b: CH.duration - 0.15, title: "Ground truth for DipteraCAST.", sub: "Present, not seen, held back. Download as CSV or FHIR." },
];

export const ChDesktop: React.FC = () => {
  const t = useSec();
  const sheen = interpolate(t, [0, CH.duration], [0, 1], clamp);
  const fill = { width: "100%", height: "100%", objectFit: "cover" } as const;
  return (
    <DarkTile>
      <Eyebrow x={120} y={46} dark>04 · Desktop · 1440 pt · sidebar</Eyebrow>
      <Caps caps={CAPS} x={120} y={90} width={1500} dark size={62} subSize={29} />
      <div style={{ position: "absolute", left: (1920 - A.w) / 2, top: 1080 - A.h - 6 }}>
        <Rise at={0.1} dur={1.2} dy={90} turn={0}>
          <div style={{ filter: "drop-shadow(0 0 140px rgba(41,151,255,0.14))" }}>
            <AppleDevice id={ID} screenW={930} sheen={sheen} style={{ filter: "drop-shadow(0 24px 34px rgba(0,0,0,0.6))" }}>
              <FootageCuts src="footage/reviewer.mp4" cuts={SEG_R} length={R.duration} style={fill} />
              <FootageCuts src="footage/city.mp4" cuts={SEG_C} length={C.duration} style={fill} />
              <Cursor keys={cursorKeys(TAPS)} scale={0.75} />
              <Stamp at={r("refused") - 0.05} until={r("refused") + 2.4} text="Refused" sub="Needs expert-verified · blocked by the permitted-use gate" rotate={-7}
                style={{ left: 190, top: 250 }} />
            </AppleDevice>
          </div>
        </Rise>
      </div>
      {TAPS.map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.35} />)}
      <Sfx at={r("refused")} name="thud" volume={0.5} />
      <Sfx at={r("verified")} name="chime" volume={0.4} />
      <Sfx at={0.1} name="whoosh" volume={0.3} />
      <DemoLabel dark />
      <Veil color="#f5f5f7" />
    </DarkTile>
  );
};
