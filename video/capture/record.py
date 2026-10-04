"""Record the real StreamProof app for the video, on the video dataset (app/seed_video.py).

    python video/capture/record.py [shots...]      # default: all shots

Starts an isolated API (:8741, its own data folder) and a production web build (:3301), then drives Chromium
with Playwright. Frames come from Chrome's own screencast (JPEG quality 92, real device pixels), not a screen
grabber, and are re-timed to a constant 30 fps MP4. Every click is logged (position, time) so the video can draw
its own cursor, trails and ripples on top. The in-page camera is fed from the Blender clip (video/out/camera.mjpeg).

Output: video/remotion/public/footage/<shot>.mp4 + <shot>.json, and the exported FHIR Bundle for scene 6.
"""

import base64
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
OUT = ROOT / "video" / "remotion" / "public" / "footage"
DATA_OUT = ROOT / "video" / "remotion" / "src" / "data"
APPDATA = ROOT / "video" / "out" / "appdata"
FRAMES = ROOT / "video" / "out" / "frames"
CAMERA_SRC = ROOT / "video" / "out" / "camera.mjpeg"
CAMERA = Path(os.environ.get("TEMP", "C:/Temp")) / "sp-camera.mjpeg"  # Chrome needs a path without spaces
API, BASE = "http://127.0.0.1:8741", "http://localhost:3301"
PHONE_DPR, DESK_DPR = "--force-device-scale-factor=2", "--force-device-scale-factor=1.3334"  # the screencast only gives real pixels with these
HOTSPOT = (0.0, 0.0)  # set at start-up: the exact point on the Ribeira de Coselhas line 2.55 km above the Mondego


# ---------------------------------------------------------------- servers
def wait_http(url: str, secs: int = 240) -> None:
    t0 = time.time()
    while time.time() - t0 < secs:
        try:
            urllib.request.urlopen(url, timeout=3)
            return
        except Exception:  # noqa: BLE001
            time.sleep(1.5)
    raise SystemExit(f"{url} did not come up")


