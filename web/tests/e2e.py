"""End-to-end through the UI on a phone viewport. Prints PASS/FAIL per step.

    python e2e.py                      # against http://localhost:3200
    STREAMPROOF_WEB=http://localhost:3301 python e2e.py
"""
import os
import re
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("STREAMPROOF_WEB", "http://localhost:3200")
ok = True


def step(name, fn):
    global ok
    try:
        fn()
        print("PASS", name)
    except Exception as e:  # noqa: BLE001
        ok = False
        print("FAIL", name, "->", str(e).splitlines()[0][:200])


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    ctx.request.post(f"{BASE}/api/demo/reset") if False else None
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # reset demo data (needs the reviewer role)
    ctx.request.post(f"{BASE}/api/session", form={"role": "org"})
    ctx.request.post(f"{BASE}/api/demo/reset")
    ctx.request.delete(f"{BASE}/api/session")

    def citizen_signin():
        page.goto(f"{BASE}/report")
        page.get_by_label("What should we call you? (optional)").fill("Test citizen")
        page.get_by_role("button", name="Start reporting").click()
        expect(page.get_by_role("heading", name="Report a stream")).to_be_visible()
        expect(page.get_by_role("button", name="Stagnant water")).to_be_visible()
        expect(page.get_by_text("Before your first report")).to_be_visible()
    step("new anonymous citizen starts from the report page", citizen_signin)

    def validation():
        page.get_by_role("button", name="Submit report").click()
        expect(page.locator(".field-error")).to_contain_text("Choose at least one thing")
        expect(page.locator(".field-error")).to_be_focused()
    step("submit without a sign shows an inline error", validation)

    def exclusive():
        page.get_by_role("button", name="Stagnant water").click()
        page.get_by_role("button", name="Everything looks fine").click()
        expect(page.get_by_role("button", name="Stagnant water")).to_have_attribute("aria-pressed", "false")
        page.get_by_role("button", name="Stagnant water").click()
        expect(page.get_by_role("button", name="Everything looks fine")).to_have_attribute("aria-pressed", "false")
    step("'Everything looks fine' is exclusive", exclusive)

    rid = {}

    def submit():
        page.get_by_role("button", name="Many mosquitoes").click()
        page.get_by_label("Notes (optional)").fill("Side pool, mosquitoes at dusk")
        page.get_by_role("button", name="Submit report").click()
        expect(page.locator(".field-error")).to_contain_text("agree")  # consent is required first
        page.get_by_label("I agree to how my report is used, as described above.").check()
        page.get_by_role("button", name="Submit report").click()
        page.wait_for_url(re.compile(r"/reports/SP-\d+\?new=1"))
        rid["id"] = re.search(r"SP-\d+", page.url).group(0)
        expect(page.get_by_text("Report sent")).to_be_visible()
        expect(page.get_by_text("Why this grade", exact=False)).to_be_visible()
    step("submit lands on the graded report card", submit)

    def reviewer():
        page.goto(f"{BASE}/review/{rid['id']}")
        page.get_by_role("button", name="Continue with the demo reviewer").click()
        expect(page.get_by_role("button", name="Verify…")).to_be_visible()
    step("reviewer sign-in and detail on phone", reviewer)

    def gate_refuses():
        page.get_by_role("button", name="Export FHIR R4 bundle").click()
        expect(page.get_by_text("Export refused by the gate")).to_be_visible()
        expect(page.get_by_text("Blocked by the permitted-use gate")).to_be_visible()
    step("FHIR export is refused below Expert-verified", gate_refuses)

    def verify():
        page.get_by_role("button", name="Verify…").click()
        dlg = page.get_by_role("dialog")
        expect(dlg).to_be_visible()
        dlg.get_by_role("radio", name="Field check").click()
        dlg.get_by_label("Note for the record (optional)").fill("Larvae in dip sample")
        dlg.get_by_role("button", name="Verify", exact=True).click()
        expect(page.locator(".toast-region")).to_contain_text("Signed record issued")
        expect(page.get_by_text("Verified (field check)", exact=True)).to_be_visible()
        expect(page.get_by_role("dialog")).to_have_count(0)
    step("verify through the sheet", verify)

    def gate_allows():
        page.get_by_role("button", name="Export FHIR R4 bundle").click()
        dlg = page.get_by_role("dialog")
        expect(dlg.get_by_text('"resourceType": "Bundle"', exact=False)).to_be_visible()
        dlg.get_by_role("button", name="Done").click()
        expect(dlg).to_be_hidden()
    step("FHIR export allowed after verification", gate_allows)

    def reject():
        page.goto(f"{BASE}/review")
        page.get_by_role("link", name=re.compile("Litter, Foam")).first.click()
        page.get_by_role("button", name="Not confirmed…").click()
        dlg = page.get_by_role("dialog")
        btn = dlg.get_by_role("button", name="Mark not confirmed")
        expect(btn).to_be_disabled()
        dlg.get_by_label("Reason").fill("Foam from the weir, not pollution. Thanks!")
        btn.click()
        expect(page.get_by_role("alert").or_(page.get_by_text("Not confirmed", exact=True)).first).to_be_visible()
    step("reject needs a reason", reject)

    def certificate():
        page.goto(f"{BASE}/reports/{rid['id']}")
        expect(page.get_by_text("Your contribution is signed")).to_be_visible()
        page.get_by_role("link", name="Check signature").click()
        expect(page.get_by_role("heading", name="Signature valid")).to_be_visible()
        box = page.get_by_label("Record JSON")
        box.fill(box.input_value().replace('"grade": "', '"grade": "Z'))
        page.get_by_role("button", name="Check this version").click()
        expect(page.get_by_role("heading", name="Doesn't match")).to_be_visible()
    step("certificate + tamper check", certificate)

    def offline():
        page.goto(f"{BASE}/report")
        expect(page.get_by_role("button", name="Litter")).to_be_visible()
        ctx.set_offline(True)
        page.get_by_role("button", name="Litter").click()
        page.get_by_role("button", name="Submit report").click()
        expect(page.get_by_role("heading", name="Saved on this device")).to_be_visible()
        n = page.evaluate("""() => new Promise(r => { const q = indexedDB.open('streamproof'); q.onsuccess = () => {
            const g = q.result.transaction('outbox').objectStore('outbox').count(); g.onsuccess = () => r(g.result); }; })""")
        assert n == 1, f"outbox has {n}"
        ctx.set_offline(False)
        page.evaluate("window.dispatchEvent(new Event('online'))")
        expect(page.locator(".toast-region")).to_contain_text("Saved report sent", timeout=15000)
    step("offline report is saved, then sent when back online", offline)

    def tab_bar():
        page.goto(f"{BASE}/brief")
        nav = page.get_by_role("navigation", name="Sections").last
        expect(nav.get_by_role("link", name="Brief")).to_have_attribute("aria-current", "page")
        nav.get_by_role("link", name="Standards").click()
        expect(page.get_by_role("heading", name="Standards")).to_be_visible()
    step("tab bar navigation and current tab", tab_bar)

    def swipe_dismiss():
        page.goto(f"{BASE}/review", wait_until="networkidle")
        page.get_by_role("button", name="Demo options").click()
        dlg = page.locator("dialog[open]")
        expect(dlg).to_have_count(1)
        page.wait_for_timeout(500)  # let the opening animation finish
        box = dlg.locator(".sheet-grab").bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        page.mouse.move(x, y); page.mouse.down(); page.mouse.move(x, y + 80, steps=5); page.mouse.move(x, y + 220, steps=5); page.mouse.up()
        expect(dlg).to_have_count(0)
        page.get_by_role("button", name="Demo options").click()
        page.get_by_role("dialog").get_by_role("button", name="Cancel").click()
        expect(page.get_by_role("dialog")).to_have_count(0)
    step("sheet: swipe down and Cancel both dismiss", swipe_dismiss)

    # demo account details come from the project's seed file (test values for this app)
    seed_src = (Path(__file__).resolve().parents[2] / "app" / "seed.py").read_text(encoding="utf-8")
    admin_email = re.search(r'STREAMPROOF_DEMO_ADMIN", "([^"]+)"', seed_src).group(1)
    demo_pw = re.search(r'STREAMPROOF_DEMO_PASSWORD", "([^"]+)"', seed_src).group(1)
    sp = b.new_context(viewport={"width": 1280, "height": 860}).new_page()

    def org_login():
        sp.goto(f"{BASE}/sign-in?role=org&next=/account")
        sp.get_by_label("Email").fill(admin_email)
        sp.get_by_label("Password").fill("definitely-wrong")
        sp.get_by_role("button", name="Sign in", exact=True).click()
        expect(sp.locator(".field-error")).to_contain_text("don't match")
        sp.get_by_label("Password").fill(demo_pw)
        sp.get_by_role("button", name="Sign in", exact=True).click()
        sp.wait_for_url(f"{BASE}/account")
        expect(sp.get_by_text("Pilot coordinator (demo)").first).to_be_visible()
    step("organisation sign-in with email and password", org_login)

    new_email = f"e2e.{int(time.time())}@example.org"  # accounts survive demo resets

    def team_admin():
        sp.get_by_role("button", name="Add", exact=True).click()
        dlg = sp.get_by_role("dialog")
        dlg.get_by_label("Name").fill("E2E Reviewer")
        dlg.get_by_label("Email").fill(new_email)
        dlg.get_by_label("Temporary password").fill("a-long-temporary-password")
        dlg.get_by_role("button", name="Add member").click()
        expect(sp.locator(".toast-region")).to_contain_text("can now sign in")
        other = b.new_context(viewport={"width": 1280, "height": 860}).new_page()
        other.goto(f"{BASE}/sign-in?role=org&next=/review")
        other.get_by_label("Email").fill(new_email)
        other.get_by_label("Password").fill("a-long-temporary-password")
        other.get_by_role("button", name="Sign in", exact=True).click()
        other.wait_for_url(f"{BASE}/review")
        row = sp.locator(".row", has_text=new_email)
        row.get_by_role("button", name="Deactivate").click()
        expect(row).to_contain_text("deactivated")
        other.reload()
        expect(other.get_by_role("heading", name="Organisation sign-in")).to_be_visible()
    step("admin adds a reviewer, then deactivation signs them out", team_admin)

    def share_card():
        anon = b.new_context().new_page()
        anon.goto(f"{BASE}/share/{rid['id']}")
        expect(anon.get_by_role("heading", name=re.compile("near Ribeira de Coselhas"))).to_be_visible()
        body = anon.locator("main").inner_text()
        assert "obs-" not in body and "40.2" not in body, "share card leaks identity or coordinates"
    step("public share card shows no person or coordinates", share_card)

    print("console errors:", [e for e in errors if "favicon" not in e][:5])
    b.close()
print("ALL PASS" if ok else "SOME FAILED")
