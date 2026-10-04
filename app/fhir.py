"""FHIR R4 packaging: verified reports become a Bundle that any FHIR R4 system can read.

A trust add-on to the HL7 Europe OneAquaHealth guide (http://hl7.eu/fhir/ig/oah). Every record
conforms to the guide's own profiles and to StreamProof's, which derive from them:
  - Observation per sign: ObservationIndicatorsOah + StreamProofObservation. `code` is the OAH indicator
    observed (TemporaryOahSystem, e.g. #diptera), `value` is what the citizen saw (citizen-sign), and
    components carry the evidence grade, score, trust level, corroborations and permitted uses.
  - Location: LocationOah + StreamProofLocation, at ~100 m precision (never the exact GPS).
  - Provenance chain: citizen authored -> engine assessed -> expert verified (+ org signature),
    whose policy is the published trust-level CodeSystem (the permitted-use rule).
  - No Patient resource and no personal data; the citizen appears only as a pseudonym.
The definitions are written in ig/input/fsh, compiled by tools/build_ig.py into fhir/definitions/, and
checked against the official OAH profiles by tools/validate_fhir.py.
"""

import uuid
from datetime import datetime, timezone

from . import config, geo, permitted_use
from .indicators import ABSENT, CODESYSTEM_URL, INDICATORS, OAH, SNOMED
from .models import Report
from .signing import deidentified, digest

B = config.FHIR_BASE
CS_ATTR = f"{B}/CodeSystem/evidence-attribute"
CS_GRADE = f"{B}/CodeSystem/evidence-grade"
CS_TRUST = f"{B}/CodeSystem/trust-level"
CS_USE = f"{B}/CodeSystem/permitted-use"
POLICY = CS_TRUST  # the published permitted-use rule
UCUM = "http://unitsofmeasure.org"
OAH_PROFILE = "http://hl7.eu/fhir/ig/oah/StructureDefinition"
OBS_PROFILES = [f"{OAH_PROFILE}/observation-indicators-oah", f"{B}/StructureDefinition/streamproof-observation"]
LOC_PROFILES = [f"{OAH_PROFILE}/location-oah", f"{B}/StructureDefinition/streamproof-location"]
PROV_PROFILE = f"{B}/StructureDefinition/streamproof-provenance"
UCUM_SCORE, UCUM_COUNT = "1", "1"  # unity; the unit text says what is counted
OBS_CAT = "http://terminology.hl7.org/CodeSystem/observation-category"
PART = "http://terminology.hl7.org/CodeSystem/provenance-participant-type"
DATAOP = "http://terminology.hl7.org/CodeSystem/v3-DataOperation"
SIGTYPE = "urn:iso-astm:E1762-95:2013"

GRADE_TEXT = {"A": "Strong evidence", "B": "Good evidence", "C": "Needs verification", "D": "Low confidence"}


def _urn() -> str:
    return f"urn:uuid:{uuid.uuid4()}"


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _cc(system: str, code: str, display: str) -> dict:
    return {"coding": [{"system": system, "code": code, "display": display}], "text": display}


def _narr(text: str) -> dict:
    esc = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return {"status": "generated", "div": f'<div xmlns="http://www.w3.org/1999/xhtml"><p>{esc}</p></div>'}


def _with_text(entries: list[dict]) -> list[dict]:
    """Add a one-line human-readable narrative to every resource (FHIR best practice dom-6)."""
    for e in entries:
        res = e["resource"]
        t = res["resourceType"]
        if t == "Observation":
            line = f"{res['code']['text']} = {res['valueCodeableConcept']['text']} ({res['status']}), " + ", ".join(
                f"{c['code']['text']} = "
                f"{c['valueCodeableConcept']['text'] if 'valueCodeableConcept' in c else c['valueQuantity']['value']}"
                for c in res["component"][:3])
        elif t == "Provenance":
            line = f"Provenance: {res['activity']['text']} by {res['agent'][0]['type']['text'].lower()}"
        elif t == "Location":
            line = f"Location: {res['name']}"
        elif t == "Organization":
            line = f"Organization: {res['name']}"
        elif t == "Practitioner":
            line = f"Expert reviewer (pseudonym {res['identifier'][0]['value']})"
        else:
            line = f"{t}: {res.get('deviceName', [{}])[0].get('name', '')}"
        res["text"] = _narr(line)
    return entries


def _component(attr: str, attr_display: str, value: dict) -> dict:
    return {"code": _cc(CS_ATTR, attr, attr_display), **value}


