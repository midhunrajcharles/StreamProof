/**
 * The silent film's timeline. No voice-over: every chapter is a whole number of musical bars (112.35 BPM), so every
 * cut and caption lands on the beat. The first chapter starts at 0; the others start on a bar line of the track.
 */
import music from "../data/music-beats.json";
import { FPS } from "../theme";

export const BEAT = 60 / music.tempo;
export const BAR = BEAT * 4;
export const FIRST_BEAT = music.beats[0];

const PLAN = [
  { id: "open", bars: 6 },
  { id: "phone", bars: 15 },
  { id: "duo", bars: 13 },
  { id: "tablet", bars: 11 },
  { id: "desktop", bars: 19 },
  { id: "proof", bars: 6 },
  { id: "lineup", bars: 10 },
  { id: "end", bars: 6 },
] as const;
export type ChapterId = (typeof PLAN)[number]["id"];

let cum = 0;
export const CHAPTERS = PLAN.map((p, i) => {
  const start = i === 0 ? 0 : FIRST_BEAT + cum * BAR;
  cum += p.bars;
  const end = FIRST_BEAT + cum * BAR;
  return { id: p.id as ChapterId, bars: p.bars, start, duration: end - start };
});

export const TOTAL_S = CHAPTERS[CHAPTERS.length - 1].start + CHAPTERS[CHAPTERS.length - 1].duration;
export const TOTAL_FRAMES = Math.ceil(TOTAL_S * FPS);
export const chapter = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;
export const sec = (s: number) => Math.round(s * FPS);
/** The beat nearest to a chapter-local time. */
export const snap = (id: ChapterId, t: number) => {
  const c = chapter(id);
  const g = c.start + t - FIRST_BEAT;
  return FIRST_BEAT + Math.round(g / BEAT) * BEAT - c.start;
};
