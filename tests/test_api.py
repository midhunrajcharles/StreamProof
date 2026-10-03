"""The JSON API used by the web app: the demo story end to end, plus its privacy rules."""

import io
import json
from datetime import datetime

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import geo, seed
from app.main import app, store

HOTSPOT_KM = 2.55


def jpeg_with_exif(when: datetime) -> bytes:
    rng = np.random.default_rng(7)
    arr = (rng.random((900, 1200, 3)) * 255).astype("uint8")  # high-frequency = sharp
    img = Image.fromarray(arr)
    exif = Image.Exif()
    exif[0x0132] = when.strftime("%Y:%m:%d %H:%M:%S")  # DateTime
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes(), quality=90)
    return buf.getvalue()


def hotspot():
    s = geo.streams()[0]
    return geo.point_at(s, s.chainage[-1] - HOTSPOT_KM * 1000)


@pytest.fixture()
def client():
    from app import auth
    seed.run(store)
    auth.reset_limits()
    return TestClient(app)


def start(c, role):
    r = c.post("/api/session", data={"role": role})
    assert r.status_code == 200
    return r.json()


def submit(c, codes=("stagnant-water", "mosquitoes"), photo=True):
    lat, lon = hotspot()
    files = {"photo": ("p.jpg", jpeg_with_exif(datetime.now()), "image/jpeg")} if photo else {}
    data = {"lat": f"{lat:.6f}", "lon": f"{lon:.6f}", "accuracy": "7", "codes": list(codes),
            "description": "Still water by the bridge", "contact": "maria@example.com", "consent": "1"}
    r = c.post("/api/reports", data=data, files=files)
    assert r.status_code == 200, r.text
    return r.json()


def test_signin_required(client):
    r = client.get("/api/me")
    assert r.status_code == 401
    assert r.json()["detail"] == {"signin": "citizen"}
    assert client.get("/api/queue").json()["detail"] == {"signin": "org"}


def test_both_roles_in_one_session(client):
    start(client, "citizen")
    s = start(client, "org")
    assert s["citizen"]["id"] == seed.DEMO_CITIZEN[0]
    assert s["org"]["id"] == seed.DEMO_EXPERT


def test_full_story(client):
    c = client
    start(c, "citizen")
    r = submit(c)
    assert r["grade"] in "AB" and r["rung"]["value"] in ("assessed", "community-supported")
    assert len(r["reasons"]) == 7 and r["position"]["exact"] is False
    assert r["photo"]["url"] == f"/api/media/{r['id']}.jpg"
    assert any(x["id"] == r["id"] for x in c.get("/api/me").json()["reports"])

    start(c, "org")
    detail = c.get(f"/api/reports/{r['id']}").json()
    assert detail["position"]["exact"] is True and detail["org"]["can_decide"]
    assert not next(g for g in detail["org"]["gate"] if g["code"] == "fhir_exchange")["allowed"]

    # The gate refuses the export below Expert-verified, with its reason.
    blocked = c.get(f"/api/reports/{r['id']}/fhir")
    assert blocked.status_code == 403 and "Blocked by the permitted-use gate" in blocked.json()["detail"]

    after = c.post(f"/api/reports/{r['id']}/verify", data={"method": "field", "note": "seen"}).json()
    assert after["rung"]["level"] >= 4 and after["certificate"]
    bundle = c.get(f"/api/reports/{r['id']}/fhir")
    assert bundle.status_code == 200 and bundle.json()["resourceType"] == "Bundle"

    pdf = c.get(f"/api/reports/{r['id']}/certificate.pdf")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")


def test_citizen_sees_only_own_reports(client):
    start(client, "citizen")
    other = next(r for r in store.all() if r.observer != seed.DEMO_CITIZEN[0])
    assert client.get(f"/api/reports/{other.id}").status_code == 404


def test_verify_detects_tampering(client):
    rid = next(r.id for r in store.all() if store.certificate(r.id))
    ok = client.get(f"/api/verify/{rid}").json()
    assert ok["ok"] is True
    rec = dict(ok["record"], grade="A" if ok["record"]["grade"] != "A" else "B")
    bad = client.post(f"/api/verify/{rid}", data={"record_json": json.dumps(rec)}).json()
    assert bad["ok"] is False and "changed" in bad["message"]


