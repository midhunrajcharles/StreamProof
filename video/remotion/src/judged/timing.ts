/**
 * The judged film's timeline (absolute seconds). Act changes land on bar lines of the music (112.35 BPM, 4 beats per bar).
 * Total 2:48.9, under the 2:50 limit.
 */
import music from "../data/music-beats.json";

export const FPS = 30;
export const BEAT = 60 / music.tempo;
export const BAR = BEAT * 4;
export const FB = music.beats[0];
export const bar = (k: number) => FB + k * BAR;

export const SCENES = {
  open: [0, bar(7)], // 0:00 - 0:15   problem, who, why
  phone: [bar(7), 54.4], // act 1a: the citizen, on the hero device
  desk: [54.4, bar(44)], // act 1b: the city team, then the proof
  high: [bar(44), bar(63)], // act 2: why it's different
  every: [bar(63), bar(70)], // act 3: everywhere
  close: [bar(70), bar(79)], // close
} as const;
export type SceneId = keyof typeof SCENES;

export const TOTAL_S = bar(79);
export const TOTAL_FRAMES = Math.round(TOTAL_S * FPS);
export const sec = (s: number) => Math.round(s * FPS);
/** Overlap so the next scene can dissolve in over the end of the previous one. */
export const OVERLAP = 0.5;
