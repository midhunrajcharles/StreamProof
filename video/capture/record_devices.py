"""Record the app on a tablet and on a dual-screen (foldable) device, for the silent "every screen" film.

    python video/capture/record_devices.py [tablet] [duo] [--no-build]

Same servers, seed data and screencast pipeline as record.py (it is imported, not copied):
  tablet  820 x 1180 CSS, touch      -> top tab bar layout. A citizen: home, an open mission and its map, then a report card.
  duo     1040 x 732 CSS, one folding screen, fold at 520 px (Viewport Segments emulation; the shape of Apple's foldable inner display)
                                     -> rail + list on screen 1, the report on screen 2. An organiser: open, ask for more
                                        evidence, scroll the evidence, verify in the field.
Output: video/remotion/public/footage/tablet.mp4/.json and duo.mp4/.json
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import record as R  # noqa: E402  (record.py only runs its main under __main__)
from playwright.sync_api import expect, sync_playwright  # noqa: E402

DPR = "--force-device-scale-factor=1.5"  # the screencast only gives real pixels with this flag
BASE = R.BASE


def smooth(pg, total: int, steps: int = 8, gap: int = 90) -> None:
    """Scroll `total` px in small steps, like a thumb or a trackpad."""
    for _ in range(steps):
        pg.mouse.wheel(0, total / steps)
        pg.wait_for_timeout(gap)


def shot_tablet(p) -> None:
    b = p.chromium.launch(args=[DPR])
    ctx = b.new_context(viewport={"width": 820, "height": 1180}, device_scale_factor=1.5, has_touch=True, locale="en-GB")
    ctx.add_init_script("try { localStorage.setItem('sp-lang', 'en') } catch (e) {}")
    ctx.request.post(f"{BASE}/api/session", form={"role": "citizen"})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/home", wait_until="networkidle")
    expect(pg.locator('a[href^="/missions/"]').first).to_be_visible(timeout=20000)
    pg.wait_for_timeout(900)
    r = R.Recorder(pg, "tablet", 1230, 1770)
    r.start()
    r.mark("home")
    pg.wait_for_timeout(2600)
    smooth(pg, 420)
    r.mark("scrolled")
    pg.wait_for_timeout(1400)
    r.click(pg.locator('a[href^="/missions/"]').first, "mission", pause_after=600)
    pg.wait_for_url(re.compile(r"/missions/"), timeout=20000)
    expect(pg.get_by_role("button", name=re.compile("Report for this mission")).or_(pg.get_by_role("link", name=re.compile("Report for this mission")))).to_be_visible(timeout=20000)
    pg.wait_for_timeout(2600)  # map tiles
    r.mark("mission-page")
    smooth(pg, 260, 5)
    pg.wait_for_timeout(2200)
    pg.mouse.wheel(0, -600)
    pg.wait_for_timeout(1200)
    r.click(pg.get_by_role("link", name=re.compile("^Reports")).first, "reports-tab", pause_after=900)
    expect(pg.locator('a[href^="/reports/SP-"]').first).to_be_visible(timeout=20000)
    r.mark("reports")
    pg.wait_for_timeout(1800)
    r.click(pg.locator('a[href^="/reports/SP-"]').first, "open-report", pause_after=700)
    pg.wait_for_url(re.compile(r"/reports/SP-\d+"), timeout=20000)
    pg.wait_for_timeout(1800)
    r.mark("card")
    pg.wait_for_timeout(1500)
    smooth(pg, 520, 8, 110)
    r.mark("reasons")
    pg.wait_for_timeout(2000)
    smooth(pg, 520, 8, 110)
    r.mark("ladder")
    pg.wait_for_timeout(2600)
    r.stop()
    b.close()


def shot_duo(p) -> None:
    b = p.chromium.launch(args=[DPR])
    ctx = b.new_context(viewport={"width": 1040, "height": 732}, device_scale_factor=1.5, has_touch=True, locale="en-GB")
    ctx.add_init_script("try { localStorage.setItem('sp-lang', 'en') } catch (e) {}")
    ctx.request.post(f"{BASE}/api/session", form={"role": "org"})
    pg = ctx.new_page()
    cdp = ctx.new_cdp_session(pg)
    feature = {"orientation": "vertical", "offset": 520, "maskLength": 0}  # one folding screen: a fold, no gap
    cdp.send("Emulation.setDeviceMetricsOverride", {"width": 1040, "height": 732, "deviceScaleFactor": 1.5, "mobile": True, "displayFeature": feature})
    cdp.send("Emulation.setDisplayFeaturesOverride", {"features": [feature]})
    pg.goto(f"{BASE}/review", wait_until="networkidle")
    expect(pg.locator(".split-list a").first).to_be_visible(timeout=20000)
    pg.wait_for_timeout(1000)
    r = R.Recorder(pg, "duo", 1560, 1098)
    r.start()
    r.mark("queue")
    pg.wait_for_timeout(2600)
    rows = pg.locator(".split-list a").filter(has_text="Community-supported")
    r.click(rows.first, "open-report", pause_after=300)
    verify = pg.get_by_role("button", name="Verify…")
    expect(verify).to_be_visible(timeout=20000)
    pg.wait_for_timeout(900)
    r.mark("detail")
    pg.wait_for_timeout(2200)
    ask = pg.get_by_role("button", name=re.compile("Ask for more evidence"))
    r.click(ask, "ask", pause_after=300)
    expect(pg.locator(".toast-region")).to_contain_text("mission", ignore_case=True, timeout=15000)
    r.mark("mission-toast")
    pg.wait_for_timeout(2400)
    pg.mouse.move(780, 420)
    smooth(pg, 700, 10, 110)
    r.mark("evidence")
    pg.wait_for_timeout(2200)
    smooth(pg, -700, 8, 60)
    pg.wait_for_timeout(900)
    r.click(verify, "verify-open", pause_after=800)
    dlg = pg.get_by_role("dialog")
    r.click(dlg.get_by_role("radio", name="Field check"), "field", pause_after=400)
    note = dlg.get_by_label("Note for the record (optional)")
    note.click()
    note.type("Larvae in the dip sample", delay=35)
    r.click(dlg.get_by_role("button", name="Verify", exact=True), "verify", pause_after=300)
    expect(pg.locator(".toast-region")).to_contain_text("Signed record issued", timeout=20000)
    r.mark("verified")
    pg.wait_for_timeout(3200)
    r.stop()
    b.close()


if __name__ == "__main__":
    want = [a for a in sys.argv[1:] if not a.startswith("--")] or ["tablet", "duo"]
    with R.Servers(), sync_playwright() as p:
        if "tablet" in want:
            shot_tablet(p)
        if "duo" in want:
            shot_duo(p)
