# The demo video, as code

The 3:12 demo video for the Devpost submission, built from the script in [`docs/VIDEO-SCRIPT.md`](../docs/VIDEO-SCRIPT.md). Every screen in it is the real app running on the demo dataset (`app/seed_video.py`). The motion graphics are React code (Remotion), so any change re-renders.

| Step | Tool | Command |
|---|---|---|
| 1. Voice-over | Kokoro TTS (open source, Apache-2.0), voice `af_heart`, run locally | `video/.venv/Scripts/python video/tts/make_voice.py` |
| 2. Stream photos + camera clip | Blender 5.2, procedural scene, no downloaded assets (synthetic) | `bash video/render_all.sh`, then `python video/blender/finish.py` |
| 3. App recordings | Playwright + Chrome's screencast, on an isolated API (:8741) and production build (:3301) | `python video/capture/record.py` |
| 4. Sound effects | synthesised in NumPy | `video/.venv/Scripts/python video/tools/sfx.py` |
| 5. Video | Remotion 4 (React), 1920×1080, 30 fps | `cd video/remotion && npx remotion render src/index.ts StreamProof out/streamproof.mp4` |

Music: "Loyalty (No Drums)" by BreakzStudios, Pixabay Content License (free use, no attribution required; not Content ID registered). It is downloaded into `video/audio/` and is not committed.

**Timing.** `remotion/src/timing.ts` starts each scene on a bar line of the music (112.35 BPM, beat grid from librosa) after the previous scene's speech, and every animation is keyed to the start of the sentence it illustrates (from the voice-over timeline). The footage is cut to the sentences in each scene file.

**Honesty.** The reports, people and photos are demo data; the stream lines (OpenStreetMap) and rainfall (Open-Meteo) are real. The video says so in the voice-over and with an on-screen label during the demo, and the end card says "Demo data".

Setup once: `python -m venv video/.venv && video/.venv/Scripts/python -m pip install kokoro-onnx soundfile numpy librosa faster-whisper`, the Kokoro model files from the kokoro-onnx v1.0 release into `video/models/`, and `cd video/remotion && npm install`.