class Servers:
    def __enter__(self):
        env = {**os.environ, "STREAMPROOF_DATA": str(APPDATA), "STREAMPROOF_NETWORK": "0", "PYTHONIOENCODING": "utf-8"}
        shutil.rmtree(APPDATA, ignore_errors=True)
        subprocess.run([sys.executable, "-m", "app.seed_video"], cwd=ROOT, env=env, check=True)
        self.api = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8741"], cwd=ROOT, env=env,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        wenv = {**os.environ, "STREAMPROOF_API": API, "NEXT_DIST_DIR": ".next-e2e"}
        if "--no-build" not in sys.argv:
            subprocess.run("npx next build", cwd=WEB, env=wenv, shell=True, check=True, stdout=subprocess.DEVNULL)
        self.web = subprocess.Popen("npx next start -p 3301", cwd=WEB, env=wenv, shell=True,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        wait_http(f"{API}/api/meta")
        wait_http(f"{BASE}/start")
        return self

    def __exit__(self, *exc):
        for p in (self.api, self.web):
            subprocess.run(f"taskkill /F /T /PID {p.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# ---------------------------------------------------------------- recorder
class Recorder:
    """Chrome screencast frames + a log of clicks, re-timed to constant 30 fps."""

    def __init__(self, page, name: str, max_w: int, max_h: int):
        self.page, self.name, self.max_w, self.max_h = page, name, max_w, max_h
        self.dir = FRAMES / name
        shutil.rmtree(self.dir, ignore_errors=True)
        self.dir.mkdir(parents=True)
        self.frames, self.events, self.t0 = [], [], None
        self.cdp = page.context.new_cdp_session(page)
        self.cdp.on("Page.screencastFrame", self._frame)

    def _frame(self, ev):
        ts = ev["metadata"]["timestamp"]
        if self.t0 is None:
            self.t0 = ts
            self.first_wall = time.time() - self.wall0  # video time 0 = this moment
        f = self.dir / f"{len(self.frames):05d}.jpg"
        f.write_bytes(base64.b64decode(ev["data"]))
        self.frames.append((ts - self.t0, f))
        try:
            self.cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:  # noqa: BLE001
            pass

    def start(self):
        self.wall0 = time.time()
        self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": self.max_w, "maxHeight": self.max_h, "everyNthFrame": 1})
        self.page.wait_for_timeout(600)

    def now(self) -> float:
        return time.time() - self.wall0

    def mark(self, label: str, **kw):
        self.events.append({"t": round(self.now(), 3), "label": label, **kw})

    def click(self, locator, label: str, pause_before: int = 450, pause_after: int = 700):
        locator.scroll_into_view_if_needed()
        box = locator.bounding_box()
        x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
        self.page.mouse.move(x, y, steps=12)
        self.page.wait_for_timeout(pause_before)
        self.mark(label, x=round(x, 1), y=round(y, 1), click=True)
        locator.click()
        self.page.wait_for_timeout(pause_after)

    def stop(self) -> Path:
        self.page.wait_for_timeout(500)
        end_t = self.now() - self.first_wall  # video time when recording stops (a still page sends no frames)
        self.cdp.send("Page.stopScreencast")
        self.page.wait_for_timeout(300)
        lst = self.dir / "list.txt"
        lines = []
        for i, (t, f) in enumerate(self.frames):
            nxt = self.frames[i + 1][0] if i + 1 < len(self.frames) else max(t + 1 / 30, end_t)
            lines += [f"file '{f.name}'", f"duration {max(0.001, nxt - t):.4f}"]
        lines.append(f"file '{self.frames[-1][1].name}'")
        lst.write_text("\n".join(lines), encoding="utf-8")
        OUT.mkdir(parents=True, exist_ok=True)
        mp4 = OUT / f"{self.name}.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-vsync", "cfr", "-r", "30",
                        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", str(mp4)],
                       check=True)
        vp = self.page.viewport_size
        shot = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height:format=duration",
                                          "-of", "json", str(mp4)], capture_output=True, text=True).stdout)
        w, h = shot["streams"][0]["width"], shot["streams"][0]["height"]
        meta = {"width": w, "height": h, "duration": float(shot["format"]["duration"]), "css": vp, "scale": w / vp["width"],
                "video_offset": round(self.first_wall, 3),
                "events": [{**e, "vt": round(e["t"] - self.first_wall, 3)} for e in self.events]}
        (OUT / f"{self.name}.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
        print(f"{self.name}: {len(self.frames)} frames, {meta['duration']:.1f} s, {w}x{h}, {len(self.events)} events")
        return mp4


# ---------------------------------------------------------------- shots
def phone_context(browser, lang="en"):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                              permissions=["camera", "geolocation"], geolocation={"latitude": HOTSPOT[0], "longitude": HOTSPOT[1], "accuracy": 7},
                              locale="pt-PT" if lang == "pt" else "en-GB")
    ctx.add_init_script(f"try {{ localStorage.setItem('sp-lang', '{lang}') }} catch (e) {{}}")
    return ctx


def desktop_context(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.3334, locale="en-GB")
    ctx.add_init_script("try { localStorage.setItem('sp-lang', 'en') } catch (e) {}")
    return ctx


def shot_citizen(p) -> str:
    """Scene 4: Maria switches to Portuguese, reports with the in-page camera, and gets her grade."""
    b = p.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
                                f"--use-file-for-fake-video-capture={CAMERA}", PHONE_DPR])
    ctx = phone_context(b, "en")
    ctx.request.post(f"{BASE}/api/session", form={"role": "citizen"})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/home", wait_until="networkidle")
    pg.wait_for_timeout(800)
    r = Recorder(pg, "citizen", 780, 1688)
    r.start()
    r.mark("home")
    pg.wait_for_timeout(1200)
    r.click(pg.get_by_role("button", name=re.compile("^Language")), "language")
    r.click(pg.get_by_role("radio", name="Português"), "portugues", pause_after=1400)
    r.click(pg.get_by_role("link", name=re.compile("^Reportar")).first, "reportar", pause_after=1600)
    r.click(pg.get_by_role("button", name=re.compile("Tirar|foto", re.I)).first, "camera", pause_after=200)
    expect(pg.locator("video.photo-video")).to_be_visible()
    r.mark("camera-live")
    pg.wait_for_timeout(3200)
    r.click(pg.get_by_role("button", name=re.compile("Capturar")), "capture", pause_after=1300)
    r.mark("captured")
    pg.wait_for_timeout(1200)  # the live video is swapped for the still: let the layout settle before the next tap
    r.click(pg.get_by_role("button", name="Água parada"), "chip-stagnant", pause_after=500)
    r.click(pg.get_by_role("button", name="Muitos mosquitos"), "chip-mosquitoes", pause_after=700)
    use = pg.get_by_role("button", name=re.compile("^(Usar a minha localização|Use my location)"))  # not the map pin, which is "Report location"
    for _ in range(3):  # the location must come from GPS (±7 m), not from a stray tap on the map
        r.click(use, "locate", pause_after=1400)
        if pg.get_by_text(re.compile(r"\(±7 m\)")).count():
            break
    r.mark("located")
    notes = pg.locator("#desc")
    notes.scroll_into_view_if_needed()
    r.mark("type-notes")
    notes.type("Água parada no braço lateral, muitos mosquitos ao fim da tarde.", delay=28)
    pg.wait_for_timeout(500)
    r.click(pg.get_by_role("button", name=re.compile("^Enviar relato")), "submit", pause_after=200)
    pg.wait_for_url(re.compile(r"/reports/SP-\d+"), timeout=20000)
    rid = re.search(r"SP-\d+", pg.url).group(0)
    r.mark("card", rid=rid)
    pg.wait_for_timeout(2600)
    pg.mouse.wheel(0, 700)
    r.mark("reasons")
    pg.wait_for_timeout(2800)
    pg.mouse.wheel(0, 700)
    r.mark("nearby")
    pg.wait_for_timeout(4200)
    r.stop()
    b.close()
    return rid


