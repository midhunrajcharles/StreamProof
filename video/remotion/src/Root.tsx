import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { S1Hook } from "./scenes/S1Hook";
import { S2Problem } from "./scenes/S2Problem";
import { S3Solution } from "./scenes/S3Solution";
import { S4Citizen } from "./scenes/S4Citizen";
import { S5Reviewer } from "./scenes/S5Reviewer";
import { S6Standard } from "./scenes/S6Standard";
import { S7City } from "./scenes/S7City";
import { S8People } from "./scenes/S8People";
import { S9Close } from "./scenes/S9Close";
import { FPS, H, W } from "./theme";
import { TOTAL_FRAMES, scene, sec } from "./timing";
import { CHAPTER_COMPONENTS, FilmMain } from "./film/FilmMain";
import { PREVIEW_FRAMES, PreviewMain } from "./film/PreviewMain";
import { J_COMPONENTS, J_IDS, JudgedMain } from "./judged/JudgedMain";
import { SCENES as J_SCENES, TOTAL_FRAMES as J_FRAMES, sec as jsec } from "./judged/timing";
import { CHAPTERS, TOTAL_FRAMES as FILM_FRAMES, sec as fsec } from "./film/timing";

export const Root: React.FC = () => (
  <>
    <Composition id="StreamProof" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="S1" component={S1Hook} durationInFrames={sec(scene(1).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S2" component={S2Problem} durationInFrames={sec(scene(2).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S3" component={S3Solution} durationInFrames={sec(scene(3).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S4" component={S4Citizen} durationInFrames={sec(scene(4).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S5" component={S5Reviewer} durationInFrames={sec(scene(5).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S6" component={S6Standard} durationInFrames={sec(scene(6).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S7" component={S7City} durationInFrames={sec(scene(7).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S8" component={S8People} durationInFrames={sec(scene(8).duration)} fps={FPS} width={W} height={H} />
    <Composition id="S9" component={S9Close} durationInFrames={sec(scene(9).duration)} fps={FPS} width={W} height={H} />
    {/* the silent every-screen film, and each of its chapters for quick checks */}
    <Composition id="Preview60" component={PreviewMain} durationInFrames={PREVIEW_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Film" component={FilmMain} durationInFrames={FILM_FRAMES} fps={FPS} width={W} height={H} />
    {CHAPTERS.map((ch) => (
      <Composition key={ch.id} id={`F-${ch.id}`} component={CHAPTER_COMPONENTS[ch.id]} durationInFrames={fsec(ch.duration)} fps={FPS} width={W} height={H} />
    ))}
    <Composition id="Judged" component={JudgedMain} durationInFrames={J_FRAMES} fps={FPS} width={W} height={H} />
    {J_IDS.map((id) => (
      <Composition key={id} id={`J-${id}`} component={J_COMPONENTS[id]} durationInFrames={jsec(J_SCENES[id][1] - J_SCENES[id][0])} fps={FPS} width={W} height={H} />
    ))}
  </>
);
