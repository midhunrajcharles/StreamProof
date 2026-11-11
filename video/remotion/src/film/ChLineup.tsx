/** Chapter 6 · Lineup (light). All four of Apple's frames side by side, each playing its own part of the app. */
import React from "react";
import { interpolate } from "remotion";
import citizen from "../../public/footage/citizen.json";
import duo from "../../public/footage/duo.json";
import tablet from "../../public/footage/tablet.json";
import city from "../../public/footage/city.json";
import { Sfx, clamp, useSec } from "../components/kit";
import { FootageCuts, Shot } from "../components/footage";
import { c, font } from "../theme";
import { AppleDevice, BezelId, appleSize } from "./apple";
import { BEAT, chapter } from "./timing";
import { Cap, Caps, LightTile, Rise, Seg, Veil } from "./ui";

const CH = chapter("lineup");
const BASE = 880; // the surface the devices stand on
const GAP = 70;
const DEV: { id: BezelId; screenW: number; src: string; shot: Shot; from: number; name: string; spec: string; at: number }[] = [
  { id: "phone-black", screenW: 172, src: "footage/citizen.mp4", shot: citizen as Shot, from: 14.0, name: "Phone", spec: "390 pt · tab bar", at: 0.3 },
  { id: "duo-black", screenW: 420, src: "footage/duo.mp4", shot: duo as Shot, from: 5.1, name: "Foldable", spec: "2 × 520 pt · list + detail", at: 0.6 },
  { id: "tablet-black", screenW: 274, src: "footage/tablet.mp4", shot: tablet as Shot, from: 11.8, name: "Tablet", spec: "820 pt · top tab bar", at: 0.9 },
  { id: "laptop-black", screenW: 392, src: "footage/city.mp4", shot: city as Shot, from: 0.4, name: "Desktop", spec: "1440 pt · sidebar", at: 1.2 },
];
const SIZES = DEV.map((d) => appleSize(d.id, d.screenW));
const X0 = (1920 - (SIZES.reduce((a, s) => a + s.w, 0) + GAP * (DEV.length - 1))) / 2;
const XS = SIZES.map((_, i) => X0 + SIZES.slice(0, i).reduce((a, s) => a + s.w, 0) + GAP * i);

const CAPS: Cap[] = [
  { a: 0.9, b: 8.2, title: "One app. Every screen.", sub: "One codebase. One record. The same trust rules." },
  { a: 8.4, b: 14.6, title: "Size classes, not device lists.", sub: "Tab bar. Top bar. Sidebar. List and detail across the fold." },
  { a: 14.8, b: CH.duration - 0.2, title: "Built to be used anywhere.", sub: "At the stream. In the field. At the city desk." },
];

/** The thin translucent bar across the top of a product page. */
const NavBar: React.FC = () => {
  const t = useSec();
  const items = ["Overview", "Phone", "Foldable", "Tablet", "Desktop"];
  const active = Math.floor(t / (BEAT * 4)) % items.length;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 52, background: "rgba(251,251,253,0.78)", borderBottom: "1px solid rgba(0,0,0,0.08)",
      backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 46, fontFamily: font.sans, fontSize: 15, letterSpacing: "-0.005em" }}>
      <span style={{ fontFamily: font.serif, fontSize: 25, color: c.ink, marginRight: 22 }}>StreamProof</span>
      {items.map((it, i) => (
        <span key={it} style={{ color: i === active ? c.ink : "rgba(0,0,0,0.58)", fontWeight: i === active ? 600 : 400 }}>{it}</span>
      ))}
    </div>
  );
};

const Spec: React.FC<{ x: number; w: number; name: string; spec: string; at: number }> = ({ x, w, name, spec, at }) => {
  const t = useSec();
  const p = interpolate(t, [at, at + 0.6], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: x, width: w, top: BASE + 44, textAlign: "center", opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <div style={{ fontFamily: font.sans, fontWeight: 600, fontSize: 24, color: c.ink, letterSpacing: "-0.01em" }}>{name}</div>
      <div style={{ fontFamily: font.mono, fontSize: 13, color: c.grey, letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 6 }}>{spec}</div>
    </div>
  );
};

export const ChLineup: React.FC = () => {
  const t = useSec();
  const sheen = interpolate(t, [0, CH.duration], [0, 1], clamp);
  return (
    <LightTile>
      <NavBar />
      <Caps caps={CAPS} x={160} y={118} width={1600} size={92} subSize={34} align="center" />
      <div style={{ position: "absolute", left: 0, right: 0, top: BASE, height: 1080 - BASE, background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(228,228,234,0.7) 100%)" }} />
      {DEV.map((d, i) => {
        const seg: Seg[] = [{ at: 0.3, until: CH.duration, from: d.from, rate: 1 }];
        return (
          <div key={d.id} style={{ position: "absolute", left: XS[i], top: BASE - SIZES[i].h }}>
            <Rise at={d.at} dur={1.1} dy={80} turn={0}>
              <AppleDevice id={d.id} screenW={d.screenW} sheen={sheen} crease={d.id.startsWith("duo")}>
                <FootageCuts src={d.src} cuts={seg} length={d.shot.duration} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </AppleDevice>
            </Rise>
          </div>
        );
      })}
      {DEV.map((d, i) => <Spec key={d.name} x={XS[i]} w={SIZES[i].w} name={d.name} spec={d.spec} at={d.at + 1.3} />)}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, textAlign: "center", fontFamily: font.mono, fontSize: 12.5, letterSpacing: "0.1em", color: "rgba(0,0,0,0.42)" }}>
        ONE WEB APP · TABLET AND FOLDABLE SHOWN AS SCREEN-SIZE EMULATION · DEMO DATA
      </div>
      {DEV.map((d) => <Sfx key={d.id} at={d.at + 0.25} name="tick" volume={0.35} />)}
      <Sfx at={0.1} name="whoosh" volume={0.3} />
      <Veil color="#000000" />
    </LightTile>
  );
};
