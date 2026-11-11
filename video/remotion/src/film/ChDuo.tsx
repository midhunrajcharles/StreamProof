/** Chapter 2 · Foldable (dark). An organiser works across the fold: queue on one half, evidence on the other, in Apple's foldable frame. */
import React from "react";
import { interpolate } from "remotion";
import shot from "../../public/footage/duo.json";
import { Sfx, clamp, useSec } from "../components/kit";
import { FootageCuts, Shot } from "../components/footage";
import { Taps } from "../components/devices";
import { AppleDevice, appleSize, coverMap } from "./apple";
import { Cap, Caps, DemoLabel, DarkTile, Eyebrow, Rise, Seg, Veil, evAt, tapsFor } from "./ui";
import { chapter } from "./timing";

const CH = chapter("duo");
const SH = shot as Shot;
const ID = "duo-white";
const A = appleSize(ID, 1010);
const M = coverMap(SH.css.width, SH.css.height, A.sw, A.sh);
// footage moments: the queue and the tap, a jump cut over the page load, then the detail, ask, evidence, verify
const SEGS: Seg[] = [
  { at: 0.4, until: 4.1, from: 0.6, rate: 1 },
  { at: 4.1, until: CH.duration, from: 5.1, rate: 1 },
];
const TAPS = tapsFor(SH, SEGS, M.k, M.ox, M.oy);
const T = (label: string) => evAt(SH, SEGS, label);

const CAPS: Cap[] = [
  { a: 0.7, b: 4.0, title: "One fold. One workflow.", sub: "The queue on one half, the evidence on the other." },
  { a: 4.3, b: T("ask") - 0.7, title: "Open a report. See everything.", sub: "Photo, map, grade, and the reasons behind it." },
  { a: T("ask") - 0.5, b: T("evidence") - 0.4, title: "Ask for more evidence.", sub: "One tap sends residents 400 m upstream." },
  { a: T("evidence") - 0.2, b: T("verify-open") - 0.3, title: "Every point explained.", sub: "Photo, time, GPS, stream, neighbours, weather, track record." },
  { a: T("verify-open") - 0.1, b: T("verified") + 2.4, title: "Verify in the field.", sub: "Decision-grade, and a signed record is issued." },
  { a: T("verified") + 2.6, b: CH.duration - 0.15, title: "Built for the fold.", sub: "CSS viewport segments: nothing sits across the crease." },
];

export const ChDuo: React.FC = () => {
  const t = useSec();
  const sheen = interpolate(t, [0, CH.duration], [0, 1], clamp);
  return (
    <DarkTile>
      <Eyebrow x={120} y={46} dark>02 · Foldable · 2 × 520 pt · list + detail</Eyebrow>
      <Caps caps={CAPS} x={120} y={92} width={1500} dark size={66} subSize={30} />
      <div style={{ position: "absolute", left: (1920 - A.w) / 2, top: 1080 - A.h - 34 }}>
        <Rise at={0.1} dur={1.2} dy={90} turn={0}>
          <div style={{ filter: "drop-shadow(0 0 120px rgba(41,151,255,0.16))" }}>
            <AppleDevice id={ID} screenW={1010} sheen={sheen} crease style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.55))" }}>
              <FootageCuts src="footage/duo.mp4" cuts={SEGS} length={SH.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <Taps taps={TAPS} t={t} size={60} />
            </AppleDevice>
          </div>
        </Rise>
      </div>
      {TAPS.map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.4} />)}
      <Sfx at={T("verified")} name="chime" volume={0.4} />
      <Sfx at={0.1} name="whoosh" volume={0.3} />
      <DemoLabel dark />
      <Veil color="#f5f5f7" />
    </DarkTile>
  );
};