def shot_reviewer(p, rid: str) -> None:
    """Scene 5: nearby evidence, a mission upstream, the refused export, verify, then the brief's advisory."""
    b = p.chromium.launch(args=[DESK_DPR])
    ctx = desktop_context(b)
    ctx.request.post(f"{BASE}/api/session", form={"role": "org"})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/review/{rid}", wait_until="networkidle")
    pg.wait_for_timeout(900)
    r = Recorder(pg, "reviewer", 1920, 1200)
    r.start()
    r.mark("detail")
    pg.wait_for_timeout(1500)
    near = pg.get_by_role("heading", name=re.compile("Nearby evidence"))
    near.scroll_into_view_if_needed()
    r.mark("nearby")
    pg.wait_for_timeout(1800)
    mission = pg.get_by_role("button", name=re.compile("mission|more evidence", re.I)).first
    if mission.count():
        r.click(mission, "mission", pause_after=1600)
    r.click(pg.get_by_role("button", name="Export FHIR R4 bundle"), "export", pause_after=300)
    expect(pg.get_by_text("Export refused by the gate")).to_be_visible()
    r.mark("refused")
    pg.wait_for_timeout(2200)
    r.click(pg.get_by_role("button", name="Verify…"), "verify-open", pause_after=700)
    dlg = pg.get_by_role("dialog")
    r.click(dlg.get_by_role("radio", name="Field check"), "field", pause_after=400)
    note = dlg.get_by_label("Note for the record (optional)")
    note.click()
    note.type("Larvae in the dip sample", delay=35)
    r.click(dlg.get_by_role("button", name="Verify", exact=True), "verify", pause_after=300)
    expect(pg.locator(".toast-region")).to_contain_text("Signed record issued")
    r.mark("verified")
    pg.wait_for_timeout(2600)
    r.click(pg.get_by_role("link", name=re.compile("^Brief$|River Health Brief")).first, "brief", pause_after=300)
    adv = pg.get_by_text(re.compile("may warrant inspection")).first
    expect(adv).to_be_visible(timeout=20000)  # the brief loads its data after the page: wait for the real content
    pg.wait_for_timeout(900)
    adv.scroll_into_view_if_needed()
    r.mark("advisory")
    pg.wait_for_timeout(3500)
    r.stop()
    # the record that leaves the system, for scene 6
    bundle = ctx.request.get(f"{BASE}/api/reports/{rid}/fhir").json()
    (DATA_OUT / "maria-bundle.json").write_text(json.dumps(bundle, indent=1, ensure_ascii=False), encoding="utf-8")
    b.close()


