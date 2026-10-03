"""axe-core audit of every app page, light and dark, phone and desktop."""
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3200"
AXE = urllib.request.urlopen("https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js").read().decode()

with sync_playwright() as p:
    b = p.chromium.launch()
    for scheme in ("light", "dark"):
        for vp in ({"width": 390, "height": 844}, {"width": 1440, "height": 900}):
            ctx = b.new_context(viewport=vp, color_scheme=scheme)
            r = ctx.request
            r.post(f"{BASE}/api/session", form={"role": "citizen"})
            r.post(f"{BASE}/api/session", form={"role": "org"})
            mine = r.get(f"{BASE}/api/me").json()["reports"]
            q = r.get(f"{BASE}/api/queue").json()
            cert = next(x["id"] for x in q["done"] if x["certificate"])
            paths = ["/report", "/reports", "/review", f"/review/{q['todo'][0]['id']}", "/brief", "/standards", f"/verify/{cert}"]
            if mine:
                paths.append(f"/reports/{mine[0]['id']}")
            for path in paths:
                page = ctx.new_page()
                page.goto(BASE + path, wait_until="networkidle")
                page.wait_for_timeout(800)
                page.add_script_tag(content=AXE)
                res = page.evaluate("""async () => {
                    const r = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
                      rules: { 'region': { enabled: false } } });
                    return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
                      sample: v.nodes.slice(0, 2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n')[1]) }));
                }""")
                tag = f"{scheme} {vp['width']} {path}"
                if res:
                    for v in res:
                        print(tag, "|", v["impact"], v["id"], f"x{v['n']}", "|", "; ".join(v["sample"])[:300])
                else:
                    print(tag, "| clean")
                page.close()
            ctx.close()
    b.close()
