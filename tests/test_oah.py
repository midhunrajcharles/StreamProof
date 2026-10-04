"""The OneAquaHealth add-on: the published rule is the gate, records follow the OAH guide's shape,
and the DipteraCAST interface lets out verified Diptera data only.

The FHIR validator itself runs in tools/validate_fhir.py (it needs Java and the OAH guide); these
tests keep the Python, the published files and the FSH sources from drifting apart."""

import json
import re
import shutil
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import auth, config, dipteracast, evidence, fhir, grading, indicators, permitted_use, seed, signing
from app.grading import GRADE_BANDS
from app.main import app, store
from app.models import Report, Rung

DEFS = config.ROOT / "fhir" / "definitions"
FSH = config.ROOT / "ig" / "input" / "fsh"
OAH_FSH = config.ROOT / "tools" / "oah-ig" / "input" / "fsh" / "terminologies" / "oah-codeSystem.fsh"
T0 = datetime(2026, 10, 2, 9, 0, tzinfo=timezone.utc)
PHOTO = {"sha256": "ab" * 32, "width": 3000, "height": 4000, "sharpness": 200.0, "brightness": 120.0,
         "exif_time": "2026-10-02T10:00:00", "has_gps_exif": True}
ON_STREAM = (40.22267, -8.42745)


def load(name: str) -> dict:
    return json.loads((DEFS / name).read_text(encoding="utf-8"))


def verified(i: int, codes, obs="obs-a", dt=0) -> Report:
    r = Report(f"SP-{i}", obs, T0 + timedelta(hours=dt), list(codes), ON_STREAM[0], ON_STREAM[1], 8.0, photo=dict(PHOTO))
    grading.grade(r, [])
    evidence.verify(r, "exp-1", "field", "seen")
    return r


# ---------- the permitted-use rule is data, and the gate is that data ----------

def prop(concept: dict, code: str) -> list:
    return [p["valueCoding"]["code"] if "valueCoding" in p else p["valueInteger"]
            for p in concept.get("property", []) if p["code"] == code]


def test_gate_is_the_published_trust_level_file():
    cs = load("CodeSystem-trust-level.json")
    assert cs["property"][1]["code"] == "permits"
    for c in cs["concept"]:
        rung = Rung(c["code"])
        assert set(permitted_use.allowed_uses(rung)) == set(prop(c, "permits")), rung
        assert rung.level == prop(c, "level")[0]
        assert rung.label == c["display"]
    assert {c["code"] for c in cs["concept"]} == {r.value for r in Rung}


def test_permits_only_names_published_uses_and_never_shrinks_upward():
    uses = {c["code"]: c["display"] for c in load("CodeSystem-permitted-use.json")["concept"]}
    assert permitted_use.USES == uses
    cs = load("CodeSystem-trust-level.json")
    by_level = sorted((c for c in cs["concept"] if prop(c, "level")[0] > 0), key=lambda c: prop(c, "level")[0])
    previous: set[str] = set()
    for c in by_level:
        permits = set(prop(c, "permits"))
        assert permits <= set(uses), "a level permits a use that is not published"
        assert previous <= permits, f"{c['code']} must allow everything the level below allows"
        previous = permits
    assert previous == set(uses), "every published use is allowed from some level"
    assert prop(next(c for c in cs["concept"] if c["code"] == "not-confirmed"), "permits") == []


def test_editing_the_published_rule_changes_the_gate(tmp_path, monkeypatch):
    for n in ("CodeSystem-trust-level.json", "CodeSystem-permitted-use.json"):
        shutil.copy(DEFS / n, tmp_path / n)
    f = tmp_path / "CodeSystem-trust-level.json"
    cs = json.loads(f.read_text(encoding="utf-8"))
    for c in cs["concept"]:  # a stricter organisation: FHIR exchange only at decision grade
        if c["code"] == "expert-verified":
            c["property"] = [p for p in c["property"] if p.get("valueCoding", {}).get("code") != "fhir_exchange"]
    f.write_text(json.dumps(cs), encoding="utf-8")
    monkeypatch.setattr(permitted_use, "TRUST_LEVEL_FILE", f)
    monkeypatch.setattr(permitted_use, "PERMITTED_USE_FILE", tmp_path / "CodeSystem-permitted-use.json")
    uses, matrix, order = permitted_use._load()
    assert "fhir_exchange" not in matrix[Rung.EXPERT] and "fhir_exchange" in matrix[Rung.DECISION]
    assert order[0] == Rung.REPORT and order[-1] == Rung.DECISION


