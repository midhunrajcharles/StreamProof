"""Landing-page media: Pexels photos and videos (free licence, no attribution required;
credited anyway in public/media/CREDITS.md) plus two screenshots of the StreamProof app.

    python tools/media.py              # download, crop, encode -> public/media/
    python tools/media.py --shots      # also re-capture the product screenshots
                                       # (needs the API on :8740 and the web app on :3200)

Photos are fetched at or above each slot's size and only ever scaled down.
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

# Pexels photo id -> (what it shows, file name on images.pexels.com, download width)
PHOTOS = {
    37666113: ("Person taking a water sample at a stream", "pexels-photo-37666113.jpeg", 1600),
    36785073: ("Green algae scum on water", "pexels-photo-36785073.jpeg", 1600),
    30824856: ("Field workers checking a wetland", "pexels-photo-30824856.jpeg", 1600),
    27490881: ("Water treatment plant from above", "pexels-photo-27490881.jpeg", 2000),
    11895413: ("Forest stream over mossy rocks", "pexels-photo-11895413.jpeg", 3000),
    1878304: ("Waterfall in a dark forest", "pexels-photo-1878304.jpeg", 3000),
    9292790: ("Child walking along a creek", "pexels-photo-9292790.jpeg", 2400),
    8851786: ("Scientist working with water samples in a lab", "pexels-photo-8851786.jpeg", 2400),
    33754554: ("Historic town on a river", "pexels-photo-33754554.jpeg", 2400),
    5875933: ("Hand in a clear stream", "pexels-photo-5875933.jpeg", 1400),
    20736175: ("Stream through moorland", "pexels-photo-20736175.jpeg", 1400),
    158268: ("Rapids over river stones", "water-bach-river-stones-158268.jpeg", 1400),
    8945510: ("Rocky forest stream", "pexels-photo-8945510.jpeg", 1400),
    169357: ("Mosquito, close up", "pexels-photo-169357.jpeg", 1400),
    7402626: ("Scientist holding a water sample", "pexels-photo-7402626.jpeg", 1400),
    34303715: ("River delta from above", "pexels-photo-34303715.jpeg", 2000),
    3735711: ("Researcher in a laboratory", "pexels-photo-3735711.jpeg", 1400),
    39493563: ("Canal in a European city", "pexels-photo-39493563.jpeg", 1400),
    3772365: ("Hand reaching toward light by water", "pexels-photo-3772365.jpeg", 1400),
    27798146: ("Plastic litter floating in water", "pexels-photo-27798146.jpeg", 1400),
    32588450: ("River under trees", "pexels-photo-32588450.jpeg", 1400),
}

# Pexels video id -> (title, page slug)
CLIPS = {
    7388473: ("A small stream in the woodland", "a-small-stream-in-the-woodland-7388473"),
    4855724: ("Wastes on the canal", "wastes-on-the-canal-4855724"),
    1430660: ("People studying the water", "people-studying-the-water-1430660"),
    32312845: ("Aerial view of urban canal and bridge infrastructure", "aerial-view-of-urban-canal-and-bridge-infrastructure-32312845"),
}

# output video -> (clip id, source rendition, width, fps, crf, seconds)
VIDEOS = {
    "hero.mp4": (7388473, "7388473-hd_1920_1080_30fps.mp4", 1600, 30, 26, 12),
    "product-citizen.mp4": (4855724, "4855724-hd_1280_720_25fps.mp4", 960, 25, 25, 12),
    "product-org.mp4": (1430660, "1430660-hd_1280_720_30fps.mp4", 960, 30, 25, 12),
    "adds.mp4": (32312845, "13780939_1920_1080_60fps.mp4", 1280, 30, 25, 14),
}

FAQ = [169357, 7402626, 34303715, 3735711, 39493563, 3772365, 27798146, 32588450]

# output image -> (photo id, width, height, horizontal focus 0..1, vertical focus 0..1)
IMAGES = {
    "step-1.webp": (37666113, 704, 881, 0.5, 0.5), "step-2.webp": (36785073, 704, 881, 0.5, 0.5),
    "step-3.webp": (30824856, 704, 881, 0.5, 0.5), "step-4.webp": (27490881, 704, 881, 0.5, 0.5),
    "step-1-sm.webp": (37666113, 80, 100, 0.5, 0.5), "step-2-sm.webp": (36785073, 80, 100, 0.5, 0.5),
    "step-3-sm.webp": (30824856, 80, 100, 0.5, 0.5), "step-4-sm.webp": (27490881, 80, 100, 0.5, 0.5),
    "showcase-1.webp": (11895413, 1500, 1983, 0.55, 0.5), "showcase-2.webp": (1878304, 1500, 1983, 0.5, 0.5),
    "serves-1.webp": (9292790, 1500, 1000, 0.5, 0.5), "serves-2.webp": (8851786, 1500, 1000, 0.5, 0.4), "serves-3.webp": (33754554, 1500, 1000, 0.5, 0.5),
    "serves-1-sm.webp": (9292790, 72, 72, 0.5, 0.5), "serves-2-sm.webp": (8851786, 72, 72, 0.5, 0.4), "serves-3-sm.webp": (33754554, 72, 72, 0.5, 0.5),
    "intro.webp": (5875933, 454, 604, 0.5, 0.5), "process-a.webp": (20736175, 454, 604, 0.45, 0.5),
    "process-b.webp": (158268, 454, 604, 0.5, 0.5), "about.webp": (8945510, 454, 604, 0.5, 0.5),
    **{f"faq-{n}.webp": (p, 640, 863, 0.5, 0.5) for n, p in enumerate(FAQ, 1)},
    **{f"faq-{n}-sm.webp": (p, 240, 324, 0.5, 0.5) for n, p in enumerate(FAQ, 1)},
    "faq-avatar.webp": (37666113, 128, 128, 0.5, 0.45),
}


def fetch(url: str, dest: Path) -> Path:
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r, open(dest, "wb") as f:
            shutil.copyfileobj(r, f)
        print("downloaded", dest.name, f"{dest.stat().st_size / 1e6:.1f} MB")
    return dest


def cover(im: Image.Image, w: int, h: int, fx: float = 0.5, fy: float = 0.5, name: str = "") -> Image.Image:
    """Scale to cover w x h (down only, warn otherwise), crop around the focus point."""
    s = max(w / im.width, h / im.height)
    if s > 1.001:
        print(f"  warning: {name} would be upscaled x{s:.2f}")
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = min(max(round(im.width * fx - w / 2), 0), im.width - w)
    y = min(max(round(im.height * fy - h / 2), 0), im.height - h)
    return im.crop((x, y, x + w, y + h))


def photo(pid: int) -> Image.Image:
    _, fn, width = PHOTOS[pid]
    p = fetch(f"https://images.pexels.com/photos/{pid}/{fn}?auto=compress&cs=tinysrgb&w={width}", SRC / f"photo-{pid}.jpg")
    return Image.open(p).convert("RGB")


def stills() -> None:
    for name, (pid, w, h, fx, fy) in IMAGES.items():
        q = 82 if w >= 400 else 88
        cover(photo(pid), w, h, fx, fy, name).save(OUT / name, "WEBP", quality=q, method=6)


def videos() -> None:
    for name, (cid, rendition, width, fps, crf, secs) in VIDEOS.items():
        raw = fetch(f"https://videos.pexels.com/video-files/{cid}/{rendition}", SRC / rendition)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-t", str(secs), "-an",
                        "-vf", f"scale={width}:-2:flags=lanczos,fps={fps}", "-c:v", "libx264", "-preset", "slow",
                        "-crf", str(crf), "-tune", "film", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                        str(OUT / name)], check=True)
        print("encoded", name, f"{(OUT / name).stat().st_size / 1e6:.1f} MB")
    # the "what it adds" image sits under its video: use a sharp frame of the same clip
    frame = SRC / "adds-frame.png"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "3", "-i", str(SRC / VIDEOS["adds.mp4"][1]), "-frames:v", "1", str(frame)], check=True)
    cover(Image.open(frame).convert("RGB"), 1261, 867, name="adds.webp").save(OUT / "adds.webp", "WEBP", quality=82)


def product_shots() -> None:
    """The two product slots show the real app, not stock."""
    import io
    from datetime import datetime

    import numpy as np
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
    cover(Image.open(SRC / "product-citizen.png").convert("RGB"), 808, 1009).save(OUT / "product-citizen.webp", "WEBP", quality=85)
    cover(Image.open(SRC / "product-org.png").convert("RGB"), 1213, 756).save(OUT / "product-org.webp", "WEBP", quality=85)
    print("product screenshots updated")


def credits() -> None:
    lines = ["# Media credits", "",
             "Photos and footage from [Pexels](https://www.pexels.com/license/) (free to use, attribution not required; credited anyway).",
             "`product-*.webp` are screenshots of the StreamProof app.", "",
             "| Pexels | Used for |", "|---|---|"]
    for cid, (title, slug) in CLIPS.items():
        used = [n for n, v in VIDEOS.items() if v[0] == cid] + (["adds.webp"] if cid == VIDEOS["adds.mp4"][0] else [])
        lines.append(f"| Video: [{title}](https://www.pexels.com/video/{slug}/) | {', '.join(used)} |")
    for pid, (what, _, _) in PHOTOS.items():
        used = [n for n, v in IMAGES.items() if v[0] == pid and not n.endswith("-sm.webp")]
        lines.append(f"| Photo: [{what}](https://www.pexels.com/photo/{pid}/) | {', '.join(used)} |")
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
