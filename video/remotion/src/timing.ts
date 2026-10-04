/**
 * The master timeline. Built from two real sources:
 *  - the voice-over: every sentence's start and end (video/out/vo/timeline.json, from make_voice.py)
 *  - the music: its beat grid (112.35 BPM, from librosa)
 * Each scene starts on a bar line after the previous scene's speech has finished, so cuts land on the music,
 * and every animation inside a scene is keyed to the start of the sentence it illustrates.
 */
import vo from "./data/vo-timeline.json";
import music from "./data/music-beats.json";
import { FPS } from "./theme";

export type Sentence = { scene: number; text: string; start: number; end: number };

const BEAT = 60 / music.tempo; // seconds
const BAR = BEAT * 4;
const FIRST_BEAT = music.beats[0];

/** Lead-in before the voice starts in each scene (seconds): visuals first, then words. */
const LEAD: Record<number, number> = { 1: 2.2, 2: 0.9, 3: 1.1, 4: 0.9, 5: 0.9, 6: 1.0, 7: 0.9, 8: 0.9, 9: 1.6 };
/** Breath after the last sentence before the next scene may start. */
const TAIL: Record<number, number> = { 1: 0.8, 2: 0.6, 3: 0.9, 4: 0.6, 5: 0.7, 6: 0.6, 7: 0.6, 8: 0.6, 9: 6.0 };

const sentences = vo.sentences as Sentence[];
const byScene = (n: number) => sentences.filter((s) => s.scene === n);

/** Time of the first bar line at or after t. */
export const nextBar = (t: number) => FIRST_BEAT + Math.ceil((t - FIRST_BEAT) / BAR - 1e-6) * BAR;
export const beatAt = (i: number) => FIRST_BEAT + i * BEAT;
export const nearestBeat = (t: number) => FIRST_BEAT + Math.round((t - FIRST_BEAT) / BEAT) * BEAT;

export type SceneTiming = {
  n: number;
  start: number; // seconds, global
  duration: number; // seconds
  voStart: number; // seconds, relative to scene start: where the scene's VO clip begins
  /** each sentence relative to the scene start */
  lines: { text: string; start: number; end: number }[];
};

function build(): SceneTiming[] {
  const out: SceneTiming[] = [];
  let t = 0;
  for (let n = 1; n <= 9; n++) {
    const ss = byScene(n);
    const voOffset = ss[0].start; // where this scene's clip starts inside the full VO
    const start = n === 1 ? 0 : nextBar(t);
    const voStart = LEAD[n];
    const lines = ss.map((s) => ({ text: s.text, start: voStart + (s.start - voOffset), end: voStart + (s.end - voOffset) }));
    const speechEnd = lines[lines.length - 1].end;
    const end = speechEnd + TAIL[n];
    out.push({ n, start, duration: 0, voStart, lines });
    t = start + end;
  }
  for (let i = 0; i < out.length; i++) {
    const next = i + 1 < out.length ? out[i + 1].start : nextBar(t);
    out[i].duration = next - out[i].start;
  }
  return out;
}

export const SCENES = build();
export const TOTAL_S = SCENES[SCENES.length - 1].start + SCENES[SCENES.length - 1].duration;
export const TOTAL_FRAMES = Math.ceil(TOTAL_S * FPS);
export const sec = (s: number) => Math.round(s * FPS);
export const scene = (n: number) => SCENES[n - 1];
export { BEAT, BAR };
