"""The DipteraCAST interface: verified field data out, an optional prediction in.

DipteraCAST (OneAquaHealth, built by ENORA Innovation) predicts Diptera communities from site data.
Models trained on unbalanced ecological sets need exactly what StreamProof produces: field-checked
presence and 'not seen' records at known places and dates, each with its evidence grade.

OUT  Expert-verified records that say something about Diptera, as labelled ground truth:
       * a verified report of high mosquito activity  -> `present`
       * a verified all-clear                          -> `not_seen` (a visual check, NOT a trap or
                                                          dip-sample survey, so never called 'absent')
     as a FHIR Bundle (the same OAH-profiled records, code #diptera) or a CSV. Each record passes the
     permitted-use gate (`ground_truth`), so unverified reports can never leave. No observer is named.
IN   An optional site prediction, shown to the expert as ONE context line and never counted in the grade.
     Honest status: this is an interface only. The announcement (31 Jul 2026) gives no public access or API and
     says integration into the OneAquaHealth Open Information Hub is planned, so nothing is loaded unless
     someone supplies `dipteracast-predictions.json` (see `prediction`).
"""

import csv
import io
import json
from datetime import datetime, timezone

from . import config, fhir, geo, permitted_use
from .models import Report

USE = "ground_truth"
INTERFACE_NOTE = "Interface only: no public DipteraCAST access or API is announced yet, so no prediction is loaded."
BASIS = {
    "present": "Citizen report of high mosquito activity, confirmed by an expert",
    "not_seen": "Citizen all-clear (visual check), confirmed by an expert; not a trap or dip-sample survey",
}
COLUMNS = ["report_id", "site_id", "stream", "date", "lat", "lon", "diptera", "basis", "verification_method",
           "verified_on", "evidence_grade", "evidence_score", "independent_corroborations", "trust_level"]


def label(r: Report) -> str | None:
    """'present', 'not_seen', or None when the record says nothing about Diptera."""
    if "mosquitoes" in r.indicators:
        return "present"
    if r.indicators == ["all-clear"]:
        return "not_seen"
    return None


def eligible(reports: list[Report]) -> tuple[list[Report], dict[str, int]]:
    """Records the gate lets out, and a count of the rest by reason."""
    out, skipped = [], {"not_verified": 0, "not_about_diptera": 0}
    for r in sorted(reports, key=lambda x: x.created_at):
        if not permitted_use.check(r.rung, USE).allowed:
            skipped["not_verified"] += 1
        elif label(r) is None:
            skipped["not_about_diptera"] += 1
        else:
            out.append(r)
    return out, skipped


def row(r: Report) -> dict:
    lat, lon = geo.coarsen(r.lat, r.lon)  # ~100 m, never the exact GPS
    s = geo.snap(r.lat, r.lon)
    v = r.verification or {}
    lab = label(r)
    return {"report_id": r.id, "site_id": fhir.site_id(lat, lon),
            "stream": s.stream.name if s and s.distance_m <= 200 else "Unmapped water body",
            "date": r.created_at.date().isoformat(), "lat": lat, "lon": lon, "diptera": lab, "basis": BASIS[lab],
            "verification_method": v.get("method", ""), "verified_on": (v.get("at") or "")[:10],
            "evidence_grade": r.grade, "evidence_score": r.score,
            "independent_corroborations": len(r.supporters), "trust_level": r.rung.label}


def export(reports: list[Report]) -> dict:
    """Rows plus a summary, for the organiser screen and the CSV."""
    keep, skipped = eligible(reports)
    rows = [row(r) for r in keep]
    return {"rows": rows,
            "summary": {"present": sum(x["diptera"] == "present" for x in rows),
                        "not_seen": sum(x["diptera"] == "not_seen" for x in rows),
                        "excluded": skipped},
            "use": permitted_use.USES[USE], "needs": permitted_use.minimum_rung(USE).label,
            "note": "Presence is a citizen sighting an expert confirmed. 'Not seen' is a visual check, not a survey."}


def csv_text(rows: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=COLUMNS, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue()


def bundle(reports: list[Report], certificates: dict[str, dict] | None = None, at: datetime | None = None) -> dict:
    """One FHIR collection Bundle of Diptera Observations (+ their Locations and Provenance)."""
    at = at or datetime.now(timezone.utc)
    certificates = certificates or {}
    keep, _ = eligible(reports)
    entries: list[dict] = []
    for r in keep:
        entries += fhir.bundle(r, certificates.get(r.id), at=at, ground_truth=True)["entry"]
    return {"resourceType": "Bundle", "type": "collection", "timestamp": fhir._iso(at),
            "identifier": {"system": f"{fhir.B}/bundle-id", "value": f"diptera-ground-truth-{at.strftime('%Y%m%d%H%M%S')}"},
            "entry": entries}


# ---------- the optional prediction slot ----------

PREDICTIONS_FILE = config.DATA_DIR / "dipteracast-predictions.json"
MAX_PREDICTION_DISTANCE_M = 300


def prediction(lat: float, lon: float) -> dict | None:
    """The nearest DipteraCAST site prediction, if the operator supplied a file; otherwise None.

    File: {"model": "DipteraCAST x.y", "sites": [{"lat": 40.22, "lon": -8.42, "p_present": 0.71}, ...]}.
    Shown to the expert as context only; it never changes the grade."""
    if not PREDICTIONS_FILE.exists():
        return None
    data = json.loads(PREDICTIONS_FILE.read_text(encoding="utf-8"))
    best = min(((geo.distance_m(lat, lon, s["lat"], s["lon"]), s) for s in data.get("sites", [])),
               key=lambda t: t[0], default=None)
    if best is None or best[0] > MAX_PREDICTION_DISTANCE_M:
        return None
    return {"model": data.get("model", "DipteraCAST"), "p_present": best[1]["p_present"],
            "distance_m": round(best[0]), "counted_in_grade": False}
