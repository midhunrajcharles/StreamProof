"""Generate the signature sound for the judged film: a clean water-drop plink with a rising pitch (never falling).
Writes remotion/public/sfx/drop.wav (44.1 kHz mono 16-bit)."""
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parents[1] / "remotion" / "public" / "sfx" / "drop.wav"

n = int(SR * 1.3)
t = np.arange(n) / SR
# pitch glides up 520 -> 1180 Hz in the first 90 ms, then holds (a drop's "bloop" rises)
f = 1180 - 660 * np.exp(-t / 0.035)
phase = 2 * np.pi * np.cumsum(f) / SR
body = np.sin(phase) * np.exp(-t / 0.18)
over = 0.35 * np.sin(2.0 * phase) * np.exp(-t / 0.10)
# a soft second tone a fifth above, entering late: the "ring" that says success
ring_t = np.clip(t - 0.09, 0, None)
ring = 0.5 * np.sin(2 * np.pi * 1770 * ring_t) * np.exp(-ring_t / 0.32) * (t > 0.09)
sig = body + over + ring
sig *= np.minimum(1, t / 0.004)  # 4 ms attack, no click
sig /= np.abs(sig).max()
sig *= 0.8
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((sig * 32767).astype("<i2").tobytes())
print(OUT)
