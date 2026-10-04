"""Turn Blender renders into phone-like photos and a camera feed.

    python video/blender/finish.py            # stills -> data/demo-photos/<sign>/NN.jpg, clip -> video/out/camera.mjpeg

Phone look: slight vignette, luminance noise, a 1 px colour fringe at the edges, mild sharpening, JPEG.
The photos stay synthetic renders (no camera EXIF here; the seed adds a capture time), and the video says so.
"""

import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
RENDERS = ROOT / "video" / "out" / "renders"
PHOTOS = ROOT / "data" / "demo-photos"


def phone_look(im: Image.Image, seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    a *= (1 - 0.22 * np.clip(r - 0.35, 0, None) ** 1.6)[..., None]  # vignette
    a[..., 0] = np.roll(a[..., 0], 1, axis=1)  # lateral colour fringe
    a[..., 2] = np.roll(a[..., 2], -1, axis=1)
    a += rng.normal(0, 3.2, (h, w, 1))  # luminance noise
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))


def stills() -> int:
    n = 0
    for p in sorted((RENDERS / "stills").glob("*.png")):
        sign, seed = p.stem.rsplit("-", 1)
        folder = PHOTOS / ("clear" if sign == "clear" else sign)
        folder.mkdir(parents=True, exist_ok=True)
        phone_look(Image.open(p), int(seed)).save(folder / f"{int(seed):02d}.jpg", quality=88, optimize=True)
        n += 1
    return n


def clip() -> Path | None:
    frames = sorted((RENDERS / "clip").glob("f_*.png"))
    if not frames:
        return None
    tmp = RENDERS / "clip-finished"
    tmp.mkdir(exist_ok=True)
    seq = frames + frames[::-1][1:-1]  # ping-pong, so Chrome's loop has no jump
    for i, p in enumerate(seq):
        phone_look(Image.open(p), 100 + i).save(tmp / f"g_{i:04d}.jpg", quality=92)
    out = ROOT / "video" / "out" / "camera.mjpeg"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", str(tmp / "g_%04d.jpg"),
                    "-vf", "scale=1280:960", "-q:v", "3", "-f", "mjpeg", str(out)], check=True)
    return out


if __name__ == "__main__":
    print("photos:", stills())
    print("camera feed:", clip())