def test_unknown_use_in_the_rule_file_fails_loudly(tmp_path, monkeypatch):
    f = tmp_path / "t.json"
    cs = load("CodeSystem-trust-level.json")
    cs["concept"][1]["property"].append({"code": "permits", "valueCoding": {"code": "launch_rockets"}})
    f.write_text(json.dumps(cs), encoding="utf-8")
    monkeypatch.setattr(permitted_use, "TRUST_LEVEL_FILE", f)
    with pytest.raises(ValueError, match="launch_rockets"):
        permitted_use._load()


# ---------- the Python tables and the published definitions say the same thing ----------

def test_citizen_sign_codesystem_matches_indicators():
    cs = load("CodeSystem-citizen-sign.json")
    assert cs["url"] == indicators.CODESYSTEM_URL
    assert {c["code"]: c["display"] for c in cs["concept"]} == {i.code: i.display for i in indicators.INDICATORS.values()}


def test_grade_and_attribute_codesystems_match_the_code():
    grades = {c["code"] for c in load("CodeSystem-evidence-grade.json")["concept"]}
    assert grades == {g for _, g in GRADE_BANDS}
    attrs = {c["code"] for c in load("CodeSystem-evidence-attribute.json")["concept"]}
    assert attrs == {"evidence-grade", "evidence-score", "trust-level", "independent-corroborations", "permitted-use"}


def test_concept_map_matches_the_mapping_used_in_records():
    cm = load("ConceptMap-citizen-sign-to-oah.json")
    el = {e["code"]: e["target"][0] for e in cm["group"][0]["element"]}
    assert set(el) == set(indicators.INDICATORS)
    for sign, (system, code, display) in indicators.OAH.items():
        if system == indicators.OAH_URL:
            assert el[sign]["code"] == code and el[sign]["display"] == display and el[sign]["equivalence"] == "wider"
        else:
            assert el[sign]["equivalence"] == "unmatched"
            assert code in {c["code"] for c in load("CodeSystem-proposed-oah-indicator.json")["concept"]}
    assert sum(t["equivalence"] == "wider" for t in el.values()) == 6  # six of nine problem signs match OAH


@pytest.mark.skipif(not OAH_FSH.exists(), reason="the OAH guide is not cloned (tools/build_ig.py fetches it)")
def test_mapped_codes_exist_in_the_official_oah_codesystem():
    text = OAH_FSH.read_text(encoding="utf-8")
    official = dict(re.findall(r'^\* #([\w-]+) "([^"]*)"', text, re.M))
    for sign, (system, code, display) in indicators.OAH.items():
        if system == indicators.OAH_URL:
            assert official.get(code) == display, f"{sign}: {code} is not in OAH TemporaryOahSystem as {display!r}"


def test_published_definitions_are_what_the_fsh_compiles_to():
    gen = config.ROOT / "ig" / "fsh-generated" / "resources"
    if not gen.exists():
        pytest.skip("run tools/build_ig.py to compile the FSH")
    names = {p.name for p in gen.glob("*.json") if not p.name.startswith("ImplementationGuide")}
    assert names == {p.name for p in DEFS.glob("*.json")}, "fhir/definitions is out of date: run tools/build_ig.py"
    for n in names:
        a = json.loads((gen / n).read_text(encoding="utf-8"))
        b = json.loads((DEFS / n).read_text(encoding="utf-8"))
        b.pop("text", None)  # build_ig.py adds a one-line narrative
        assert a == b, f"{n} differs from its FSH source: run tools/build_ig.py"


# ---------- records follow the OAH guide's shape ----------

def obs_of(b: dict) -> list[dict]:
    return [e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "Observation"]


