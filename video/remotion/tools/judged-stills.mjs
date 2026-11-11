// Render check frames for the judged film. Usage: node tools/judged-stills.mjs open:2,4 phone:3 ...   (scene:local seconds)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out", "check-judged2");
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(root, "src", "index.ts"), webpackOverride: (c) => c });
for (const arg of process.argv.slice(2)) {
  const [id, list] = arg.split(":");
  const comp = await selectComposition({ serveUrl, id: `J-${id}` });
  for (const t of list.split(",").map(Number)) {
    const frame = Math.min(comp.durationInFrames - 1, Math.round(t * comp.fps));
    const file = path.join(out, `${id}-${String(t).padStart(6, "0")}.png`);
    await renderStill({ composition: comp, serveUrl, output: file, frame, imageFormat: "png", scale: 0.5 });
    console.log(file);
  }
}
