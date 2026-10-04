"""Synthesised sound effects for the video (no samples, no licences): whoosh, thud, riser, chime, tick, check.

    video/.venv/Scripts/python video/tools/sfx.py      -> video/remotion/public/sfx/*.wav
"""
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
OUT = Path(__file__).resolve().parents[1] / "remotion" / "public" / "sfx"
rng = np.random.default_rng(7)


def env(n, a, d):
    e = np.ones(n)
    ai, di = int(a * SR), int(d * SR)
    e[:ai] = np.linspace(0, 1, ai) if ai else 1
    e[-di:] = np.linspace(1, 0, di) ** 2 if di else e[-di:]
    return e


def lowpass(x, cutoff):
    # one-pole low-pass, cutoff can be an array (sweeps)
    y = np.zeros_like(x)
    a = np.exp(-2 * np.pi * np.broadcast_to(cutoff, x.shape) / SR)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def norm(x, peak=0.9):
    return (x / (np.abs(x).max() + 1e-9) * peak).astype(np.float32)


def stereo(x, width=0.0):
    d = int(width * SR / 1000)
    r = np.concatenate([np.zeros(d), x[: len(x) - d]]) if d else x
    return np.stack([x, r], axis=1)


def whoosh(dur=0.9):
    n = int(dur * SR)
    noise = rng.normal(0, 1, n)
    t = np.linspace(0, 1, n)
    cut = 300 + 5200 * np.sin(np.pi * t) ** 2
    x = lowpass(noise, cut) * np.sin(np.pi * t) ** 1.5
    return stereo(norm(x, 0.6), 6)


def thud():
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (70 * np.exp(-t * 9) + 42) * t) * np.exp(-t * 7)
    click = rng.normal(0, 1, n) * np.exp(-t * 90) * 0.5
    return stereo(norm(body + lowpass(click, 2500), 0.95))


def riser(dur=1.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 180 * (2 ** (t / dur * 2.2))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.2
    noise = lowpass(rng.normal(0, 1, n), 400 + 6000 * t / dur) * 0.6
    return stereo(norm((tone + noise) * (t / dur) ** 2, 0.7), 8)


def chime():
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in
            ((880, 1.0, 2.2), (1318.5, 0.6, 2.8), (1760, 0.35, 3.5), (2637, 0.15, 4.5)))
    return stereo(norm(x * env(n, 0.004, 0.4), 0.6), 4)


def tick():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 120) + rng.normal(0, 0.3, n) * np.exp(-t * 300)
    return stereo(norm(x, 0.35))


def check():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1046.5 * t) * np.exp(-t * 6) * (t < 0.45) + np.sin(2 * np.pi * 1568 * (t - 0.09)) * np.exp(-(t - 0.09) * 5) * (t > 0.09)
    return stereo(norm(x * env(n, 0.003, 0.3), 0.45))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in (("whoosh", whoosh), ("thud", thud), ("riser", riser), ("chime", chime), ("tick", tick), ("check", check)):
        sf.write(OUT / f"{name}.wav", fn(), SR)
        print("wrote", name)
