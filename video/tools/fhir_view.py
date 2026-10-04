"""Scene 6 data from real files: Maria's exported Bundle (written by video/capture/record.py after the on-camera
verification), the published trust-level rule, and the saved HL7 validator results.

    python video/tools/fhir_view.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "video" / "remotion" / "src" / "data"


def main() -> None:
    src = DATA / "maria-bundle.json"
    b = json.loads(src.read_text(encoding="utf-8"))
    obs = next(e["resource"] for e in b["entry"] if e["resource"]["resourceType"] == "Observation"
               and e["resource"]["code"]["coding"][0]["code"] == "diptera")
    code = lambda c: c["code"]["coding"][0]["code"]  # noqa: E731
    comp = [c for c in obs["component"] if code(c) in ("evidence-grade", "trust-level")]
    uses = [c["valueCodeableConcept"]["coding"][0]["code"] for c in obs["component"] if code(c) == "permitted-use"]
    view = {
        "resourceType": "Observation",
        "meta": {"profile": ["…/observation-indicators-oah", "…/streamproof-observation"]},
        "status": obs["status"],
        "code": {"coding": [{"system": "…/temporarySystem-oah-eu", "code": obs["code"]["coding"][0]["code"],
                             "display": obs["code"]["coding"][0]["display"]}]},
        "valueCodeableConcept": {"coding": [{"system": "…/citizen-sign", "code": obs["valueCodeableConcept"]["coding"][0]["code"]}]},
        "component": [{"code": code(c), "value": c["valueCodeableConcept"]["coding"][0]["code"]} for c in comp]
                     + [{"code": "permitted-use", "value": u} for u in uses[-3:]],
    }
    trust = next(c["value"] for c in view["component"] if c["code"] == "trust-level")
    cs = json.loads((ROOT / "fhir" / "definitions" / "CodeSystem-trust-level.json").read_text(encoding="utf-8"))
    level = next(cc for cc in cs["concept"] if cc["code"] == trust)
    permits = [p["valueCoding"]["code"] for p in level["property"] if p["code"] == "permits"]
    val = json.loads((ROOT / "fhir" / "validation" / "validation-outcome.json").read_text(encoding="utf-8"))
    rows = []
    for e in val["entry"]:
        oo = e["resource"]
        f = next((x.get("valueString") for x in oo.get("extension", []) if "file" in x.get("url", "")), "")
        iss = oo.get("issue", [])
        rows.append({"file": Path(f).name, "errors": sum(i["severity"] in ("error", "fatal") for i in iss),
                     "warnings": sum(i["severity"] == "warning" for i in iss)})
    neg = json.loads((ROOT / "fhir" / "validation" / "negative-control-outcome.json").read_text(encoding="utf-8"))
    negerr = [i for e in neg["entry"] for i in e["resource"]["issue"] if i["severity"] in ("error", "fatal")]
    out = {"observation": view, "trust": trust, "permits": permits, "validation": rows,
           "negative": {"errors": len(negerr), "rule": "sp-obs-1"}}
    (DATA / "fhir-view.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
    print("trust", trust, "| grade", next(c["value"] for c in view["component"] if c["code"] == "evidence-grade"),
          "| permits", len(permits), "| validation", len(rows), "files")


if __name__ == "__main__":
    main()
