/** The judged film: six scenes on the music's bar lines, music with ducking, and the sound cues. */
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { CUES, duck } from "./cues";
import { SClose, SDesk, SEvery, SHigh, SOpen, SPhone } from "./Scenes";
import { OVERLAP, SCENES, SceneId, TOTAL_FRAMES, TOTAL_S, sec } from "./timing";

export const J_COMPONENTS: Record<SceneId, React.FC> = { open: SOpen, phone: SPhone, desk: SDesk, high: SHigh, every: SEvery, close: SClose };
export const J_IDS = Object.keys(SCENES) as SceneId[];

const Music: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Audio src={staticFile("audio/music.mp3")} volume={(f) => {
      const t = f / fps;
      const fade = interpolate(t, [0, 1.2, TOTAL_S - 3.5, TOTAL_S], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return 0.62 * fade * duck(t);
    }} />
  );
};

export const JudgedMain: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {J_IDS.map((id, i) => {
      const [a, b] = SCENES[id];
      const end = i + 1 < J_IDS.length ? Math.min(b + OVERLAP, TOTAL_S) : TOTAL_S;
      const C = J_COMPONENTS[id];
      return (
        <Sequence key={id} from={sec(a)} durationInFrames={sec(end) - sec(a)} name={id}>
          <C />
        </Sequence>
      );
    })}
    <Music />
    {CUES.map((c, i) => (
      <Sequence key={i} from={Math.max(0, Math.round(c.t * 30))} layout="none">
        <Audio src={staticFile(`sfx/${c.name}.wav`)} volume={c.vol} playbackRate={c.rate ?? 1} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
export { TOTAL_FRAMES };