def test_observation_uses_oah_code_sign_value_and_quantities():
    a = verified(1, ("stagnant-water", "mosquitoes"))
    b = fhir.bundle(a, signing.sign(signing.deidentified(a)))
    codes = {o["code"]["coding"][0]["code"] for o in obs_of(b)}
    assert codes == {"hydrology", "diptera"}
    for o in obs_of(b):
        assert o["code"]["coding"][0]["system"] == indicators.OAH_URL
        assert o["meta"]["profile"][0].endswith("/observation-indicators-oah") and o["status"] == "final"
        assert o["valueCodeableConcept"]["coding"][0]["system"] == indicators.CODESYSTEM_URL
        comps = {c["code"]["coding"][0]["code"]: c for c in o["component"] if c["code"]["coding"][0]["code"] != "permitted-use"}
        assert comps["evidence-score"]["valueQuantity"]["code"] == "1" and comps["independent-corroborations"]["valueQuantity"]["value"] == 0
        assert comps["trust-level"]["valueCodeableConcept"]["coding"][0]["code"] == "expert-verified"
    loc = next(e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "Location")
    assert loc["meta"]["profile"][0].endswith("/location-oah") and loc["identifier"][0]["value"].startswith("coselhas@")
    assert str(ON_STREAM[0]) not in json.dumps(b)  # exact GPS still never leaves
    prov = [e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "Provenance"]
    assert all(p["policy"] == [fhir.CS_TRUST] for p in prov) and len(prov) == 3


def test_unmatched_signs_use_proposed_codes_and_all_clear_is_absent():
    r = verified(2, ("oil-sheen", "sewage"), obs="obs-b")
    ob = obs_of(fhir.bundle(r))
    assert {o["code"]["coding"][0]["system"] for o in ob} == {indicators.PROPOSED_URL}
    clear = obs_of(fhir.bundle(verified(3, ("all-clear",), obs="obs-c")))[0]
    assert clear["code"]["coding"][0]["code"] == "visual-check"
    systems = {c["system"]: c["code"] for c in clear["valueCodeableConcept"]["coding"]}
    assert systems[indicators.SNOMED] == "2667000" and systems[indicators.CODESYSTEM_URL] == "all-clear"


# ---------- DipteraCAST ----------

def test_ground_truth_lets_out_verified_diptera_records_only():
    present = verified(1, ("stagnant-water", "mosquitoes"))
    not_seen = verified(2, ("all-clear",), obs="obs-b", dt=3)
    other = verified(3, ("litter",), obs="obs-c", dt=4)  # verified, but says nothing about Diptera
    unverified = grading.grade(Report("SP-4", "obs-d", T0, ["mosquitoes"], *ON_STREAM, 8.0, photo=dict(PHOTO)), [])
    rejected = grading.grade(Report("SP-5", "obs-e", T0, ["mosquitoes"], *ON_STREAM, 8.0, photo=dict(PHOTO)), [])
    evidence.reject(rejected, "exp-1", "pollen")
    data = dipteracast.export([present, not_seen, other, unverified, rejected])
    assert [(x["report_id"], x["diptera"]) for x in data["rows"]] == [("SP-1", "present"), ("SP-2", "not_seen")]
    assert data["summary"] == {"present": 1, "not_seen": 1, "excluded": {"not_verified": 2, "not_about_diptera": 1}}
    assert all("absent" not in x["basis"].lower().split() for x in data["rows"])  # a visual check is never 'absent'
    assert "survey" in data["rows"][1]["basis"]


def test_ground_truth_csv_has_no_observer_and_neither_export_has_exact_gps():
    rs = [verified(1, ("mosquitoes",), obs="obs-secret"), verified(2, ("all-clear",), obs="obs-hidden", dt=2)]
    text = dipteracast.csv_text(dipteracast.export(rs)["rows"])
    b = dipteracast.bundle(rs, {r.id: signing.sign(signing.deidentified(r)) for r in rs})
    assert "obs-secret" not in text and "obs-hidden" not in text  # the CSV carries no observer at all
    for blob in (text, json.dumps(b)):  # (the Bundle's Provenance holds the pseudonym, as in every export)
        assert str(ON_STREAM[0]) not in blob
    assert text.splitlines()[0].split(",") == dipteracast.COLUMNS and len(text.splitlines()) == 3
    obs = obs_of(b)
    assert len(obs) == 2 and {o["code"]["coding"][0]["code"] for o in obs} == {"diptera"}  # no other signs travel
    assert any("not a trap or dip-sample survey" in n["text"] for o in obs for n in o["note"])
    targets = {t["reference"] for e in b["entry"] if e["resource"]["resourceType"] == "Provenance"
               for t in e["resource"]["target"]}
    assert targets == {e["fullUrl"] for e in b["entry"] if e["resource"]["resourceType"] == "Observation"}


