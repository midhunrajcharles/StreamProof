"""The video's demo data (app/seed_video.py) must make the scripted moment real (docs/VIDEO-SCRIPT.md)."""

import pytest

from app import brief, dipteracast, geo, seed_video, service, signing
from app.main import store
from app.models import Rung, now
from app.seed import DEMO_CITIZEN, DEMO_EXPERT

PHOTO = {"sha256": "ab" * 32, "width": 3024, "height": 4032, "sharpness": 180.0, "brightness": 120.0,
         "exif_time": None, "has_gps_exif": True}


@pytest.fixture(scope="module")
def s():
    return seed_video.run(store)


def coimbra(st):
    return [x for x in geo.streams() if x.city == "Coimbra"]


def test_every_city_is_lived_in_and_nothing_was_written_around_the_engine(s):
    reports = s.all()
    assert len(reports) > 120
    for c in seed_video.CITIES.values():
        mine = [r for r in reports if (sn := geo.snap(r.lat, r.lon)) and sn.stream.id == c["stream"]]
        assert len(mine) >= 15
    assert all(len(r.reasons) == 7 and r.grade for r in reports)  # every report went through the grader
    for r in reports:
        if r.rung in (Rung.EXPERT, Rung.DECISION):
            cert = s.certificate(r.id)
            assert cert and signing.verify(cert["record"], cert["sha256"], cert["signature"], cert["public_key"])[0]
            assert cert["record"]["verified_on"] == r.verification["at"][:10]  # signed with the backdated date


def test_the_scripted_moment_happens_for_real(s):
    co = next(x for x in geo.streams() if x.id == "coselhas")
    lat, lon = geo.point_at(co, co.chainage[-1] - 2550)  # by the footbridge
    before = brief.build(s.all(), s.missions(), streams=coimbra(s))
    assert not any("Coselhas" in a["place"] for a in before["advisories"])
    r = service.submit(s, DEMO_CITIZEN[0], ["stagnant-water", "mosquitoes"], lat, lon, 7,
                       photo_metrics={**PHOTO, "exif_time": now().replace(tzinfo=None).isoformat(timespec="seconds")})
    assert r.grade == "A" and r.rung == Rung.COMMUNITY and len(r.supporters) == 2
    v = service.verify(s, r.id, DEMO_EXPERT, "field", "Larvae in the dip sample")
    assert v.rung == Rung.DECISION
    after = brief.build(s.all(), s.missions(), streams=coimbra(s))
    assert any("Coselhas" in a["place"] for a in after["advisories"])


def test_brief_and_exports_have_what_the_script_shows(s):
    cov = brief.build(s.all(), s.missions(), streams=coimbra(s))["coverage"]
    assert cov["none"] >= 2
    d = dipteracast.export(s.all())["summary"]
    assert d["present"] >= 5 and d["not_seen"] >= 5
    assert s.citizen_account(DEMO_CITIZEN[0])["city"] == "Coimbra"
    assert all(s.user(email) for email in ("reviewer@coimbra-pilot.demo", "reviewer@oslo-pilot.demo", "coordinator@toulouse-pilot.demo"))
