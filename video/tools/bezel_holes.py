"""Find the screen openings in Apple's transparent bezel PNGs and write video/remotion/src/data/bezels.json.

    python video/tools/bezel_holes.py

The opening is the transparent region connected to the image centre (or, for the dual-screen, the two regions on either side of
the hinge). The bezel PNG is drawn over the recording, so the opening's own alpha gives the rounded screen corners for free;
the box is only used to place and scale the recording underneath.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "remotion" / "public" / "bezels"
OUT = ROOT / "remotion" / "src" / "data" / "bezels.json"

FILES = {
    "phone-silver": "iPhone 18 Pro - Silver - Portrait.png",
    "phone-black": "iPhone 18 Pro - Black - Portrait.png",
    "duo-white": "iPhone Duo - Star White - Inner Open Landscape.png",
    "duo-black": "iPhone Duo - Night Sky - Inner Open Landscape.png",
    "tablet-silver": "iPad Pro (M5) 11in - Silver - Portrait.png",
    "tablet-black": "iPad Pro (M5) 11in - Space Black - Portrait.png",
    "laptop-silver": "MacBook Pro M5 14-inch Silver.png",
    "laptop-black": "MacBook Pro M5 14-inch Space Black.png",
}


def holes(alpha: np.ndarray):
    """Transparent regions that are enclosed by the device (not the outside background): biggest first."""
    clear = alpha < 8
    lab, n = ndimage.label(clear)
    outside = set(np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]])))
    out = []
    for i in range(1, n + 1):
        if i in outside:
            continue
        ys, xs = np.where(lab == i)
        if len(xs) < 2000:
            continue
        out.append({"x": int(xs.min()), "y": int(ys.min()), "w": int(xs.max() - xs.min() + 1), "h": int(ys.max() - ys.min() + 1), "px": int(len(xs))})
    return sorted(out, key=lambda r: -r["px"])


def main():
    res = {}
    for key, name in FILES.items():
        im = Image.open(SRC / name).convert("RGBA")
        a = np.array(im)[:, :, 3]
        hs = holes(a)
        im.save(SRC / f"{key}.png")  # a plain file name for the video code
        res[key] = {"file": f"bezels/{key}.png", "w": im.width, "h": im.height, "holes": hs}
        print(f"{key:14s} {im.width}x{im.height}  holes: " + "; ".join(f"{h['w']}x{h['h']}@{h['x']},{h['y']}" for h in hs))
    OUT.write_text(json.dumps(res, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
