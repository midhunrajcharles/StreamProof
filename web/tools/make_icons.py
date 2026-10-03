"""App icons for the StreamProof web app: a water drop with a check mark, black and white
like the landing page. Run: python tools/make_icons.py (writes public/icons/)."""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
S = 1024  # draw large, then downsample for smooth edges


def drop(d: ImageDraw.ImageDraw, cx: float, cy: float, r: float, fill) -> None:
    """A drop: a circle with a point on top."""
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    d.polygon([(cx - r * 0.86, cy - r * 0.5), (cx, cy - r * 2.05), (cx + r * 0.86, cy - r * 0.5)], fill=fill)


def icon(size: int, safe: float, rounded: bool) -> Image.Image:
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.225), fill=(17, 17, 19, 255))
    else:
        d.rectangle([0, 0, S, S], fill=(17, 17, 19, 255))
    r = S * 0.2 * safe
    cx, cy = S / 2, S * 0.5 + r * 0.55
    drop(d, cx, cy, r, (245, 245, 247, 255))
    w = int(S * 0.045 * safe)
    pts = [(cx - r * 0.45, cy + r * 0.02), (cx - r * 0.1, cy + r * 0.36), (cx + r * 0.5, cy - r * 0.32)]
    d.line(pts, fill=(17, 17, 19, 255), width=w, joint="curve")
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=(17, 17, 19, 255))
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    icon(192, 1.0, True).save(OUT / "icon-192.png")
    icon(512, 1.0, True).save(OUT / "icon-512.png")
    icon(512, 0.78, False).save(OUT / "maskable-512.png")  # content inside the maskable safe zone
    icon(180, 1.0, False).convert("RGB").save(OUT / "apple-touch-icon.png")  # iOS rounds it itself
    icon(256, 1.0, True).save(OUT.parent / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])  # landing page tab icon
    print("icons written to", OUT)
