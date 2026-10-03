"""Screenshot the StreamProof web app across devices.

    python shots.py [pages...]   # default: all pages, all devices
"""
import io
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3200"
OUT = Path(__file__).parent / "output"
OUT.mkdir(exist_ok=True)

DEVICES = {
    "phone": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "phone-land": dict(viewport={"width": 844, "height": 390}, device_scale_factor=2, is_mobile=True, has_touch=True),
    "tablet": dict(viewport={"width": 820, "height": 1180}, device_scale_factor=1, has_touch=True),
    "desktop": dict(viewport={"width": 1440, "height": 900}, device_scale_factor=1),
    "duo": dict(viewport={"width": 1114, "height": 705}, device_scale_factor=1, has_touch=True),  # two 540 px screens + 34 px hinge
    "dark-phone": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark"),
}


def jpeg() -> bytes:
    rng = np.random.default_rng(3)
    arr = (rng.random((900, 1200, 3)) * 255).astype("uint8")
    img = Image.fromarray(arr)
    exif = Image.Exif()
    exif[0x0132] = datetime.now().strftime("%Y:%m:%d %H:%M:%S")
    b = io.BytesIO()
    img.save(b, format="JPEG", exif=exif.tobytes(), quality=85)
    return b.getvalue()


def setup(ctx):
    r = ctx.request
    r.delete(f"{BASE}/api/session")
    r.post(f"{BASE}/api/session", form={"role": "citizen"})
    r.post(f"{BASE}/api/session", form={"role": "org"})
    me = r.get(f"{BASE}/api/me").json()
    if not me["reports"]:
        meta = r.get(f"{BASE}/api/meta").json()
        lat, lon = meta["start"]
        r.post(f"{BASE}/api/reports", multipart={
            "lat": str(lat), "lon": str(lon), "accuracy": "8", "codes": "stagnant-water",
            "description": "Green still water by the footbridge",
            "photo": {"name": "p.jpg", "mimeType": "image/jpeg", "buffer": jpeg()}})
        me = r.get(f"{BASE}/api/me").json()
    mine = me["reports"][0]["id"]
    q = r.get(f"{BASE}/api/queue").json()
    cert = next(x["id"] for x in q["done"] if x["certificate"])
    return mine, q["todo"][0]["id"] if q["todo"] else mine, cert


def main():
    want = set(sys.argv[1:])
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, opts in DEVICES.items():
            if want and not (want & {name, "all-devices"}) and any(w in DEVICES for w in want):
                continue
            ctx = b.new_context(**opts)
            mine, todo, cert = setup(ctx)
            pages = {
                "report": "/report", "reports": "/reports", "card": f"/reports/{mine}", "review": "/review",
                "review-detail": f"/review/{todo}", "brief": "/brief", "standards": "/standards", "verify": f"/verify/{cert}",
            }
            for key, path in pages.items():
                if want and not (want & {key}) and not any(w in DEVICES for w in want):
                    continue
                page = ctx.new_page()
                if name == "duo":
                    cdp = ctx.new_cdp_session(page)
                    cdp.send("Emulation.setDeviceMetricsOverride", {"width": 1114, "height": 705, "deviceScaleFactor": 1, "mobile": True,
                                                                     "displayFeature": {"orientation": "vertical", "offset": 540, "maskLength": 34}})
                    cdp.send("Emulation.setDisplayFeaturesOverride", {"features": [{"orientation": "vertical", "offset": 540, "maskLength": 34}]})
                errors = []
                page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
                page.goto(BASE + path, wait_until="networkidle")
                page.wait_for_timeout(1200)
                full = name in ("phone", "dark-phone", "desktop")
                if name == "duo":  # Playwright's screenshot resets the hinge emulation; capture via CDP
                    import base64
                    (OUT / f"{name}-{key}.png").write_bytes(base64.b64decode(cdp.send("Page.captureScreenshot", {"format": "png"})["data"]))
                else:
                    page.screenshot(path=str(OUT / f"{name}-{key}.png"), full_page=full)
                if errors:
                    print(name, key, "console errors:", errors[:3])
                page.close()
            ctx.close()
        b.close()
    print("saved to", OUT)


if __name__ == "__main__":
    main()
