"""Landing-page media: Pexels stock (free licence, no attribution required; credited
anyway in public/media/CREDITS.md) plus two screenshots of the StreamProof app.

    python tools/media.py              # download, crop, encode -> public/media/
    python tools/media.py --shots      # also re-capture the product screenshots
                                       # (needs the API on :8740 and the web app on :3200)

Raw downloads stay in tools/media-src/ (not committed).
"""

import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent
SRC = WEB / "tools" / "media-src"
OUT = WEB / "public" / "media"
UA = {"User-Agent": "Mozilla/5.0"}

# Pexels video id -> (title, page slug, poster file name)
CLIPS = {
    39328704: ("Serene mountain stream flowing in summer", "serene-mountain-stream-flowing-in-summer-39328704", "pexels-photo-39328704.jpeg"),
    20597710: ("A close-up of a stream of water flowing through the forest", "a-close-up-of-a-stream-of-water-flowing-through-the-forest-20597710", "pexels-photo-20597710.jpeg"),
    7653817: ("Drone footage of river at daytime", "drone-footage-of-river-at-daytime-7653817", "drone-river-riverside-warsaw-7653817.jpeg"),
    15214302: ("Footage of a dam from above", "footage-of-a-dam-from-above-15214302", "pexels-photo-15214302.jpeg"),
    16478020: ("A water drop is shown in the water", "a-water-drop-is-shown-in-the-water-16478020", "4k-abstract-background-black-and-blue-16478020.jpeg"),
    27114631: ("Aerial view of a water treatment plant", "aerial-view-of-a-water-treatment-plant-27114631", "pexels-photo-27114631.jpeg"),
    9722037: ("Close-up of flowing water", "close-up-of-flowing-water-9722037", "pexels-photo-9722037.jpeg"),
    25546900: ("Ruissellement d'eau", "ruissellement-d-eau-25546900", "ruissellement-d-eau-25546900.jpeg"),
    854629: ("Time-lapse video of cascade", "time-lapse-video-of-cascade-854629", "free-video-854629.jpg"),
    37800270: ("Charming evening in historic European town", "charming-evening-in-historic-european-town-37800270", "pexels-photo-37800270.jpeg"),
    10728109: ("Close up on water flowing from tree trunk", "close-up-on-water-flowing-from-tree-trunk-10728109", "flowing-fountain-pond-tree-trunk-10728109.jpeg"),
    33202267: ("Serene mountain river with overcast skies", "serene-mountain-river-with-overcast-skies-33202267", "pexels-photo-33202267.jpeg"),
    12399482: ("Lake and trees in bird's eye view", "lake-and-trees-in-birds-eye-view-12399482", "lake-lake-views-lakeshore-mountain-lake-12399482.jpeg"),
    5404498: ("Cascading waterfall", "cascading-waterfall-5404498", "pexels-photo-5404498.jpeg"),
    6543599: ("Close-up video of a fountain", "close-up-video-of-a-fountain-6543599", "pexels-photo-6543599.jpeg"),
    14681703: ("Drone footage of Lago del Barbellino in Bergamo, Italy", "drone-footage-of-lago-del-barbellino-in-bergamo-italy-14681703", "alps-bergamo-dam-drone-14681703.jpeg"),
}

# output video -> (clip id, source rendition, width, fps, crf). Moving water is hard to
# compress, so the hover clips are small and the hero trades a little detail for weight.
VIDEOS = {
    "hero.mp4": (39328704, "16735994_1920_1080_60fps.mp4", 1600, 30, 31),
    "product-citizen.mp4": (20597710, "20597710-hd_1280_720_24fps.mp4", 960, 24, 30),
    "product-org.mp4": (7653817, "7653817-hd_1280_720_25fps.mp4", 960, 25, 30),
    "adds.mp4": (15214302, "15214302-hd_1280_720_30fps.mp4", 960, 30, 30),
}

# output image -> (clip id, width, height, horizontal focus 0..1)
IMAGES = {
    # process steps: report, grade, strengthen, release
    "step-1.webp": (39328704, 704, 881, 0.5), "step-2.webp": (16478020, 704, 881, 0.5),
    "step-3.webp": (7653817, 704, 881, 0.55), "step-4.webp": (27114631, 704, 881, 0.45),
    "step-1-sm.webp": (39328704, 80, 100, 0.5), "step-2-sm.webp": (16478020, 80, 100, 0.5),
    "step-3-sm.webp": (7653817, 80, 100, 0.55), "step-4-sm.webp": (27114631, 80, 100, 0.45),
    # big portrait backgrounds
    "showcase-1.webp": (9722037, 1500, 1983, 0.5), "showcase-2.webp": (25546900, 1500, 1983, 0.35),
    # who it serves: citizens, ecologists, municipalities
    "serves-1.webp": (20597710, 1500, 1000, 0.5), "serves-2.webp": (854629, 1500, 1000, 0.5), "serves-3.webp": (37800270, 1500, 1000, 0.5),
    "serves-1-sm.webp": (20597710, 72, 72, 0.5), "serves-2-sm.webp": (854629, 72, 72, 0.5), "serves-3-sm.webp": (37800270, 72, 72, 0.5),
    # former portrait slots
    "intro.webp": (10728109, 454, 604, 0.3), "process-a.webp": (33202267, 454, 604, 0.5),
    "process-b.webp": (12399482, 454, 604, 0.5), "about.webp": (5404498, 454, 604, 0.5),
    # what it adds (poster under the video)
    "adds.webp": (15214302, 1261, 867, 0.5),
    # FAQ hover images and their mobile thumbnails
    **{f"faq-{n}.webp": (c, 640, 863, 0.5) for n, c in enumerate([16478020, 25546900, 9722037, 10728109, 6543599, 5404498, 14681703, 12399482], 1)},
    **{f"faq-{n}-sm.webp": (c, 240, 324, 0.5) for n, c in enumerate([16478020, 25546900, 9722037, 10728109, 6543599, 5404498, 14681703, 12399482], 1)},
    "faq-avatar.webp": (16478020, 128, 128, 0.5),
}


def fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(dest, "wb") as f:
            shutil.copyfileobj(r, f)
        print("downloaded", dest.name, f"{dest.stat().st_size / 1e6:.1f} MB")
    return dest


def cover(im: Image.Image, w: int, h: int, fx: float) -> Image.Image:
    """Scale to cover w x h, crop around the horizontal focus fx (vertical centre)."""
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = min(max(round(im.width * fx - w / 2), 0), im.width - w)
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def stills() -> None:
    for name, (cid, w, h, fx) in IMAGES.items():
        poster = fetch(f"https://images.pexels.com/videos/{cid}/{CLIPS[cid][2]}?auto=compress&cs=tinysrgb&w=1920",
                       SRC / f"{cid}.jpg")
        cover(Image.open(poster).convert("RGB"), w, h, fx).save(OUT / name, "WEBP", quality=80, method=6)


def videos() -> None:
    for name, (cid, rendition, width, fps, crf) in VIDEOS.items():
        raw = fetch(f"https://videos.pexels.com/video-files/{cid}/{rendition}", SRC / rendition)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-an", "-vf", f"scale={width}:-2,fps={fps}",
                        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                        str(OUT / name)], check=True)
        print("encoded", name, f"{(OUT / name).stat().st_size / 1e6:.1f} MB")


def product_shots() -> None:
    """The two product slots show the real app, not stock."""
    from playwright.sync_api import sync_playwright
    base = "http://localhost:3200"
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 404, "height": 505}, device_scale_factor=2, is_mobile=True, has_touch=True)
        r = ctx.request
        r.post(f"{base}/api/session", form={"role": "citizen"})
        r.post(f"{base}/api/session", form={"role": "org"})
        mine = [x for x in r.get(f"{base}/api/me").json()["reports"] if x["grade"] in ("A", "B")]
        if not mine:  # show a well-evidenced report: file one with a sharp, timestamped photo
            import io
            from datetime import datetime
            import numpy as np
            arr = (np.random.default_rng(3).random((900, 1200, 3)) * 255).astype("uint8")
            exif = Image.Exif()
            exif[0x0132] = datetime.now().strftime("%Y:%m:%d %H:%M:%S")
            buf = io.BytesIO()
            Image.fromarray(arr).save(buf, "JPEG", exif=exif.tobytes(), quality=85)
            lat, lon = r.get(f"{base}/api/meta").json()["start"]
            r.post(f"{base}/api/reports", multipart={"lat": str(lat), "lon": str(lon), "accuracy": "8", "codes": "stagnant-water",
                                                      "photo": {"name": "p.jpg", "mimeType": "image/jpeg", "buffer": buf.getvalue()}})
            mine = [x for x in r.get(f"{base}/api/me").json()["reports"] if x["grade"] in ("A", "B")]
        todo = r.get(f"{base}/api/queue").json()["todo"]
        page = ctx.new_page()
        page.goto(f"{base}/reports/{sorted(mine, key=lambda x: x['grade'])[0]['id']}", wait_until="networkidle")
        page.add_style_tag(content=".tabbar{display:none!important} nextjs-portal{display:none!important}")
        page.wait_for_timeout(800)
        page.screenshot(path=str(SRC / "product-citizen.png"))
        ctx2 = b.new_context(viewport={"width": 1213, "height": 756}, device_scale_factor=1)
        ctx2.request.post(f"{base}/api/session", form={"role": "org"})
        page = ctx2.new_page()
        page.goto(f"{base}/review/{todo[0]['id']}", wait_until="networkidle")
        page.add_style_tag(content="nextjs-portal{display:none!important}")
        page.wait_for_timeout(1200)
        page.screenshot(path=str(SRC / "product-org.png"))
        b.close()
    cover(Image.open(SRC / "product-citizen.png").convert("RGB"), 808, 1009, 0.5).save(OUT / "product-citizen.webp", "WEBP", quality=85)
    cover(Image.open(SRC / "product-org.png").convert("RGB"), 1213, 756, 0.5).save(OUT / "product-org.webp", "WEBP", quality=85)
    print("product screenshots updated")


def credits() -> None:
    lines = ["# Media credits", "",
             "Stock footage and stills from [Pexels](https://www.pexels.com/license/) (free to use, attribution not required; credited anyway).",
             "The stills are frames from the same videos. `product-*.webp` are screenshots of the StreamProof app.", "",
             "| Pexels video | Used for |", "|---|---|"]
    used: dict[int, list[str]] = {}
    for n, (cid, *_) in VIDEOS.items():
        used.setdefault(cid, []).append(n)
    for n, (cid, *_) in IMAGES.items():
        if not n.endswith("-sm.webp"):
            used.setdefault(cid, []).append(n)
    for cid, names in used.items():
        title, slug, _ = CLIPS[cid]
        lines.append(f"| [{title}](https://www.pexels.com/video/{slug}/) | {', '.join(names)} |")
    (OUT / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    SRC.mkdir(parents=True, exist_ok=True)
    stills()
    videos()
    if "--shots" in sys.argv:
        product_shots()
    credits()
    print("done ->", OUT)
