/** Footage cuts (absolute film seconds) and every sound cue. Scenes and the audio mix read the same numbers, so a tap sound lands on its visual press. */
import citizen from "../../public/footage/citizen.json";
import reviewer from "../../public/footage/reviewer.json";
import type { Shot } from "../components/footage";
import { Seg, tapsFor, whenShown } from "../film/ui";
import { BEAT, SCENES } from "./timing";

export const CIT = citizen as Shot;
export const REV = reviewer as Shot;

// phone: film = footage + 17.0 from 19.3 on; the end is slowed so the result can be read
export const PHONE_SEGS: Seg[] = [
  { at: 15.03, until: 19.3, from: 0.5, rate: 0.42 },
  { at: 19.3, until: 42.4, from: 2.3, rate: 1 },
  { at: 42.4, until: 54.9, from: 25.4, rate: 0.78 },
];
// desk: film = footage + 54.5 up to the verification, then slowed
export const DESK_SEGS: Seg[] = [
  { at: 55.0, until: 69.8, from: 0.5, rate: 1 },
  { at: 69.8, until: 80.0, from: 15.3, rate: 0.85 },
];
const vtOf = (sh: Shot, label: string) => { const e = sh.events.find((x) => x.label === label)!; return e.vt ?? e.t; };
export const phoneAt = (label: string) => whenShown(PHONE_SEGS, vtOf(CIT, label))!;
export const deskAt = (label: string) => whenShown(DESK_SEGS, vtOf(REV, label))!;

export const T = {
  card: phoneAt("card"), // the grade appears: first proof moment
  refused: deskAt("refused"),
  verified: deskAt("verified"),
  advisory: deskAt("advisory"),
  validatorDone: 80.6 + 18 * 0.2, // the 18th file ticks
  highStart: SCENES.high[0],
};

export type Cue = { t: number; name: string; vol: number; rate?: number };
const cues: Cue[] = [];
const taps = [...tapsFor(CIT, PHONE_SEGS, 1), ...tapsFor(REV, DESK_SEGS, 1)].map((k) => k.t).sort((a, b) => a - b);
taps.forEach((t, i) => {
  const gap = i ? t - taps[i - 1] : 9;
  cues.push({ t, name: "tick", vol: gap < 1.6 ? 0.26 : 0.34, rate: [1, 1.07, 0.95, 1.03][i % 4] });
});
// transitions
[54.3, 80.0, SCENES.high[0], 107.6, 121.1, SCENES.every[0], 141.4, SCENES.close[0]].forEach((t) => cues.push({ t: t - 0.12, name: "whoosh", vol: 0.28 }));
// the signature sound: first proof moment, the peak, the final frame
cues.push({ t: T.card + 0.2, name: "drop", vol: 0.55 });
cues.push({ t: T.verified + 0.2, name: "drop", vol: 0.6 });
cues.push({ t: SCENES.close[1] - 0.45, name: "drop", vol: 0.55 });
cues.push({ t: T.refused + 0.1, name: "refuse", vol: 0.3 });
cues.push({ t: T.validatorDone + 0.15, name: "success", vol: 0.32 });
// rule of three, one tick per word, and the tiles
[149.9, 150.95, 152.0].forEach((t) => cues.push({ t, name: "tick", vol: 0.34 }));
[136.0, 137.1, 138.2, 142.0, 143.6, 145.2].forEach((t, i) => cues.push({ t, name: "tick", vol: 0.26, rate: [1, 1.06, 0.97][i % 3] }));

export const CUES = cues.sort((a, b) => a.t - b.t);
export const duck = (t: number) => {
  let g = 1;
  for (const c of CUES) {
    const d = t - c.t;
    if (d < -0.06 || d > 0.7) continue;
    const dip = d < 0 ? (1 + d / 0.06) : d < 0.25 ? 1 : 1 - (d - 0.25) / 0.45;
    g = Math.min(g, 1 - 0.37 * Math.max(0, dip)); // -4 dB
  }
  return g;
};
// effects must be at least 250 ms apart (the film's rule); report any pair that is not
for (let i = 1; i < CUES.length; i++) if (CUES[i].t - CUES[i - 1].t < 0.25) console.warn("CUES TOO CLOSE", CUES[i - 1], CUES[i]);
void BEAT;
