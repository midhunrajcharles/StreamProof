/** A 60-second preview of the silent film: the best moments of each chapter, cut on the bar lines of the music. */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { CHAPTER_COMPONENTS } from "./FilmMain";
import { BAR, FIRST_BEAT, ChapterId, sec } from "./timing";
import { useSec } from "../components/kit";

// chapter-local start (seconds) and length (bars) of each excerpt
const EX: { id: ChapterId; a: number; bars: number }[] = [
  { id: "open", a: FIRST_BEAT + 2 * BAR, bars: 4 },
  { id: "phone", a: 7 * BAR, bars: 5 },
  { id: "duo", a: 5 * BAR, bars: 5 },
  { id: "tablet", a: 3 * BAR, bars: 4 },
  { id: "desktop", a: 3 * BAR, bars: 5 },
  { id: "lineup", a: 0, bars: 3 },
  { id: "end", a: 0, bars: 2 },
];

let cum = 0;
const PLAN = EX.map((e, i) => {
  const start = i === 0 ? 0 : FIRST_BEAT + cum * BAR;
  cum += e.bars;
  return { ...e, start, end: FIRST_BEAT + cum * BAR };
});
export const PREVIEW_S = PLAN[PLAN.length - 1].end;
export const PREVIEW_FRAMES = Math.ceil(PREVIEW_S * 30);

/** A short dip to black between excerpts, and a longer one at the very end. */
const Dip: React.FC<{ first: boolean; last: boolean; dur: number }> = ({ first, last, dur }) => {
  const t = useSec();
  const inn = first ? 0 : 1 - interpolate(t, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = last ? interpolate(t, [dur - 1.4, dur - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const o = Math.max(inn, out);
  return o > 0.002 ? <AbsoluteFill style={{ background: "#000", opacity: o, pointerEvents: "none" }} /> : null;
};

const Music: React.FC = () => {
  const { fps } = useVideoConfig();
  const cut = PLAN[PLAN.length - 1].start;
  const OUTRO_FROM = 220.12;
  const fade = 0.5, V = 0.62;
  return (
    <>
      <Sequence from={0} durationInFrames={sec(cut + fade)}>
        <Audio src={staticFile("audio/music.mp3")}
          volume={(f) => V * interpolate(f / fps, [0, 1.2, cut - 0.01, cut + fade], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={sec(cut)}>
        <Audio src={staticFile("audio/music.mp3")} startFrom={sec(OUTRO_FROM)}
          volume={(f) => V * interpolate(f / fps, [0, fade, PREVIEW_S - cut - 2.2, PREVIEW_S - cut], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
    </>
  );
};

export const PreviewMain: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {PLAN.map((e, i) => {
      const from = sec(e.start);
      const to = i + 1 < PLAN.length ? sec(PLAN[i + 1].start) : PREVIEW_FRAMES;
      const C = CHAPTER_COMPONENTS[e.id];
      return (
        <Sequence key={e.id} from={from} durationInFrames={to - from} name={`${e.id} @ ${e.a.toFixed(1)}s`}>
          <Sequence from={-sec(e.a)} durationInFrames={to - from + sec(e.a)}>
            <C />
          </Sequence>
          <Dip first={i === 0} last={i === PLAN.length - 1} dur={(to - from) / 30} />
        </Sequence>
      );
    })}
    <Music />
  </AbsoluteFill>
);
