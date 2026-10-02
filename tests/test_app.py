"""The demo story, end to end through the HTTP routes."""

import io
import json
import re
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


@pytest.fixture()
def client():
    seed.run(store)
    return TestClient(app)


def login(c, role):
    r = c.post("/login", data={"role": role}, follow_redirects=False)
    assert r.status_code == 303


def hotspot():
    s = geo.streams()[0]
    return geo.point_at(s, s.chainage[-1] - HOTSPOT_KM * 1000)


def submit(c, codes=("stagnant-water", "mosquitoes"), photo=True):
    lat, lon = hotspot()
    files = {"photo": ("p.jpg", jpeg_with_exif(datetime.now()), "image/jpeg")} if photo else {}
    data = {"lat": f"{lat:.6f}", "lon": f"{lon:.6f}", "accuracy": "7", "codes": list(codes),
            "description": "Still water by the bridge", "contact": "maria@example.com"}
    r = c.post("/c/report", data=data, files=files, follow_redirects=False)
    assert r.status_code == 303, r.text
    return r.headers["location"].split("/")[-1].split("?")[0]


def test_full_story(client):
    c = client
    login(c, "citizen")
    rid = submit(c)
    card = c.get(f"/c/r/{rid}").text
    assert "Evidence grade A" in card or "Evidence grade B" in card
    assert "other people reported the same" in card  # nearby agreement visible
    rep = store.get(rid)
    assert rep.rung.value == "community-supported"
    assert rep.photo_file and "maria@example.com" not in json.dumps(rep.to_dict())

    # Uploaded photo was stripped of EXIF before storage.
    login(c, "org")
    img = c.get(f"/media/{rep.photo_file}")
    assert img.status_code == 200 and not Image.open(io.BytesIO(img.content)).getexif()

    # Gate: FHIR export is blocked before expert verification.
    r = c.get(f"/o/r/{rid}/fhir", follow_redirects=False)
    assert r.status_code == 303 and "Blocked" in r.headers["location"]

    # Expert verifies -> two independent expert-verified reports -> decision-grade + advisory.
    c.post(f"/o/r/{rid}/verify", data={"method": "remote", "note": "Clear photo"})
    assert store.get(rid).rung.value == "decision-grade"
    brief = c.get("/o/brief").text
    assert "ADVISORY" in brief and "not a diagnosis" in brief

    # FHIR bundle now allowed and pseudonymous.
    b = c.get(f"/o/r/{rid}/fhir").json()
    kinds = [e["resource"]["resourceType"] for e in b["entry"]]
    assert "Patient" not in kinds and kinds.count("Observation") == 2
    dumped = json.dumps(b)
    assert "maria" not in dumped.lower() and f"{rep.lat:.6f}" not in dumped
    uses = {cmp["valueCodeableConcept"]["coding"][0]["code"] for cmp in b["entry"][4]["resource"]["component"]
            if cmp["code"]["coding"][0]["code"] == "permitted-use"}
    assert "advisory_flag" in uses

    # Citizen gets a certificate, and the signature check catches tampering.
    login(c, "citizen")
    pdf = c.get(f"/c/r/{rid}/certificate.pdf")
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    assert "Valid" in c.get(f"/verify/{rid}").text
    record = store.certificate(rid)["record"]
    tampered = json.dumps(dict(record, grade="A" if record["grade"] != "A" else "B"))
    assert "has changed" in c.post(f"/verify/{rid}", data={"record_json": tampered}).text

    # Public share card: no name, contact or exact position.
    share = c.get(f"/share/{rid}").text
    assert "Maria" not in share and "maria@" not in share and f"{rep.lat:.5f}" not in share


def test_citizen_cannot_open_org_portal(client):
    login(client, "citizen")
    r = client.get("/o", follow_redirects=False)
    assert r.status_code == 303 and "/login" in r.headers["location"]


def test_citizen_cannot_read_others_reports(client):
    login(client, "citizen")
    other = next(r for r in store.all() if r.observer != seed.DEMO_CITIZEN[0])
    assert client.get(f"/c/r/{other.id}").status_code == 404


def test_report_without_photo_is_capped(client):
    login(client, "citizen")
    rid = submit(client, codes=("litter",), photo=False)
    assert store.get(rid).grade in ("C", "D")


def test_bad_input_rejected(client):
    login(client, "citizen")
    lat, lon = hotspot()
    r = client.post("/c/report", data={"lat": lat, "lon": lon, "codes": ["all-clear", "litter"]})
    assert r.status_code == 400
    r = client.post("/c/report", data={"lat": lat, "lon": lon, "codes": ["not-a-code"]})
    assert r.status_code == 400
    files = {"photo": ("x.jpg", b"not an image", "image/jpeg")}
    r = client.post("/c/report", data={"lat": lat, "lon": lon, "codes": ["litter"]}, files=files)
    assert r.status_code == 400


def test_mission_flow(client):
    login(client, "org")
    target = next(r for r in store.all() if r.rung.value == "community-supported")
    client.post(f"/o/r/{target.id}/mission")
    m = next(m for m in store.missions() if m.report_id == target.id)
    login(client, "citizen")
    page = client.get(f"/c/missions/{m.id}").text
    assert "Stay on public paths" in page


def test_forget_keeps_signed_evidence(client):
    login(client, "org")
    a = next(r for r in store.all() if r.rung.value in ("expert-verified", "decision-grade"))
    cert = store.certificate(a.id)
    store.forget_observer(a.observer)
    assert client.get(f"/verify/{a.id}").status_code == 200
    assert "Valid" in client.get(f"/verify/{a.id}").text
    assert re.search(r"removed", store.observer_display(a.observer))
    assert cert["sha256"] == store.certificate(a.id)["sha256"]
