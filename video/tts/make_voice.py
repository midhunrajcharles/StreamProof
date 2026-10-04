"""Voice-over for docs/VIDEO-SCRIPT.md with Kokoro (open source, Apache-2.0), run locally.

    video/.venv/Scripts/python video/tts/make_voice.py [voice] [speed]

Writes video/out/vo/scene-NN.wav per scene, vo-full.wav, and timeline.json: every sentence with its start,
end and the on-screen subtitle text (the real spelling). The TTS text uses respellings only where the model
would stumble (product and place names).
"""

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "vo"
SR = 24000
GAP_S = 0.28  # between sentences
SCENE_PAD_S = 0.6

# (scene, [sentences]) in the script's order. Subtitle text is exactly what a viewer reads.
SCENES = [
    (1, ["To a computer, a rumour and a verified report look exactly the same.",
         "StreamProof makes the difference machine-readable, inside OneAquaHealth's own data standard."]),
    (2, ["In OneAquaHealth's five cities, people walk past urban streams every day, and many already photograph what's wrong.",
         "But an authority can't tell which reports to trust.",
         "And the OneAquaHealth FHIR guide records what was observed, not how far to trust it, or what it may be used for."]),
    (3, ["So we built StreamProof: a trust layer for citizen stream reports, made as an add-on to the HL7 Europe OneAquaHealth guide."]),
    (4, ["Here's Maria in Coimbra.",
         "The reports you'll see are demo data on the real Ribeira de Coselhas.",
         "She opens the app, taps Report, and the camera opens right in the page.",
         "Stagnant water, lots of mosquitoes.",
         "She tags what she sees, confirms the spot on the stream, and sends it.",
         "Within a second, StreamProof grades it: A, with seven reasons anyone can read.",
         "Clear photo. GPS within seven metres. Right on the mapped stream.",
         "And two other people, a school group among them, reported the same thing nearby, so it's already community-supported."]),
    (5, ["On the city side, a reviewer sees the nearby evidence, and the gaps.",
         "One tap asks residents four hundred metres upstream for more.",
         "Now try to send this report to a partner system.",
         "Refused.",
         "A community-supported report can't leave yet.",
         "The reviewer checks it in the field and verifies.",
         "Two different people, both expert-verified: the signal becomes decision-grade, and the River Health Brief raises an advisory.",
         "May warrant inspection. Never a diagnosis."]),
    (6, ["Here's what leaves the system.",
         "The code is OneAquaHealth's own indicator, here, Diptera.",
         "The value is what Maria saw.",
         "And the grade, the trust level and the permitted uses travel inside the record.",
         "The rule for what each trust level may be used for is itself published as a FHIR code system, and our gate loads it when it starts.",
         "Checked with the official HL7 validator against the OneAquaHealth profiles: zero errors, zero warnings.",
         "Lower the trust level, and the profile itself rejects the record."]),
    (7, ["For the city, the Brief matches each signal to the real OneAquaHealth Catalogue of Measures, with section and page.",
         "It shows the stretches nobody has looked at lately, so evidence doesn't only follow the busy paths.",
         "And verified mosquito records leave as ground truth for DipteraCAST."]),
    (8, ["Every verified contributor gets a signed record: change one value and the check fails.",
         "It works in all five OneAquaHealth cities, in any other city by search, and in forty-five languages."]),
    (9, ["StreamProof. Evidence a city can act on."]),
]

SAY = [  # spoken respellings (subtitles keep the originals)
    ("StreamProof", "Stream Proof"), ("OneAquaHealth's", "One Aqua Health's"), ("OneAquaHealth", "One Aqua Health"),
    ("FHIR", "fire"), ("HL7", "H L seven"), ("Ribeira de Coselhas", "Ribayra de Cozelyash"),
    ("DipteraCAST", "Diptera Cast"), ("GPS", "G P S"), ("community-supported", "community supported"),
    ("decision-grade", "decision grade"), ("expert-verified", "expert verified"), ("machine-readable", "machine readable"),
]


def spoken(text: str) -> str:
    for a, b in SAY:
        text = text.replace(a, b)
    return text


def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
    speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    OUT.mkdir(parents=True, exist_ok=True)
    k = Kokoro(str(ROOT / "models" / "kokoro-v1.0.onnx"), str(ROOT / "models" / "voices-v1.0.bin"))
    gap = np.zeros(int(GAP_S * SR), dtype=np.float32)
    timeline, full, t = [], [], 0.0
    for scene, sentences in SCENES:
        parts, scene_start = [], t
        for i, s in enumerate(sentences):
            audio, sr = k.create(spoken(s), voice=voice, speed=speed, lang="en-us")
            assert sr == SR
            audio = audio.astype(np.float32)
            timeline.append({"scene": scene, "text": s, "start": round(t, 3), "end": round(t + len(audio) / SR, 3)})
            parts.append(audio)
            t += len(audio) / SR
            if i < len(sentences) - 1:
                parts.append(gap)
                t += GAP_S
        pad = np.zeros(int(SCENE_PAD_S * SR), dtype=np.float32)
        scene_audio = np.concatenate(parts + [pad])
        t += SCENE_PAD_S
        sf.write(OUT / f"scene-{scene:02d}.wav", scene_audio, SR)
        full.append(scene_audio)
        print(f"scene {scene}: {len(scene_audio) / SR:5.1f} s (from {scene_start:6.1f})")
    sf.write(OUT / "vo-full.wav", np.concatenate(full), SR)
    (OUT / "timeline.json").write_text(json.dumps({"voice": voice, "speed": speed, "total": round(t, 3),
                                                    "sentences": timeline}, indent=1), encoding="utf-8")
    print(f"total {t:.1f} s, voice {voice}, speed {speed}")


if __name__ == "__main__":
    main()
