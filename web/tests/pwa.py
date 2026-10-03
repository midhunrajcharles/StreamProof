import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3300"
for _ in range(30):
    try:
        import urllib.request
        urllib.request.urlopen(BASE + "/standards", timeout=2)
        break
    except Exception:
        time.sleep(1)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    ctx.request.post(f"{BASE}/api/session", form={"role": "citizen"})
    page = ctx.new_page()
    page.goto(BASE + "/reports", wait_until="networkidle")
    page.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null || (location.reload(), false)", timeout=15000) if False else None
    sw = page.evaluate("navigator.serviceWorker.ready.then(r => r.active && r.active.scriptURL)")
    print("service worker:", sw)
    page.reload(wait_until="networkidle")  # now controlled: page + API cached
    page.goto(BASE + "/report", wait_until="networkidle")
    m = ctx.request.get(BASE + "/manifest.webmanifest").json()
    print("manifest:", m["name"], m["display"], [i["sizes"] for i in m["icons"]])
    ctx.set_offline(True)
    page.goto(BASE + "/reports")
    page.wait_for_timeout(1500)
    print("offline /reports heading:", page.locator("h1").first.inner_text(), "| reports listed:", page.locator(".row").count())
    page.goto(BASE + "/brief")
    page.wait_for_timeout(1000)
    print("offline unvisited page:", page.locator("h1").first.inner_text())
    b.close()