def _quantity(value: int, unit: str, ucum: str) -> dict:
    return {"valueQuantity": {"value": value, "unit": unit, "system": UCUM, "code": ucum}}


def _sign_value(code: str) -> dict:
    """What the citizen saw. 'Everything looks fine' is recorded as the value Absent (SNOMED CT)."""
    ind = INDICATORS[code]
    coding = [{"system": CODESYSTEM_URL, "code": code, "display": ind.display}]
    if code == "all-clear":
        coding.append({"system": SNOMED, "code": ABSENT[0], "display": ABSENT[1]})
    return {"coding": coding, "text": ind.display}


def _indicator_code(code: str) -> dict:
    """The OAH indicator being observed (or StreamProof's proposed code where OAH has none yet)."""
    system, c, display = OAH[code]
    return _cc(system, c, display)


def site_id(lat: float, lon: float) -> str:
    """Stream plus its ~100 m cell (lat and lon are already coarsened)."""
    s = geo.snap(lat, lon)
    stream = s.stream.id if s and s.distance_m <= 200 else "unmapped"
    return f"{stream}@{lat:.3f},{lon:.3f}"


DIPTERA_SIGNS = ("mosquitoes", "all-clear")  # the signs that say something about Diptera
VISUAL_CHECK_NOTE = ("Visual check only: no high mosquito activity was seen. This is not a trap or "
                     "dip-sample survey, so it supports 'not seen', not 'absent'.")


