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


def pick_city(scope, name):
    """Cities are chosen by searching; the picked one shows as a pill."""
    scope.get_by_role("combobox", name=re.compile("^Search any city")).fill(name)
    scope.get_by_role("option", name=re.compile("^" + name)).first.click()
    expect(scope.locator(".city-selected")).to_contain_text(name)


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

    def city_switch():
        page.goto(f"{BASE}/report", wait_until="networkidle")
        pick_city(page, "Oslo")
        expect(page.get_by_text("Example stream for the demo")).to_be_visible()
        page.get_by_role("button", name="Litter").click()
        page.get_by_role("button", name="Submit report").click()
        page.wait_for_url(re.compile(r"/reports/SP-\d+\?new=1"))
        expect(page.get_by_text("Akerselva, Oslo")).to_be_visible()
        rid["oslo"] = re.search(r"SP-\d+", page.url).group(0)
    step("city switcher: a report in Oslo lands on the Akerselva", city_switch)

    def any_city():  # needs the internet: Photon/Nominatim (OpenStreetMap) and Open-Meteo
        page.goto(f"{BASE}/report", wait_until="networkidle")
        pick_city(page, "Lyon")
        expect(page.locator(".city-status")).to_contain_text("mapped streams in Lyon", timeout=30000)
        page.get_by_role("button", name="Litter").click()
        page.get_by_role("button", name="Submit report").click()
        page.wait_for_url(re.compile(r"/reports/SP-\d+\?new=1"))
        expect(page.get_by_text(re.compile(r", Lyon$")).first).to_be_visible()
    step("any city: search Lyon, its streams load, the report lands on a Lyon stream", any_city)

    def language():
        page.goto(f"{BASE}/reports/{rid['id']}", wait_until="networkidle")
        page.get_by_role("button", name=re.compile("^Language")).click()
        page.get_by_role("radio", name="Português").click()
        expect(page.get_by_role("heading", name="Relato " + rid["id"])).to_be_visible()
        expect(page.get_by_text("(Porquê esta classificação)")).to_be_visible()
        body = page.locator("main").inner_text()
        for english in ("Photo is clear and well exposed", "Location confirmed", "earlier reports", "Why this grade", "Strong evidence", "Good evidence"):
            assert english not in body, f"untranslated: {english}"
        assert page.evaluate("document.documentElement.lang") == "pt"
        try:
            page.goto(f"{BASE}/review", wait_until="networkidle")  # organiser screens are translated too
            expect(page.get_by_role("heading", name="Rever", exact=True)).to_be_visible()
            body = page.locator("main").inner_text()
            for english in ("Review queue", "Nothing is waiting for review", "Select a report"):
                assert english not in body, f"untranslated on /review: {english}"
        finally:  # later steps run in English
            page.evaluate("localStorage.setItem('sp-lang', 'en')")
            ctx.clear_cookies(name="sp-lang")
    step("language switch to Português, citizen and organiser screens", language)

    citizen_email = f"e2e.citizen.{int(time.time())}@example.org"

    def citizen_signup():
        page.goto(f"{BASE}/account", wait_until="networkidle")
        expect(page.get_by_text("Reporting without an account")).to_be_visible()
        page.get_by_role("link", name="Create account").first.click()
        page.wait_for_url(re.compile(r"/sign-up"))
        expect(page.get_by_text("Your reports on this device will move into the new account.")).to_be_visible()
        page.get_by_label("Email").fill(citizen_email)
        page.get_by_label("Password").fill("a-long-citizen-password")
        submit_btn = page.get_by_role("button", name="Create account")
        expect(submit_btn).to_be_disabled()  # needs a city and the agreement
        pick_city(page, "Coimbra")
        expect(submit_btn).to_be_disabled()  # still needs the agreement
        page.get_by_label("I agree to how my reports are used.").check()
        submit_btn.click()
        page.wait_for_url(f"{BASE}/account")
        expect(page.locator(".toast-region")).to_contain_text("Your reports are kept")
        expect(page.get_by_text(citizen_email)).to_be_visible()
        expect(page.get_by_role("heading", name="(Stars)").first).to_be_visible()
        expect(page.get_by_text("How you earned them").first).to_be_visible()
    step("citizen signs up and keeps the reports made without an account", citizen_signup)

    def edit_profile():
        page.get_by_role("button", name="Edit profile").first.click()
        dlg = page.get_by_role("dialog")
        dlg.get_by_label("Bio").fill("Walks the Coselhas path at weekends.")
        dlg.get_by_role("radio", name="moss").click()
        pick_city(dlg, "Benevento")
        dlg.get_by_role("button", name="Save").click()
        expect(page.locator(".toast-region")).to_contain_text("Profile saved")
        expect(page.locator(".profile-bio").first).to_have_text("Walks the Coselhas path at weekends.")
        expect(page.locator(".profile-card").first).to_contain_text("Benevento")
    step("citizen edits name, bio, city and colour", edit_profile)

    def separate_signout():
        assert ctx.request.get(f"{BASE}/api/session").json()["org"], "expected the reviewer session from earlier steps"
        page.get_by_role("button", name="Sign out as citizen").click()
        page.get_by_role("dialog").get_by_role("button", name="Sign out", exact=True).click()
        expect(page.get_by_role("heading", name="(Organisation account)")).to_be_visible()
        s = ctx.request.get(f"{BASE}/api/session").json()
        assert s["citizen"] is None and s["org"], f"sign-out wasn't per role: {s}"
        page.goto(f"{BASE}/sign-in?next=/account")
        page.get_by_label("Email").fill(citizen_email)
        page.get_by_label("Password").fill("a-long-citizen-password")
        page.get_by_role("button", name="Sign in", exact=True).click()
        page.wait_for_url(f"{BASE}/account")
        expect(page.locator(".profile-bio").first).to_have_text("Walks the Coselhas path at weekends.")
    step("citizen and organisation sign out separately; citizen signs back in", separate_signout)

    def org_signup():
        op = b.new_context(viewport={"width": 1280, "height": 860}).new_page()
        op.goto(f"{BASE}/sign-up?role=org")
        op.get_by_label("Organisation name").fill("Ghent water lab (e2e)")
        pick_city(op, "Ghent")
        op.get_by_label("Your name").fill("Lien V.")
        op.get_by_label("Work email").fill(f"e2e.org.{int(time.time())}@example.org")
        op.get_by_label("Password").fill("a-long-org-password")
        op.get_by_role("button", name="Create organisation").click()
        op.wait_for_url(f"{BASE}/dashboard")
        expect(op.get_by_role("heading", name="Ghent water lab (e2e)")).to_be_visible()
        op.goto(f"{BASE}/account")
        card = op.locator(".profile-card").first
        expect(card).to_contain_text("Lien V.")
        expect(card).to_contain_text("Ghent water lab (e2e) · Ghent")
        expect(op.get_by_text("Your team sees reports, missions and the brief for Ghent only.")).to_be_visible()
        expect(op.get_by_role("heading", name="(Team)")).to_be_visible()
    step("organisation sign-up creates a Ghent organisation with you as admin", org_signup)

    def try_flow():
        g = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True).new_page()
        g.goto(f"{BASE}/", wait_until="domcontentloaded")
        g.locator('a[data-track-cta="header"], a[data-track-cta="mobile_menu"]').first.evaluate("a => a.click()")
        g.wait_for_url(f"{BASE}/start")
        expect(g.get_by_role("heading", name="Try StreamProof")).to_be_visible()
        g.locator("section", has_text="Report what you see").get_by_role("link", name="Sign in").click()
        g.wait_for_url(re.compile(r"/sign-in"))
        g.get_by_role("button", name="Use the demo citizen").click()
        g.wait_for_url(f"{BASE}/home")
        expect(g.get_by_role("heading", name="Hello, Maria S.")).to_be_visible()
        tabs = g.get_by_role("navigation", name="Sections").last
        assert [x.strip() for x in tabs.locator(".tab").all_inner_texts()] == ["Home", "Report", "Reports"]
        g.goto(f"{BASE}/start")
        g.wait_for_url(f"{BASE}/home")  # signed-in people skip the choice
    step("Try: choose citizen, sign in, land on the citizen dashboard", try_flow)

    def org_dashboard():
        o = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True).new_page()
        o.goto(f"{BASE}/start")
        o.locator("section", has_text="For municipalities").get_by_role("link", name="Sign in").click()
        o.get_by_role("button", name="Continue with the demo reviewer").click()
        o.wait_for_url(f"{BASE}/dashboard")
        expect(o.get_by_text("To review")).to_be_visible()
        tabs = o.get_by_role("navigation", name="Sections").last
        assert [x.strip() for x in tabs.locator(".tab").all_inner_texts()] == ["Dashboard", "Review", "Brief", "Standards"]
    step("organiser signs in and lands on the organisation dashboard", org_dashboard)

    def photo_sample():
        import io
        from PIL import Image
        buf = io.BytesIO()
        Image.effect_noise((320, 240), 60).convert("RGB").save(buf, "JPEG")
        return {"name": "stream.jpg", "mimeType": "image/jpeg", "buffer": buf.getvalue()}

    def camera_capture():  # a fake camera device stands in for a real one
        cb = p.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"])
        c = cb.new_context(viewport={"width": 390, "height": 844}, permissions=["camera"])
        pg = c.new_page()
        pg.goto(f"{BASE}/report")
        pg.get_by_label("What should we call you? (optional)").fill("Camera tester")
        pg.get_by_role("button", name="Start reporting").click()
        pg.get_by_role("button", name="Take a photo").click()
        expect(pg.locator("video.photo-video")).to_be_visible()
        pg.get_by_role("button", name="Capture").click()
        expect(pg.get_by_alt_text("Your photo")).to_be_visible()
        expect(pg.locator("video.photo-video")).to_have_count(0)
        pg.get_by_role("button", name="Remove").click()
        expect(pg.get_by_alt_text("Your photo")).to_have_count(0)
        cb.close()
    step("photo: take a picture with the camera in the page", camera_capture)

    def camera_missing():  # headless Chromium without a camera: say so, upload still works
        cb = p.chromium.launch()
        c = cb.new_context(viewport={"width": 390, "height": 844})
        pg = c.new_page()
        pg.goto(f"{BASE}/report")
        pg.get_by_label("What should we call you? (optional)").fill("Upload tester")
        pg.get_by_role("button", name="Start reporting").click()
        pg.get_by_role("button", name="Take a photo").click()  # no device: not found, or denied without a prompt
        expect(pg.get_by_text(re.compile("No camera was found on this device|Camera access was blocked"))).to_be_visible()
        expect(pg.get_by_role("button", name="Take a photo")).to_have_count(0)
        pg.locator("input[type=file]").set_input_files(photo_sample())
        expect(pg.get_by_alt_text("Your photo")).to_be_visible()
        cb.close()
    step("photo: no camera, so the upload takes over", camera_missing)

    print("console errors:", [e for e in errors if "favicon" not in e][:5])
    b.close()
print("ALL PASS" if ok else "SOME FAILED")
