"""Landing page check: scroll like a visitor, screenshot each section, and report
missing files or videos that don't play.

    python landing.py [desktop|phone]
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3200/"
OUT = Path(__file__).parent / "output"
OUT.mkdir(exist_ok=True)
SIZES = {"desktop": dict(viewport={"width": 1440, "height": 900}), "phone": dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)}

with sync_playwright() as p:
    b = p.chromium.launch()
    for name in sys.argv[1:] or SIZES:
        page = b.new_context(**SIZES[name]).new_page()
        failed = []
        page.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        page.on("requestfailed", lambda r: failed.append(f"failed {r.url}"))
        page.goto(BASE, wait_until="networkidle")
        page.wait_for_timeout(2500)
        height = page.evaluate("document.body.scrollHeight")
        stops = ["hero", "#work", "#background-container", "#process", "#services", "#testimonials", "#about", "#faq"]
        for i, sel in enumerate(stops):
            if sel != "hero":
                page.evaluate(f"document.querySelector('{sel}').scrollIntoView()")
            page.mouse.wheel(0, 300)  # nudge so scroll-driven animations run
            page.wait_for_timeout(1600)
            page.screenshot(path=str(OUT / f"landing-{name}-{i}-{sel.strip('#')}.png"))
        videos = page.evaluate("""[...document.querySelectorAll('video')].map(v => ({src: v.currentSrc || v.dataset.src, ready: v.readyState, playing: !v.paused}))""")
        print(name, "page height", height)
        for v in videos:
            print("  video", v)
        print("  failed requests:", failed or "none")
    b.close()
