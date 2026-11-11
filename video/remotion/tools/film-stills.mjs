// Render check frames from the silent film's chapters: node tools/film-stills.mjs [chapter...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out", "check-film");
fs.mkdirSync(out, { recursive: true });

// chapter-local seconds worth looking at
const PLAN = {
  open: [1.2, 3.6, 6.4, 8.0, 10.2, 11.6, 12.6],
  phone: [1.5, 4.5, 8, 12, 16, 19, 22.5, 25, 29],
  duo: [1.5, 3.8, 6, 9, 13, 18, 22, 26],
  tablet: [1.5, 5, 8, 12, 15, 19, 22],
  desktop: [2, 6, 8.5, 13, 18, 21, 24, 28, 31, 35, 38],
  proof: [1.5, 3.5, 6, 9, 12],
  lineup: [1.0, 2.5, 5, 10, 17],
  end: [1, 3, 5, 8, 11],
};
const want = process.argv.slice(2);
const ids = (want.length ? want : Object.keys(PLAN));

const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), webpackOverride: (c) => c });
for (const id of ids) {
  const comp = await selectComposition({ serveUrl, id: `F-${id}` });
  for (const t of PLAN[id]) {
    const frame = Math.min(comp.durationInFrames - 1, Math.round(t * comp.fps));
    const file = path.join(out, `${id}-${String(t).padStart(5, "0")}.png`);
    await renderStill({ composition: comp, serveUrl, output: file, frame, imageFormat: "png", scale: 0.5 });
    console.log(file);
  }
}
