/** Chapter 3 · Tablet (light). A volunteer picks up a mission, then reads how a report was graded, inside Apple's iPad frame. */
import React from "react";
import { interpolate } from "remotion";
import shot from "../../public/footage/tablet.json";
import { Sfx, clamp, useSec } from "../components/kit";
import { FootageCuts, Shot } from "../components/footage";
import { Taps } from "../components/devices";
import { AppleDevice, appleSize, coverMap } from "./apple";
import { Cap, Caps, DemoLabel, Eyebrow, LightTile, Rise, Seg, Veil, evAt, tapsFor } from "./ui";
import { chapter } from "./timing";

const CH = chapter("tablet");
const SH = shot as Shot;
const ID = "tablet-black";
const A = appleSize(ID, 560);
const M = coverMap(SH.css.width, SH.css.height, A.sw, A.sh);
// home and the tap on the mission, a jump cut over the map tiles loading, then the map, the reports list and a graded report
const SEGS: Seg[] = [
  { at: 0.4, until: 7.0, from: 0.5, rate: 1 },
  { at: 7.0, until: 21.2, from: 11.8, rate: 1 },
];
const TAPS = tapsFor(SH, SEGS, M.k, M.ox, M.oy);
const T = (label: string) => evAt(SH, SEGS, label);
const TX = 560; // tablet centre

const CAPS: Cap[] = [
  { a: 0.7, b: 5.6, title: "Pick up a mission.", sub: "Open missions sit one tap from the home screen." },
  { a: 5.8, b: T("reports-tab") - 0.6, title: "Where to look. How to stay safe.", sub: "A map, a safety note, one tap to report." },
  { a: T("reports-tab") - 0.4, b: T("card") - 0.4, title: "Every report, in one place.", sub: "Open one to see how it was graded." },
  { a: T("card") - 0.2, b: CH.duration - 0.15, title: "Seven reasons, in plain words.", sub: "No black box: every point is explained." },
];

export const ChTablet: React.FC = () => {
  const t = useSec();
  const sheen = interpolate(t, [0, CH.duration], [0, 1], clamp);
  return (
    <LightTile>
      <Eyebrow x={1040} y={300}>03 · Tablet · 820 pt · top tab bar</Eyebrow>
      <Caps caps={CAPS} x={1040} y={350} width={780} />
      <div style={{ position: "absolute", left: TX - A.w / 2, top: (1080 - A.h) / 2 - 6 }}>
        <Rise at={0.1} dur={1.2}>
          <AppleDevice id={ID} screenW={560} sheen={sheen}>
            <FootageCuts src="footage/tablet.mp4" cuts={SEGS} length={SH.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Taps taps={TAPS} t={t} size={68} />
          </AppleDevice>
        </Rise>
      </div>
      {TAPS.map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.4} />)}
      <Sfx at={0.1} name="whoosh" volume={0.3} />
      <DemoLabel />
      <Veil color="#000000" />
    </LightTile>
  );
};