def test_reject_needs_reason(client):
    start(client, "org")
    rid = client.get("/api/queue").json()["todo"][0]["id"]
    assert client.post(f"/api/reports/{rid}/reject", data={"reason": " "}).status_code == 400
    done = client.post(f"/api/reports/{rid}/reject", data={"reason": "Pollen, not scum."}).json()
    assert done["rung"]["value"] == "not-confirmed" and done["rejection"] == "Pollen, not scum."


def test_public_reference_data(client):
    m = client.get("/api/meta").json()
    assert len(m["signs"]) == 10 and m["rungs"][0]["value"] == "report"
    s = client.get("/api/standards").json()
    assert [row["rung"]["value"] for row in s["matrix"]][-1] == "decision-grade"
    start(client, "org")
    b = client.get("/api/brief").json()
    assert b["total"] == len(store.all()) and b["rows"]


def test_five_cities(client):
    m = client.get("/api/meta").json()
    assert [c["city"] for c in m["cities"]] == ["Coimbra", "Benevento", "Ghent", "Oslo", "Toulouse"]
    oslo = next(c for c in m["cities"] if c["city"] == "Oslo")
    start(client, "citizen")
    lat, lon = oslo["start"]
    r = client.post("/api/reports", data={"lat": str(lat), "lon": str(lon), "accuracy": "8", "codes": ["litter"], "consent": "1"}).json()
    assert r["place"] == "Akerselva, Oslo"
    weather = next(x for x in r["reasons"] if x["signal"] == "context")
    assert "No weather data" not in weather["text"]  # Oslo's own rainfall is used
    stream = next(x for x in r["reasons"] if x["signal"] == "stream")
    assert stream["status"] == "ok" and "Akerselva" in stream["text"]


def test_forget_me(client):
    start(client, "citizen")
    submit(client)
    assert client.post("/api/me/forget").json()["removed_from"] >= 1
    assert client.get("/api/me").status_code == 401


def test_photo_is_stripped_of_exif(client):
    start(client, "citizen")
    r = submit(client)
    img = client.get(r["photo"]["url"])
    assert img.status_code == 200 and not Image.open(io.BytesIO(img.content)).getexif()
    assert "maria@example.com" not in json.dumps(store.get(r["id"]).to_dict())


def test_report_without_photo_is_capped(client):
    start(client, "citizen")
    assert submit(client, codes=("litter",), photo=False)["grade"] in ("C", "D")


def test_bad_input_rejected(client):
    start(client, "citizen")
    lat, lon = hotspot()
    base = {"lat": str(lat), "lon": str(lon), "consent": "1"}
    assert client.post("/api/reports", data={**base, "codes": ["all-clear", "litter"]}).status_code == 400
    assert client.post("/api/reports", data={**base, "codes": ["not-a-code"]}).status_code == 400
    files = {"photo": ("x.jpg", b"not an image", "image/jpeg")}
    assert client.post("/api/reports", data={**base, "codes": ["litter"]}, files=files).status_code == 400


def test_mission_flow(client):
    start(client, "org")
    target = next(r for r in store.all() if r.rung.value == "community-supported")
    mid = client.post(f"/api/reports/{target.id}/mission").json()["org"]["mission"]["id"]
    start(client, "citizen")
    assert "Stay on public paths" in client.get(f"/api/missions/{mid}").json()["safety"]


def test_forget_keeps_signed_evidence(client):
    a = next(r for r in store.all() if r.rung.value in ("expert-verified", "decision-grade"))
    cert = store.certificate(a.id)
    store.forget_observer(a.observer)
    assert client.get(f"/api/verify/{a.id}").json()["ok"] is True
    assert "removed" in store.observer_display(a.observer)
    assert cert["sha256"] == store.certificate(a.id)["sha256"]


def test_old_server_pages_are_gone(client):
    r = client.get("/", follow_redirects=False)
    assert r.status_code in (302, 307) and r.headers["location"].endswith(":3200/")
    for path in ("/o", "/c", "/login", "/o/brief"):
        assert client.get(path, follow_redirects=False).status_code == 404