def bundle(r: Report, signed: dict | None = None, at: datetime | None = None, ground_truth: bool = False) -> dict:
    """Build a collection Bundle for one verified report. Refuses unless the gate allows FHIR exchange.

    With `ground_truth=True` the Bundle is the DipteraCAST form: it needs the `ground_truth` use and holds
    only the Diptera observation (a mosquito report is 'present'; a verified all-clear is 'not seen')."""
    permitted_use.require(r.rung, "ground_truth" if ground_truth else "fhir_exchange")
    at = at or datetime.now(timezone.utc)
    loc_u, dev_u, org_u, exp_u = _urn(), _urn(), _urn(), _urn()
    lat, lon = geo.coarsen(r.lat, r.lon)
    s = geo.snap(r.lat, r.lon)
    place = s.stream.name if s and s.distance_m <= 200 else "Unmapped water body"

    entries: list[dict] = [
        {"fullUrl": loc_u, "resource": {
            "resourceType": "Location", "meta": {"profile": LOC_PROFILES},
            "identifier": [{"system": f"{B}/site-id", "value": site_id(lat, lon)}],
            "status": "active", "mode": "instance",
            "name": f"{place} (approx. 100 m area)",
            "description": "Coarsened to 3 decimal places; exact position stays in the organization's identity vault.",
            "physicalType": _cc("http://terminology.hl7.org/CodeSystem/location-physical-type", "area", "Area"),
            "position": {"longitude": lon, "latitude": lat}}},
        {"fullUrl": dev_u, "resource": {
            "resourceType": "Device", "status": "active",
            "deviceName": [{"name": "StreamProof evidence engine", "type": "manufacturer-name"}],
            "version": [{"value": "0.1.0"}]}},
        {"fullUrl": org_u, "resource": {"resourceType": "Organization", "active": True, "name": config.ORG_NAME}},
    ]
    v = r.verification or {}
    if v:
        entries.append({"fullUrl": exp_u, "resource": {
            "resourceType": "Practitioner", "active": True,
            "identifier": [{"system": f"{config.PSEUDONYM_SYSTEM}/expert", "value": v["by"]}]}})

    uses = permitted_use.allowed_uses(r.rung)
    reasons = "; ".join(f"{x.text} [{x.points}/{x.max_points}]" for x in r.reasons)
    obs_urns = []
    codes = [c for c in r.indicators if c in DIPTERA_SIGNS] if ground_truth else r.indicators
    for code in codes:
        u = _urn()
        obs_urns.append(u)
        components = [
            _component("evidence-grade", "Evidence grade",
                       {"valueCodeableConcept": _cc(CS_GRADE, r.grade or "D", GRADE_TEXT[r.grade or "D"])}),
            _component("evidence-score", "Evidence score (0-100)",
                       _quantity(int(r.score or 0), "score", UCUM_SCORE)),
            _component("trust-level", "Trust level",
                       {"valueCodeableConcept": _cc(CS_TRUST, r.rung.value, r.rung.label)}),
            _component("independent-corroborations", "Independent corroborations",
                       _quantity(len(r.supporters), "corroborations", UCUM_COUNT)),
        ] + [
            _component("permitted-use", "Permitted use",
                       {"valueCodeableConcept": _cc(CS_USE, use, permitted_use.USES[use])}) for use in uses
        ]
        obs = {
            "resourceType": "Observation", "meta": {"profile": OBS_PROFILES},
            "identifier": [{"system": f"{B}/report-id", "value": f"{r.id}-{code}"}],
            "status": "final",  # the gate only lets Expert-verified or higher records out
            "category": [_cc(OBS_CAT, "survey", "Survey")],
            "code": _indicator_code("mosquitoes" if ground_truth else code),
            "subject": {"reference": loc_u, "display": place},
            "effectiveDateTime": _iso(r.created_at),
            "issued": _iso(datetime.fromisoformat(v["at"]) if v else at),
            "performer": [{"reference": org_u, "display": config.ORG_NAME}],
            "valueCodeableConcept": _sign_value(code),
            "note": [{"text": f"Evidence reasons: {reasons}"}]
                    + ([{"text": VISUAL_CHECK_NOTE}] if ground_truth and code == "all-clear" else []),
            "component": components,
        }
        entries.append({"fullUrl": u, "resource": obs})

    targets = [{"reference": u} for u in obs_urns]
    citizen = {"identifier": {"system": config.PSEUDONYM_SYSTEM, "value": r.observer},
               "display": f"Citizen observer {r.observer} (pseudonym)"}
    photo_entity = []
    if r.photo:
        photo_entity = [{"role": "source", "what": {
            "identifier": {"system": "urn:ietf:rfc:3986", "value": f"urn:hash:sha256:{r.photo['sha256']}"},
            "display": "Citizen photo (SHA-256 of the original file)"}}]

    entries.append({"fullUrl": _urn(), "resource": {
        "resourceType": "Provenance", "meta": {"profile": [PROV_PROFILE]},
        "target": targets, "recorded": _iso(r.created_at),
        "policy": [POLICY],
        "activity": _cc(DATAOP, "CREATE", "create"),
        "agent": [{"type": _cc(PART, "author", "Author"), "who": citizen}],
        "entity": photo_entity}})
    entries.append({"fullUrl": _urn(), "resource": {
        "resourceType": "Provenance", "meta": {"profile": [PROV_PROFILE]}, "target": targets,
        "recorded": _iso(datetime.fromisoformat(r.history[0].at) if r.history else r.created_at),
        "policy": [POLICY],
        "activity": _cc(DATAOP, "UPDATE", "revise"),
        "agent": [{"type": _cc(PART, "assembler", "Assembler"), "who": {"reference": dev_u}}],
        "reason": [_cc("http://terminology.hl7.org/CodeSystem/v3-ActReason", "HQUALIMP",
                       "health quality improvement")]}})
    if v:
        prov = {
            "resourceType": "Provenance", "meta": {"profile": [PROV_PROFILE]}, "target": targets,
            "recorded": _iso(datetime.fromisoformat(v["at"])),
            "policy": [POLICY],
            "activity": _cc(DATAOP, "UPDATE", "revise"),
            "agent": [{"type": _cc(PART, "verifier", "Verifier"), "who": {"reference": exp_u},
                       "onBehalfOf": {"reference": org_u}}],
            "entity": [{"role": "source", "what": {
                "identifier": {"system": "urn:ietf:rfc:3986",
                               "value": f"urn:hash:sha256:{digest(deidentified(r))}"},
                "display": f"De-identified verified record ({v['method']} check)"}}],
        }
        if signed:
            prov["signature"] = [{
                "type": [{"system": SIGTYPE, "code": "1.2.840.10065.1.12.1.5", "display": "Verification Signature"}],
                "when": _iso(datetime.fromisoformat(v["at"])),
                "who": {"reference": org_u},
                "targetFormat": "application/json",
                "sigFormat": "application/octet-stream",
                "data": signed["signature"]}]
        entries.append({"fullUrl": _urn(), "resource": prov})

    return {"resourceType": "Bundle", "type": "collection", "timestamp": _iso(at),
            "identifier": {"system": f"{B}/bundle-id", "value": f"{r.id}-{at.strftime('%Y%m%d%H%M%S')}"},
            "entry": _with_text(entries)}
