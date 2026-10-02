from datetime import datetime, timedelta, timezone

import pytest

from app import config, evidence, fhir, geo, grading, permitted_use, signing
from app.models import Report, Rung

T0 = datetime(2026, 10, 2, 9, 0, tzinfo=timezone.utc)
ON_STREAM = (40.22267, -8.42745)  # on Ribeira de Coselhas
GOOD_PHOTO = {"sha256": "ab" * 32, "width": 3000, "height": 4000, "sharpness": 200.0,
              "brightness": 120.0, "exif_time": "2026-10-02T10:00:00", "has_gps_exif": True}


def rep(i, obs, codes=("stagnant-water",), dt=0, dlat=0.0, photo=GOOD_PHOTO, acc=8.0):
    return Report(f"SP-{i}", obs, T0 + timedelta(hours=dt), list(codes),
                  ON_STREAM[0] + dlat, ON_STREAM[1], acc, photo=dict(photo) if photo else None)


# ---------- geometry ----------

def test_snap_on_stream_and_upstream_walk():
    s = geo.snap(*ON_STREAM)
    assert s and s.stream.name == "Ribeira de Coselhas" and s.distance_m < 30
    lat, lon, walked = geo.upstream_point(*ON_STREAM, 400)
    assert 390 <= walked <= 400
    assert geo.snap(lat, lon).chainage_m < s.chainage_m  # moved toward the source


def test_coarsen_is_about_100m():
    lat, lon = geo.coarsen(40.222674, -8.427451)
    assert geo.distance_m(40.222674, -8.427451, lat, lon) < 100


# ---------- grading ----------

def test_first_good_report_grades_b_with_reasons():
    r = grading.grade(rep(1, "a"), [])
    assert r.rung == Rung.ASSESSED
    assert r.grade == "B", (r.score, r.reasons)
    assert {x.signal for x in r.reasons} == {"photo", "photo_time", "location", "stream", "nearby", "context",
                                              "track_record"}
    assert all(x.text for x in r.reasons)
    assert r.hint and "upstream" in r.hint


def test_no_photo_capped_at_c():
    r = grading.grade(rep(1, "a", photo=None), [rep(2, "b", dt=-3), rep(3, "c", dt=-5)])
    assert r.grade in ("C", "D")
    assert any(x.signal == "photo" and x.status == "fail" for x in r.reasons)


def test_blurry_photo_warns():
    bad = dict(GOOD_PHOTO, sharpness=10.0)
    r = grading.grade(rep(1, "a", photo=bad), [])
    assert any(x.signal == "photo" and x.status == "warn" and "blurry" in x.text for x in r.reasons)


def test_old_photo_fails_time_check():
    old = dict(GOOD_PHOTO, exif_time="2026-09-01T10:00:00")
    r = grading.grade(rep(1, "a", photo=old), [])
    assert any(x.signal == "photo_time" and x.status == "fail" for x in r.reasons)


def test_nearby_agreement_raises_grade():
    a = grading.grade(rep(1, "a"), [])
    b = grading.grade(rep(2, "b", dt=4, dlat=0.0005), [a])
    assert b.score > a.score


def test_safety_notice_for_dead_fish():
    r = grading.grade(rep(1, "a", codes=("dead-fish",)), [])
    assert r.safety and "112" in r.safety


def test_all_clear_is_graded_like_any_report():
    r = grading.grade(rep(1, "a", codes=("all-clear",)), [])
    assert r.grade in ("A", "B")


# ---------- evidence graph ----------

def test_independent_corroboration_makes_community_supported():
    a = grading.grade(rep(1, "a"), [])
    b = grading.grade(rep(2, "b", dt=2, dlat=0.001), [a])
    assert evidence.link_corroboration(b, [a]) == ["SP-1"]
    assert a.rung == b.rung == Rung.COMMUNITY


def test_same_observer_cannot_corroborate_self():
    a = grading.grade(rep(1, "a"), [])
    b = grading.grade(rep(2, "a", dt=2), [a])
    assert evidence.link_corroboration(b, [a]) == []
    assert a.rung == Rung.ASSESSED


def test_same_spot_same_minute_is_not_independent():
    a = grading.grade(rep(1, "a"), [])
    b = grading.grade(rep(2, "b", dt=0.1), [a])  # 6 minutes later, same spot
    assert evidence.link_corroboration(b, [a]) == []


def test_corroboration_cap_per_account_per_day():
    olds = [grading.grade(rep(i, f"o{i}", dlat=0.0004 * i), []) for i in range(1, 6)]
    linked_total = 0
    pool = list(olds)
    for k in range(5):
        n = grading.grade(rep(100 + k, "spammer", dt=1 + k, dlat=0.0004 * (k + 1)), pool)
        linked_total += len(evidence.link_corroboration(n, pool))
        pool.append(n)
    assert linked_total <= config.CORROBORATIONS_PER_ACCOUNT_PER_DAY + 4  # first link may touch several reports
    last = grading.grade(rep(200, "spammer", dt=8), pool)
    assert evidence.link_corroboration(last, pool) == []


