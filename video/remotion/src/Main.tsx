import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { S1Hook } from "./scenes/S1Hook";
import { S2Problem } from "./scenes/S2Problem";
import { S3Solution } from "./scenes/S3Solution";
import { S4Citizen } from "./scenes/S4Citizen";
import { S5Reviewer } from "./scenes/S5Reviewer";
import { S6Standard } from "./scenes/S6Standard";
import { S7City } from "./scenes/S7City";
import { S8People } from "./scenes/S8People";
import { S9Close } from "./scenes/S9Close";
import { BAR, SCENES, TOTAL_S, sec } from "./timing";
import { font } from "./theme";

const Placeholder: React.FC<{ n: number }> = ({ n }) => (
  <AbsoluteFill style={{ background: "#111", color: "#fff", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 40 }}>
    scene {n} · in production
  </AbsoluteFill>
);

const COMPONENTS: Record<number, React.FC> = { 1: S1Hook, 2: S2Problem, 3: S3Solution, 4: S4Citizen, 5: S5Reviewer, 6: S6Standard, 7: S7City, 8: S8People, 9: S9Close };

/** Speech intervals (global seconds) for ducking the music under the voice: 1 in gaps, ~0.45 while speaking. */
const SPEECH = SCENES.flatMap((s) => s.lines.map((l) => [s.start + l.start, s.start + l.end] as const));
const duck = (t: number) => {
  let d = 0;
  for (const [a, b] of SPEECH) {
    if (t > a - 0.3 && t < b + 0.45) d = Math.max(d, Math.min(1, (t - (a - 0.3)) / 0.3, (b + 0.45 - t) / 0.45));
  }
  return 1 - 0.55 * d;
};

/** Music: the track from 0 up to the last scene, then a bar-aligned jump to its real outro, cross-faded. */
const Music: React.FC = () => {
  const { fps } = useVideoConfig();
  const cut = SCENES[8].start; // bar-aligned
  const OUTRO_FROM = 220.12; // a bar line in the track (bar 103), 11.5 s before its end
  const fade = 0.5;
  return (
    <>
      <Sequence from={0} durationInFrames={sec(cut + fade)}>
        <Audio src={staticFile("audio/music.mp3")}
          volume={(f) => 0.42 * duck(f / fps) * interpolate(f / fps, [cut - 0.01, cut + fade], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
      <Sequence from={sec(cut)}>
        <Audio src={staticFile("audio/music.mp3")} startFrom={sec(OUTRO_FROM)}
          volume={(f) => 0.42 * duck(cut + f / fps) * interpolate(f / fps, [0, fade, TOTAL_S - cut - 1.2, TOTAL_S - cut], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      </Sequence>
    </>
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {SCENES.map((s) => {
      const C = COMPONENTS[s.n];
      return (
        <Sequence key={s.n} from={sec(s.start)} durationInFrames={sec(s.duration)} name={`Scene ${s.n}`}>
          {C ? <C /> : <Placeholder n={s.n} />}
          {s.n > 1 ? (
            <Sequence from={0} durationInFrames={sec(1)} layout="none">
              <Audio src={staticFile("sfx/whoosh.wav")} volume={0.32} />
            </Sequence>
          ) : null}
          <Sequence from={sec(s.voStart)}>
            <Audio src={staticFile(`vo/scene-${String(s.n).padStart(2, "0")}.wav`)} volume={1} />
          </Sequence>
        </Sequence>
      );
    })}
    <Music />
  </AbsoluteFill>
);

export { BAR };
