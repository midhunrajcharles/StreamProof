"""Plan §17.3: the equity line (under-observed reaches), the engagement loop (updates), and calibration."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient

from app import auth, calibration, config, coverage, geo, seed
from app.main import app, store
from app.models import Report, Rung, now

STREAM = next(s for s in geo.streams() if s.id == "coselhas")
PHOTO = {"sha256": "ab" * 32, "width": 3000, "height": 4000, "sharpness": 200.0, "brightness": 120.0,
         "exif_time": None, "has_gps_exif": False}


def at_reach(i: int, obs: str, index: int, days_ago: float = 1.0) -> Report:
    reach = coverage.reaches(STREAM)[index]
    lat, lon = reach.mid
    return Report(f"EQ-{i}", obs, now() - timedelta(days=days_ago), ["litter"], lat, lon, 8.0, photo=dict(PHOTO))


# ---------- coverage ----------

def test_reaches_tile_the_stream_and_a_point_finds_its_reach():
    rs = coverage.reaches(STREAM)
    assert rs[0].start_m == 0 and abs(rs[-1].end_m - STREAM.chainage[-1]) < 1
    assert all(b.start_m == a.end_m for a, b in zip(rs, rs[1:]))
    for reach in rs:
        assert coverage.reach_of(*reach.mid) == reach.id, reach.label
    assert coverage.reach_of(41.0, -8.0) is None  # nowhere near a mapped stream


def test_status_none_thin_ok_by_people_not_reports_and_old_reports_dont_count():
    reports = [at_reach(1, "a", 3), at_reach(2, "a", 3),  # one person, twice: thin
               at_reach(3, "a", 5), at_reach(4, "b", 5),  # two people: ok
               at_reach(5, "c", 7, days_ago=config.COVERAGE_WINDOW_DAYS + 5)]  # too old: nobody lately
    cov = coverage.build([STREAM], reports, [])
    by = {x["id"]: x for x in coverage.build([STREAM], reports, [])["under"]}
    assert by["coselhas:3"]["status"] == "thin" and by["coselhas:3"]["reports"] == 2 and by["coselhas:3"]["people"] == 1
    assert "coselhas:5" not in by  # covered
    assert by["coselhas:7"]["status"] == "none"
    assert cov["covered"] + len(cov["under"]) == cov["total"] and cov["none"] + cov["thin"] == len(cov["under"])
    assert [x["status"] for x in cov["under"]] == sorted((x["status"] for x in cov["under"]), key=lambda s: s != "none")


def test_an_open_coverage_mission_is_shown_on_its_reach_and_a_mission_for_a_report_is_not():
    reach = coverage.reaches(STREAM)[2]
    m = coverage.mission_for(reach, "exp-1", "M-90")
    other = coverage.mission_for(coverage.reaches(STREAM)[9], "exp-1", "M-91")
    other.kind = "evidence"  # an ordinary evidence mission must not mark the reach as handled
    cov = coverage.build([STREAM], [], [m, other])
    by = {x["id"]: x for x in cov["under"]}
    assert by[reach.id]["mission"] == "M-90" and by["coselhas:9"]["mission"] is None
    assert m.kind == "coverage" and m.report_id == "" and m.indicators == []


@pytest.fixture()
def client():
    seed.run(store)
    auth.reset_limits()
    return TestClient(app)


def org(c):
    assert c.post("/api/session", data={"role": "org"}).status_code == 200


def test_brief_lists_under_observed_reaches_and_a_mission_can_be_sent(client):
    assert client.post("/api/coverage/mission", data={"reach": "coselhas:3"}).status_code == 401
    org(client)
    cov = client.get("/api/brief").json()["coverage"]
    assert cov["total"] >= 10 and cov["under"] and cov["covered"] + len(cov["under"]) == cov["total"]
    target = next(x for x in cov["under"] if not x["mission"])
    m = client.post("/api/coverage/mission", data={"reach": target["id"]})
    assert m.status_code == 200 and m.json()["kind"] == "coverage" and m.json()["signs"] == []
    assert "counts the same" in m.json()["request"]
    again = client.post("/api/coverage/mission", data={"reach": target["id"]})
    assert again.status_code == 400 and "already open" in again.json()["detail"]
    assert client.post("/api/coverage/mission", data={"reach": "nowhere:1"}).status_code == 400
    after = client.get("/api/brief").json()["coverage"]["under"]
    assert next(x for x in after if x["id"] == target["id"])["mission"] == m.json()["id"]
    client.post("/api/session", data={"role": "citizen"})  # citizens see it among the open missions
    assert any(x["id"] == m.json()["id"] and x["kind"] == "coverage" for x in client.get("/api/me").json()["missions"])


# ---------- engagement: what changed ----------

def test_updates_tell_a_citizen_what_changed_without_naming_anyone(client):
    client.post("/api/session", data={"role": "citizen"})
    me = client.get("/api/me").json()
    kinds = {u["kind"] for u in me["updates"]}
    assert "verified" in kinds  # the demo citizen's two reports were confirmed
    assert all(set(u) == {"report_id", "at", "kind", "text", "signs"} for u in me["updates"])
    blob = str(me["updates"])
    assert seed.DEMO_EXPERT not in blob and "Assessed:" not in blob and "Report submitted" not in blob
    assert me["updates"] == sorted(me["updates"], key=lambda u: u["at"], reverse=True)


def test_strengthen_lists_hints_only_for_reports_still_open(client):
    client.post("/api/session", data={"role": "citizen"})
    for item in client.get("/api/me").json()["strengthen"]:
        r = store.get(item["report_id"])
        assert r.rung in (Rung.ASSESSED, Rung.COMMUNITY) and item["hint"] == r.hint


# ---------- calibration ----------

def decided(i: int, grade: str, confirmed: bool) -> Report:
    r = Report(f"CAL-{i}", "o", now(), ["litter"], 40.2, -8.4, 8.0)
    r.grade, r.rung = grade, (Rung.EXPERT if confirmed else Rung.NOT_CONFIRMED)
    return r


def test_confusion_counts_decided_reports_and_hides_rates_until_there_are_enough():
    few = [decided(1, "A", True), decided(2, "A", True), decided(3, "C", False)]
    c = calibration.confusion(few + [Report("X", "o", now(), ["litter"], 40.2, -8.4, 8.0)])  # undecided is ignored
    assert (c["decided"], c["confirmed"], c["not_confirmed"], c["enough"]) == (3, 2, 1, False)
    assert all(row["share_confirmed"] is None for row in c["rows"]) and "not the grade's accuracy" in c["note"]
    many = [decided(i, "A", True) for i in range(20)] + [decided(100 + i, "C", i < 3) for i in range(10)]
    c = calibration.confusion(many)
    by = {row["grade"]: row for row in c["rows"]}
    assert c["enough"] and by["A"]["share_confirmed"] == 1.0 and by["C"]["share_confirmed"] == 0.3
    assert by["B"]["decided"] == 0 and by["B"]["share_confirmed"] is None and c["note"] is None


def test_behaviour_table_states_what_the_rules_do():
    sc = {s["name"]: s for s in calibration.scenarios()}
    first = sc["First report: clear photo, good GPS, on the stream"]
    assert first["grade"] == "B" and first["score"] == 81  # a lone newcomer tops out at B
    assert sc["... and one other person reported the same nearby"]["grade"] == "A"
    assert sc["No photo, two neighbours agree"]["grade"] == "C"
    assert sc["Worst case: no photo, no GPS accuracy, off stream, 0 of 4 confirmed"]["grade"] == "D"
    contra = sc["A nearby all-clear within 48 h contradicts it"]
    assert first["score"] - contra["score"] == 3  # the weakness the report discloses: a contradiction costs 3 points
    assert all(s["grade"] in "ABCD" and sum(s["points"].values()) == s["score"] for s in sc.values())


def test_standards_serves_calibration_with_its_limits(client):
    c = client.get("/api/standards").json()["calibration"]
    assert c["confusion"]["decided"] > 0 and len(c["scenarios"]) == 11 and len(c["limits"]) >= 3
    assert [b["grade"] for b in c["bands"]] == ["A", "B", "C", "D"]