def shot_city(p) -> None:
    """Scene 7: Catalogue measures, under-observed stretches (send a mission), DipteraCAST ground truth."""
    b = p.chromium.launch(args=[DESK_DPR])
    ctx = desktop_context(b)
    ctx.request.post(f"{BASE}/api/session", form={"role": "org"})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/brief", wait_until="networkidle")
    expect(pg.get_by_text("Sewer system and point-source improvements").first).to_be_visible(timeout=20000)
    pg.wait_for_timeout(800)
    r = Recorder(pg, "city", 1920, 1200)
    r.start()
    steps = pg.get_by_role("heading", name="Suggested next steps")
    steps.scroll_into_view_if_needed()
    pg.mouse.wheel(0, 180)
    r.mark("measures")
    pg.wait_for_timeout(3800)
    cov = pg.get_by_role("heading", name="Under-observed stretches")
    cov.scroll_into_view_if_needed()
    pg.mouse.wheel(0, -60)
    r.mark("coverage")
    pg.wait_for_timeout(1500)
    r.click(pg.get_by_role("button", name=re.compile("Ask residents to check")).first, "ask", pause_after=1800)
    r.mark("mission-open")
    pg.goto(f"{BASE}/dashboard", wait_until="networkidle")
    expect(pg.get_by_text("Download CSV")).to_be_visible(timeout=20000)
    pg.wait_for_timeout(700)
    gt = pg.get_by_role("heading", name="Ground truth for DipteraCAST")
    gt.evaluate("e => e.scrollIntoView({block: 'start'})")  # card at the top, table and CSV button in view
    pg.mouse.wheel(0, -40)
    pg.wait_for_timeout(400)
    r.mark("groundtruth")
    pg.wait_for_timeout(2600)
    r.stop()
    brief = ctx.request.get(f"{BASE}/api/brief").json()
    (DATA_OUT / "coverage.json").write_text(json.dumps(brief["coverage"], indent=1, ensure_ascii=False), encoding="utf-8")
    csv = ctx.request.get(f"{BASE}/api/export/diptera-ground-truth?format=csv").text()
    (DATA_OUT / "groundtruth.csv").write_text(csv, encoding="utf-8")
    import csv as _csv
    rows = list(_csv.reader(io.StringIO(csv)))
    (DATA_OUT / "groundtruth.json").write_text(json.dumps({"header": rows[0], "rows": rows[1:]}, ensure_ascii=False), encoding="utf-8")
    b.close()


def shot_people(p, rid: str) -> None:
    """Scene 8: Maria's signed record, and the tamper check failing when one value changes."""
    b = p.chromium.launch(args=[PHONE_DPR])
    ctx = phone_context(b, "en")
    pg = ctx.new_page()
    pg.goto(f"{BASE}/verify/{rid}", wait_until="networkidle")
    pg.wait_for_timeout(800)
    r = Recorder(pg, "people", 780, 1688)
    r.start()
    r.mark("valid")
    pg.wait_for_timeout(2200)
    box = pg.get_by_label("Record JSON")
    box.scroll_into_view_if_needed()
    text = box.input_value()
    r.mark("edit")
    box.fill(text.replace('"grade": "A"', '"grade": "B"') if '"grade": "A"' in text else text.replace('"grade": "', '"grade": "X'))
    pg.wait_for_timeout(700)
    r.click(pg.get_by_role("button", name="Check this version"), "check", pause_after=300)
    expect(pg.get_by_role("heading", name="Doesn't match")).to_be_visible()
    pg.get_by_role("heading", name="Doesn't match").scroll_into_view_if_needed()
    r.mark("mismatch")
    pg.wait_for_timeout(2600)
    r.stop()
    b.close()


def hotspot() -> tuple[float, float]:
    sys.path.insert(0, str(ROOT))
    from app import geo
    co = next(x for x in geo.streams() if x.id == "coselhas")
    return geo.point_at(co, co.chainage[-1] - 2550)


if __name__ == "__main__":
    HOTSPOT = hotspot()
    print("hotspot", HOTSPOT)
    want = [a for a in sys.argv[1:] if not a.startswith("--")] or ["citizen", "reviewer", "city", "people"]
    if not CAMERA_SRC.exists():
        raise SystemExit(f"camera feed missing: {CAMERA_SRC} (run video/blender/finish.py)")
    shutil.copyfile(CAMERA_SRC, CAMERA)
    with Servers(), sync_playwright() as p:
        rid = shot_citizen(p) if "citizen" in want else os.environ.get("RID", "SP-1138")
        print("Maria's report:", rid)
        if "reviewer" in want:
            shot_reviewer(p, rid)
        if "city" in want:
            shot_city(p)
        if "people" in want:
            shot_people(p, rid)