def test_ground_truth_bundle_refuses_a_report_the_gate_blocks():
    r = grading.grade(Report("SP-9", "obs-z", T0, ["mosquitoes"], *ON_STREAM, 8.0, photo=dict(PHOTO)), [])
    with pytest.raises(permitted_use.Blocked):
        fhir.bundle(r, ground_truth=True)
    assert permitted_use.check(Rung.EXPERT, "ground_truth").allowed
    assert not permitted_use.check(Rung.COMMUNITY, "ground_truth").allowed


def test_prediction_slot_is_empty_until_supplied_and_never_graded(tmp_path, monkeypatch):
    monkeypatch.setattr(dipteracast, "PREDICTIONS_FILE", tmp_path / "none.json")
    assert dipteracast.prediction(*ON_STREAM) is None
    f = tmp_path / "p.json"
    f.write_text(json.dumps({"model": "DipteraCAST test", "sites": [
        {"lat": ON_STREAM[0] + 0.001, "lon": ON_STREAM[1], "p_present": 0.71},
        {"lat": 41.0, "lon": -8.0, "p_present": 0.1}]}), encoding="utf-8")
    monkeypatch.setattr(dipteracast, "PREDICTIONS_FILE", f)
    p = dipteracast.prediction(*ON_STREAM)
    assert p["p_present"] == 0.71 and p["counted_in_grade"] is False and p["distance_m"] < 150
    assert dipteracast.prediction(40.5, -8.4) is None  # nothing within 300 m


@pytest.fixture()
def client():
    seed.run(store)
    auth.reset_limits()
    return TestClient(app)


def test_export_endpoints_need_an_organisation_and_agree(client):
    assert client.get("/api/export/diptera-ground-truth").status_code == 401
    assert client.post("/api/session", data={"role": "org"}).status_code == 200
    j = client.get("/api/export/diptera-ground-truth").json()
    assert j["rows"] and j["summary"]["present"] + j["summary"]["not_seen"] == len(j["rows"])
    assert j["needs"] == "Expert-verified"
    csv = client.get("/api/export/diptera-ground-truth?format=csv")
    assert csv.headers["content-type"].startswith("text/csv") and "attachment" in csv.headers["content-disposition"]
    assert len(csv.text.strip().splitlines()) == len(j["rows"]) + 1
    f = client.get("/api/export/diptera-ground-truth?format=fhir")
    assert f.headers["content-type"].startswith("application/fhir+json")
    assert len(obs_of(f.json())) == len(j["rows"])
    assert client.get("/api/export/diptera-ground-truth?format=xml").status_code == 400
    for row in j["rows"]:  # every row is a record the gate allows
        r = store.get(row["report_id"])
        assert permitted_use.check(r.rung, "ground_truth").allowed


def test_report_detail_shows_the_prediction_slot_to_the_expert_only(client):
    client.post("/api/session", data={"role": "org"})
    rid = next(r.id for r in store.all() if "mosquitoes" in r.indicators)
    d = client.get(f"/api/reports/{rid}").json()["org"]["dipteracast"]
    assert d["counted_in_grade"] is False and "not public" in d["note"] and d["prediction"] is None
    other = next(r.id for r in store.all() if not {"mosquitoes", "stagnant-water"} & set(r.indicators))
    assert client.get(f"/api/reports/{other}").json()["org"]["dipteracast"] is None


def test_standards_publishes_the_oah_mapping_and_negative_control(client):
    s = client.get("/api/standards").json()
    assert {m["sign"]: m["code"] for m in s["oah_map"] if m["kind"] == "wider"}["mosquitoes"] == "diptera"
    assert sum(m["kind"] == "proposed" for m in s["oah_map"]) == 4
    assert {p["parent"] for p in s["profiles"]} == {"ObservationIndicatorsOah", "LocationOah", "Provenance"}
    assert any(u["code"] == "ground_truth" for u in s["uses"])
