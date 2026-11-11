/** Chapter 1 · Phone (light). Maria's real recording inside Apple's iPhone frame, captioned moment by moment. */
import React from "react";
import { interpolate } from "remotion";
import shot from "../../public/footage/citizen.json";
import { Badge, Sfx, clamp, useSec } from "../components/kit";
import { FootageCuts, Shot } from "../components/footage";
import { Taps } from "../components/devices";
import { c, ease, font } from "../theme";
import { AppleDevice, appleSize, coverMap } from "./apple";
import { Cap, Caps, DemoLabel, Eyebrow, LightTile, Rise, Seg, Veil, tapsFor, whenShown } from "./ui";
import { chapter } from "./timing";

const CH = chapter("phone");
const SH = shot as Shot;
const ID = "phone-black";
const A = appleSize(ID, 410); // the screen opening is 410 px wide on the canvas
const M = coverMap(SH.css.width, SH.css.height, A.sw, A.sh);
const F0 = 0.5, RATE = 1.17, AT = 0.3;
const SEGS: Seg[] = [{ at: AT, until: CH.duration, from: F0, rate: RATE }];
const T = (ft: number) => whenShown(SEGS, ft) ?? AT + (ft - F0) / RATE;
const TAPS = tapsFor(SH, SEGS, M.k, M.ox, M.oy);
const PX = 1370; // phone centre

const ev = (label: string) => SH.events.find((e) => e.label === label)!;
const at = (label: string) => T(ev(label).vt ?? 0);

const BigA: React.FC<{ from: number }> = ({ from }) => {
  const t = useSec();
  const p = ease.back(interpolate(t, [from, from + 0.6], [0, 1], clamp));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 8 }}>
      <div style={{ fontFamily: font.serif, fontSize: 230, lineHeight: 0.9, color: c.blue, transform: `scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 1.5),
        textShadow: "0 0 50px rgba(0,102,204,0.3)" }}>A</div>
      <div style={{ opacity: Math.min(1, p * 1.5) }}>
        <div style={{ fontFamily: font.sans, fontWeight: 800, fontSize: 36, color: c.ink, letterSpacing: "0.02em" }}>STRONG EVIDENCE</div>
        <div style={{ fontFamily: font.sans, fontSize: 30, color: c.grey, marginTop: 6 }}>Seven reasons anyone can read.</div>
      </div>
    </div>
  );
};

const CAPS: Cap[] = [
  { a: 0.6, b: at("reportar") - 0.5, title: "Open in your language.", sub: "English → Português. One tap." },
  { a: at("reportar") - 0.3, b: at("chip-stagnant") - 0.6, title: "The camera opens right in the page.", sub: "An installable web app. Works offline." },
  { a: at("chip-stagnant") - 0.4, b: at("submit") - 0.3, title: "Tag what you see. Pin the spot.", sub: "GPS to within seven metres, on the mapped stream." },
  { a: at("submit") - 0.1, b: at("nearby") - 0.4, title: "Graded in a second.", extra: <BigA from={at("card") + 0.2} /> },
  { a: at("nearby") - 0.2, b: CH.duration - 0.2, title: "Backed by neighbours.", sub: "Two other people nearby reported the same, so it's already community-supported." },
];

const cam = <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
const pin = <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
const people = <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 14c3 0 6 2 6 5" /></svg>;

export const ChPhone: React.FC = () => {
  const t = useSec();
  const sheen = interpolate(t, [0, CH.duration], [0, 1], clamp);
  return (
    <LightTile>
      <Eyebrow x={140} y={290}>01 · Phone · 390 pt · tab bar</Eyebrow>
      <Caps caps={CAPS} x={140} y={340} width={800} />
      <div style={{ position: "absolute", left: PX - A.w / 2, top: (1080 - A.h) / 2 - 6 }}>
        <Rise at={0.1} dur={1.2}>
          <AppleDevice id={ID} screenW={410} sheen={sheen}>
            <FootageCuts src="footage/citizen.mp4" cuts={SEGS} length={SH.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Taps taps={TAPS} t={t} size={64} />
          </AppleDevice>
        </Rise>
      </div>
      <Badge at={at("capture")} x={PX - A.w / 2 - 36} y={470} icon={cam} size={84} />
      <Badge at={at("located")} x={PX + A.w / 2 + 36} y={640} icon={pin} size={84} />
      <Badge at={at("nearby")} x={PX - A.w / 2 - 36} y={820} icon={people} size={84} color="#248a3d" />
      {TAPS.map((k, i) => <Sfx key={i} at={k.t} name="tick" volume={0.4} />)}
      <Sfx at={at("card") + 0.25} name="chime" volume={0.4} />
      <Sfx at={0.1} name="whoosh" volume={0.3} />
      <DemoLabel />
      <Veil color="#000000" />
    </LightTile>
  );
};