def test_expert_shortcut_from_assessed():
    a = grading.grade(rep(1, "a"), [])
    evidence.verify(a, "exp-1", "field")
    assert a.rung == Rung.EXPERT
    assert "graph shortcut" in a.history[-1].note


def test_reject_needs_reason_and_is_kept():
    a = grading.grade(rep(1, "a"), [])
    with pytest.raises(evidence.TransitionError):
        evidence.reject(a, "exp-1", "  ")
    evidence.reject(a, "exp-1", "Photo shows a puddle on the path, not the stream.")
    assert a.rung == Rung.NOT_CONFIRMED and a.rejection


def test_mission_points_upstream():
    a = grading.grade(rep(1, "a"), [])
    m = evidence.open_mission(a, "exp-1", "M-1")
    assert 350 <= geo.distance_m(a.lat, a.lon, m.lat, m.lon) <= 420
    assert "upstream" in m.request and "counts the same" in m.request


def test_decision_grade_threshold_two_experts():
    a = grading.grade(rep(1, "a"), [])
    b = grading.grade(rep(2, "b", dt=3, dlat=0.001), [a])
    evidence.verify(a, "exp-1", "remote")
    sig = evidence.signals([a, b], at=T0 + timedelta(days=1))
    assert not any(s.decision_grade for s in sig)
    evidence.verify(b, "exp-1", "field")
    moved = evidence.promote_decision_grade([a, b])
    assert set(moved) == {"SP-1", "SP-2"}
    s = [x for x in evidence.signals([a, b]) if x.indicator == "stagnant-water"][0]
    assert s.decision_grade and s.advisory


def test_community_only_threshold_needs_one_expert():
    rs = []
    for i in range(3):
        r = grading.grade(rep(i, f"o{i}", dt=i * 2, dlat=0.0006 * i), rs)
        evidence.link_corroboration(r, rs)
        rs.append(r)
    s = [x for x in evidence.signals(rs) if x.indicator == "stagnant-water"][0]
    assert s.community_or_better == 3 and not s.decision_grade
    assert "one expert verification" in s.gaps[0]


# ---------- permitted-use gate ----------

def test_gate_matrix():
    assert permitted_use.check(Rung.ASSESSED, "org_dashboard").allowed
    assert not permitted_use.check(Rung.ASSESSED, "fhir_exchange").allowed
    assert not permitted_use.check(Rung.COMMUNITY, "advisory_flag").allowed
    assert permitted_use.check(Rung.DECISION, "advisory_flag").allowed
    assert permitted_use.allowed_uses(Rung.NOT_CONFIRMED) == []
    d = permitted_use.check(Rung.ASSESSED, "fhir_exchange")
    assert "Expert-verified" in d.reason


def test_fhir_export_blocked_below_expert():
    a = grading.grade(rep(1, "a"), [])
    with pytest.raises(permitted_use.Blocked):
        fhir.bundle(a)


# ---------- FHIR + signing ----------

def test_bundle_shape_and_privacy():
    a = grading.grade(rep(1, "a", codes=("stagnant-water", "mosquitoes")), [])
    evidence.verify(a, "exp-1", "field")
    signed = signing.sign(signing.deidentified(a))
    b = fhir.bundle(a, signed)
    types = [e["resource"]["resourceType"] for e in b["entry"]]
    assert types.count("Observation") == 2 and types.count("Provenance") == 3
    assert "Patient" not in types
    text = str(b)
    assert str(ON_STREAM[0]) not in text  # exact GPS never leaves
    obs = [e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "Observation"][0]
    uses = [c["valueCodeableConcept"]["coding"][0]["code"] for c in obs["component"]
            if c["code"]["coding"][0]["code"] == "permitted-use"]
    assert "fhir_exchange" in uses and "advisory_flag" not in uses
    prov = [e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "Provenance"][-1]
    assert prov["signature"][0]["data"] == signed["signature"]


def test_signature_detects_tampering():
    a = grading.grade(rep(1, "a"), [])
    evidence.verify(a, "exp-1", "remote")
    d = signing.deidentified(a)
    s = signing.sign(d)
    assert signing.verify(d, s["sha256"], s["signature"])[0]
    d2 = dict(d, grade="A" if d["grade"] != "A" else "B")
    ok, msg = signing.verify(d2, s["sha256"], s["signature"])
    assert not ok and "changed" in msg


def test_deidentified_has_no_exact_location():
    a = rep(1, "a")
    d = signing.deidentified(a)
    assert d["area"] == [round(a.lat, 3), round(a.lon, 3)]
    assert "contact" not in str(d)


def test_threshold_counts_people_not_reports():
    a = grading.grade(rep(1, "a"), [])
    b = grading.grade(rep(2, "a", dt=30, dlat=0.001), [a])  # same person, twice
    evidence.verify(a, "exp-1", "remote")
    evidence.verify(b, "exp-1", "remote")
    s = [x for x in evidence.signals([a, b], at=T0 + timedelta(days=2)) if x.indicator == "stagnant-water"][0]
    assert s.expert == 1 and not s.decision_grade
