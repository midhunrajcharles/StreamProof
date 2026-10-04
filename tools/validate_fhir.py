"""Check StreamProof's FHIR output against the OFFICIAL OneAquaHealth profiles with the HL7 validator.

    python tools/build_ig.py        # once: compile the OAH guide + the add-on (see that file)
    python tools/validate_fhir.py   # needs Java 11+, tools/validator_cli.jar, and network for SNOMED CT

What it proves, saved to fhir/validation/ so it can be shown offline:
  * the example Bundles and every published definition validate with 0 errors and 0 warnings, and each
    Observation and Location is checked against ObservationIndicatorsOah / LocationOah themselves
    (the HL7 Europe guide, not just StreamProof's profiles);
  * a negative control: the same record with an unverified trust level is REJECTED by the profile
    (invariant sp-obs-1), so the permitted-use rule holds even if an app skips its own gate.
"""

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import dipteracast, evidence, fhir, grading, signing  # noqa: E402
from app.models import Report  # noqa: E402

FHIR_DIR = ROOT / "fhir"
DEFS = FHIR_DIR / "definitions"
EXAMPLES = FHIR_DIR / "examples"
OUT = FHIR_DIR / "validation"
JAR = ROOT / "tools" / "validator_cli.jar"
OAH_PACKAGE = "hl7.eu.fhir.oah#0.1.0-ci-build"
NEGATIVE = "Bundle-NEGATIVE-unverified-record.json"

PHOTO = {"sha256": "9f2c" + "0" * 60, "width": 3024, "height": 4032, "sharpness": 210.5,
         "brightness": 118.0, "exif_time": "2026-10-02T10:38:00", "has_gps_exif": True}
T = datetime(2026, 10, 2, 9, 40, tzinfo=timezone.utc)


def _verified(rid: str, observer: str, codes: list[str], lat: float, lon: float, hours: int = 0,
              others: list[Report] | None = None) -> Report:
    r = Report(rid, observer, T + timedelta(hours=hours), codes, lat, lon, 8, photo=PHOTO)
    grading.grade(r, others or [])
    if others:
        evidence.link_corroboration(r, others)
    evidence.verify(r, "exp-feio-lab", "field", "Checked on the field visit.")
    return r


def _bundle(r: Report) -> dict:
    return fhir.bundle(r, signing.sign(signing.deidentified(r)), at=r.created_at + timedelta(days=1))


def example_bundles() -> dict[str, dict]:
    a = _verified("SP-1001", "obs-7f3a", ["stagnant-water", "mosquitoes"], 40.22267, -8.42745)
    clear = _verified("SP-1003", "obs-3c9a", ["all-clear"], 40.2231, -8.4268, hours=30)
    scum = _verified("SP-1004", "obs-91bd", ["algal-scum", "oil-sheen"], 40.2236, -8.4261, hours=52)
    out = {"Bundle-verified-report-example.json": _bundle(a),
           "Bundle-all-clear-example.json": _bundle(clear),
           "Bundle-proposed-signs-example.json": _bundle(scum),
           "Bundle-diptera-ground-truth-example.json": dipteracast.bundle([a, clear], at=T + timedelta(days=2))}
    return out


def negative_bundle() -> dict:
    """The verified example with its trust level lowered: a record the gate would never export."""
    b = _bundle(_verified("SP-1009", "obs-7f3a", ["mosquitoes"], 40.22267, -8.42745))
    for e in b["entry"]:
        if e["resource"]["resourceType"] == "Observation":
            for c in e["resource"]["component"]:
                if c["code"]["coding"][0]["code"] == "trust-level":
                    c["valueCodeableConcept"] = {"coding": [{"system": fhir.CS_TRUST, "code": "community-supported",
                                                             "display": "Community-supported"}],
                                                 "text": "Community-supported"}
    return b


def _issues(outcome: dict) -> list[dict]:
    return outcome.get("issue", [])


def _file_of(outcome: dict) -> str:
    return next((x.get("valueString") for x in outcome.get("extension", []) if "file" in x.get("url", "")), "")


def main() -> int:
    for d in (EXAMPLES, OUT):
        d.mkdir(parents=True, exist_ok=True)
    for old in EXAMPLES.glob("*.json"):
        old.unlink()
    paths = []
    for name, b in example_bundles().items():
        (EXAMPLES / name).write_text(json.dumps(b, indent=2, ensure_ascii=False), encoding="utf-8")
        paths.append(EXAMPLES / name)
    neg = EXAMPLES / NEGATIVE
    neg.write_text(json.dumps(negative_bundle(), indent=2, ensure_ascii=False), encoding="utf-8")
    if not JAR.exists():
        print(f"validator not found at {JAR}; examples written only")
        return 0
    targets = [str(p) for p in paths] + [str(neg)] + [str(p) for p in sorted(DEFS.glob("*.json"))]
    raw = OUT / "validation-raw.json"
    cmd = ["java", "-jar", str(JAR), *targets, "-version", "4.0.1", "-ig", OAH_PACKAGE, "-ig", str(DEFS),
           "-output", str(raw)]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    log = proc.stdout + proc.stderr
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    (OUT / "validator-output.txt").write_text(f"# HL7 FHIR Validator run {stamp}\n# {' '.join(cmd)}\n\n{log}",
                                              encoding="utf-8")
    d = json.loads(raw.read_text(encoding="utf-8"))
    entries = [e.get("resource", e) for e in d.get("entry", [d])]
    ok_entries = [e for e in entries if Path(_file_of(e)).name != NEGATIVE]
    neg_entries = [e for e in entries if Path(_file_of(e)).name == NEGATIVE]
    (OUT / "validation-outcome.json").write_text(
        json.dumps({"resourceType": "Bundle", "type": "collection", "entry": [{"resource": e} for e in ok_entries]},
                   indent=2), encoding="utf-8")
    (OUT / "negative-control-outcome.json").write_text(
        json.dumps({"resourceType": "Bundle", "type": "collection", "entry": [{"resource": e} for e in neg_entries]},
                   indent=2), encoding="utf-8")
    raw.unlink()

    bad = 0
    print(f"Validated against {OAH_PACKAGE} and the StreamProof add-on:")
    for e in ok_entries:
        iss = _issues(e)
        errs = sum(i["severity"] in ("fatal", "error") for i in iss)
        warns = sum(i["severity"] == "warning" for i in iss)
        bad += errs + warns
        print(f"  {Path(_file_of(e)).name:48s} {errs} errors, {warns} warnings")
        for i in iss:
            if i["severity"] in ("fatal", "error", "warning"):
                print(f"      {i['severity']}: {i.get('diagnostics') or i.get('details', {}).get('text')}")
    errors = [i for e in neg_entries for i in _issues(e) if i["severity"] in ("fatal", "error")]
    rejected = [i for i in errors if "sp-obs-1" in json.dumps(i)]
    only = len(errors) == len(rejected)  # sp-obs-1 is the ONLY reason, so the control tests one rule
    print(f"  {NEGATIVE:48s} " + ("REJECTED by sp-obs-1 only (expected)" if rejected and only else
                                  "REJECTED, but for other reasons too" if rejected else "NOT REJECTED (unexpected)"))
    return 1 if bad or not (rejected and only) else 0


if __name__ == "__main__":
    raise SystemExit(main())
