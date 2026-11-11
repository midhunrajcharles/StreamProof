/** The silent film: eight chapters on the bar lines of the music. No voice-over; the music is the only track, plus small sound effects. */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { ChDesktop } from "./ChDesktop";
import { ChDuo } from "./ChDuo";
import { ChEnd } from "./ChEnd";
import { ChLineup } from "./ChLineup";
import { ChOpen } from "./ChOpen";
import { ChPhone } from "./ChPhone";
import { ChProof } from "./ChProof";
import { ChTablet } from "./ChTablet";
import { CHAPTERS, ChapterId, TOTAL_FRAMES, TOTAL_S, sec } from "./timing";

export const CHAPTER_COMPONENTS: Record<ChapterId, React.FC> = {
  open: ChOpen, phone: ChPhone, duo: ChDuo, tablet: ChTablet, desktop: ChDesktop, proof: ChProof, lineup: ChLineup, end: ChEnd,
};

/** The track from the start to the last chapter, then a jump to its real outro on a bar line, cross-faded. */
const Music: React.FC = () => {
  const { fps } = useVideoConfig();
  const cut = CHAPTERS[CHAPTERS.length - 1].start; // bar-aligned
  const OUTRO_FROM = 220.12; // a bar line in the track, 11.5 s before its end
  const fade = 0.5, V = 0.62;
  return (
    <>
      <Sequence from={0} durationInFrames={sec(cut + fade)}>
        <Audio src={staticFile("audio/music.mp3")}
          volume={(f) => V * interpolate(f / fps, [0, 1.4, cut - 0.01, cut + fade], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={sec(cut)}>
        <Audio src={staticFile("audio/music.mp3")} startFrom={sec(OUTRO_FROM)}
          volume={(f) => V * interpolate(f / fps, [0, fade, TOTAL_S - cut - 1.6, TOTAL_S - cut], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
    </>
  );
};

export const FilmMain: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {CHAPTERS.map((ch, i) => {
      const from = sec(ch.start);
      const to = i + 1 < CHAPTERS.length ? sec(CHAPTERS[i + 1].start) : TOTAL_FRAMES;
      const C = CHAPTER_COMPONENTS[ch.id];
      return (
        <Sequence key={ch.id} from={from} durationInFrames={to - from} name={ch.id}>
          <C />
        </Sequence>
      );
    })}
    <Music />
  </AbsoluteFill>
);
