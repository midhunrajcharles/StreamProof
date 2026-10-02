"""FHIR R4 packaging: verified reports become a Bundle that any FHIR R4 system can read.

Kept deliberately small and standard:
  - Observation per sign (code from the open stream-indicator CodeSystem), subject = Location,
    with components carrying the evidence grade, trust level and the permitted uses.
  - Location at ~100 m precision (never the exact GPS).
  - Provenance chain: citizen authored -> engine assessed -> expert verified (+ org signature).
  - No Patient resource and no personal data; the citizen appears only as a pseudonym.
The open definitions are written by `definitions()` into /fhir and passed to the validator.
"""

import uuid
from datetime import datetime, timezone

from . import config, geo, permitted_use
from .grading import GRADE_BANDS
from .indicators import CODESYSTEM_URL, INDICATORS, VALUESET_URL
from .models import Report, Rung
from .signing import deidentified, digest

B = config.FHIR_BASE
CS_ATTR = f"{B}/CodeSystem/evidence-attribute"
CS_GRADE = f"{B}/CodeSystem/evidence-grade"
CS_TRUST = f"{B}/CodeSystem/trust-level"
CS_USE = f"{B}/CodeSystem/permitted-use"
POLICY = f"{B}/policy/permitted-use-matrix"
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
            line = f"{res['code']['text']}: {res['status']}, " + ", ".join(
                f"{c['code']['text']} = {c.get('valueCodeableConcept', {}).get('text', c.get('valueInteger'))}"
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


def bundle(r: Report, signed: dict | None = None, at: datetime | None = None) -> dict:
    """Build a collection Bundle for one verified report. Refuses unless the gate allows FHIR exchange."""
    permitted_use.require(r.rung, "fhir_exchange")
    at = at or datetime.now(timezone.utc)
    loc_u, dev_u, org_u, exp_u = _urn(), _urn(), _urn(), _urn()
    lat, lon = geo.coarsen(r.lat, r.lon)
    s = geo.snap(r.lat, r.lon)
    place = s.stream.name if s and s.distance_m <= 200 else "Unmapped water body"

    entries: list[dict] = [
        {"fullUrl": loc_u, "resource": {
            "resourceType": "Location", "status": "active", "mode": "instance",
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
    for code in r.indicators:
        ind = INDICATORS[code]
        u = _urn()
        obs_urns.append(u)
        components = [
            _component("evidence-grade", "Evidence grade",
                       {"valueCodeableConcept": _cc(CS_GRADE, r.grade or "D", GRADE_TEXT[r.grade or "D"])}),
            _component("evidence-score", "Evidence score (0-100)", {"valueInteger": int(r.score or 0)}),
            _component("trust-level", "Trust level",
                       {"valueCodeableConcept": _cc(CS_TRUST, r.rung.value, r.rung.label)}),
            _component("independent-corroborations", "Independent corroborations",
                       {"valueInteger": len(r.supporters)}),
        ] + [
            _component("permitted-use", "Permitted use",
                       {"valueCodeableConcept": _cc(CS_USE, use, permitted_use.USES[use])}) for use in uses
        ]
        obs = {
            "resourceType": "Observation",
            "identifier": [{"system": f"{B}/report-id", "value": f"{r.id}-{code}"}],
            "status": "final" if r.rung.level >= Rung.EXPERT.level else "preliminary",
            "category": [_cc(OBS_CAT, "survey", "Survey")],
            "code": _cc(CODESYSTEM_URL, code, ind.display),
            "subject": {"reference": loc_u, "display": place},
            "effectiveDateTime": _iso(r.created_at),
            "issued": _iso(datetime.fromisoformat(v["at"]) if v else at),
            "performer": [{"reference": org_u, "display": config.ORG_NAME}],
            "valueBoolean": True,
            "note": [{"text": f"Evidence reasons: {reasons}"}],
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
        "resourceType": "Provenance", "target": targets, "recorded": _iso(r.created_at),
        "policy": [POLICY],
        "activity": _cc(DATAOP, "CREATE", "create"),
        "agent": [{"type": _cc(PART, "author", "Author"), "who": citizen}],
        "entity": photo_entity}})
    entries.append({"fullUrl": _urn(), "resource": {
        "resourceType": "Provenance", "target": targets,
        "recorded": _iso(datetime.fromisoformat(r.history[0].at) if r.history else r.created_at),
        "policy": [POLICY],
        "activity": _cc(DATAOP, "UPDATE", "revise"),
        "agent": [{"type": _cc(PART, "assembler", "Assembler"), "who": {"reference": dev_u}}],
        "reason": [_cc("http://terminology.hl7.org/CodeSystem/v3-ActReason", "HQUALIMP",
                       "health quality improvement")]}})
    if v:
        prov = {
            "resourceType": "Provenance", "target": targets, "recorded": _iso(datetime.fromisoformat(v["at"])),
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


# ---------- open definitions (published as JSON in /fhir) ----------

def _cs(cid: str, name: str, title: str, description: str, concepts: list[dict], vs: str | None = None) -> dict:
    cs = {"resourceType": "CodeSystem", "id": cid, "url": f"{B}/CodeSystem/{cid}", "version": "0.1.0",
          "name": name, "title": title, "status": "draft", "experimental": True,
          "publisher": "StreamProof (OneAquaHealth IEEE Hackathon entry)", "description": description,
          "caseSensitive": True, "content": "complete", "count": len(concepts), "concept": concepts}
    if vs:
        cs["valueSet"] = vs
    cs["text"] = _narr(f"{title}: " + ", ".join(f"{c['code']} ({c['display']})" for c in concepts))
    return cs


def definitions() -> dict[str, dict]:
    ind = _cs("stream-indicator", "StreamIndicator", "Citizen stream observation signs",
              "Plain-language signs a citizen can report at an urban stream, for One Health surveillance. "
              "Intended to be mapped to the OneAquaHealth Indicators Framework.",
              [{"code": i.code, "display": i.display, "definition": i.definition} for i in INDICATORS.values()],
              vs=VALUESET_URL)
    vs = {"resourceType": "ValueSet", "id": "stream-indicator", "url": VALUESET_URL, "version": "0.1.0",
          "name": "StreamIndicator", "title": "Citizen stream observation signs", "status": "draft",
          "experimental": True, "publisher": "StreamProof (OneAquaHealth IEEE Hackathon entry)",
          "description": "All signs in the stream-indicator CodeSystem.",
          "compose": {"include": [{"system": CODESYSTEM_URL, "version": "0.1.0"}]},
          "text": _narr("All signs in the StreamProof stream-indicator CodeSystem.")}
    attr = _cs("evidence-attribute", "EvidenceAttribute", "Evidence attributes",
               "Observation.component codes that carry the trust metadata with the data.",
               [{"code": "evidence-grade", "display": "Evidence grade",
                 "definition": "A-D grade from seven explainable signals."},
                {"code": "evidence-score", "display": "Evidence score (0-100)",
                 "definition": "Sum of points behind the grade."},
                {"code": "trust-level", "display": "Trust level",
                 "definition": "Position of the record in the evidence graph."},
                {"code": "independent-corroborations", "display": "Independent corroborations",
                 "definition": "Number of independent reports by other observers that agree."},
                {"code": "permitted-use", "display": "Permitted use",
                 "definition": "A use this record is allowed for at its trust level."}])
    grade = _cs("evidence-grade", "EvidenceGrade", "Evidence grade",
                "Explainable grade of a citizen observation. Score bands: " +
                ", ".join(f"{g} >= {f}" for f, g in GRADE_BANDS) + ".",
                [{"code": g, "display": GRADE_TEXT[g], "definition": f"Evidence score of {f} or more."}
                 for f, g in GRADE_BANDS])
    trust = _cs("trust-level", "TrustLevel", "Trust level",
                "Evidence graph levels. Expert-verified is reachable directly from assessed.",
                [{"code": x.value, "display": x.label, "definition": d} for x, d in [
                    (Rung.REPORT, "Submitted by a citizen, not yet assessed."),
                    (Rung.ASSESSED, "Graded A-D with reasons by the evidence engine."),
                    (Rung.COMMUNITY, "Independently corroborated by at least one other observer."),
                    (Rung.EXPERT, "Confirmed by an expert, remotely or in the field."),
                    (Rung.DECISION, "Expert-verified and part of a signal that meets the advisory threshold."),
                    (Rung.NOT_CONFIRMED, "Reviewed and not confirmed; kept for the record with a reason.")]])
    use = _cs("permitted-use", "PermittedUse", "Permitted use",
              "What a record may be used for at its trust level (the permitted-use matrix).",
              [{"code": k, "display": v, "definition": f"Allowed from {permitted_use.minimum_rung(k).label}."}
               for k, v in permitted_use.USES.items()])
    return {f"{d['resourceType']}-{d['id']}.json": d for d in (ind, vs, attr, grade, trust, use)}
