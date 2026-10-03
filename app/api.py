"""JSON API for the StreamProof web app (web/). Same engine and rules as the HTML pages.

Demo sign-in keeps one session per role, so one browser can hold the citizen and the
reviewer at the same time:

    session["citizen"] = {"id": pseudonym, "name": display}
    session["org"]     = {"id": expert id, "name": "Reviewer (demo)"}

Privacy rules carry over from the HTML app: a citizen only ever sees their own reports,
and exact GPS is returned to the organization only; everyone else gets the ~100 m area.
"""

import json
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response

from . import brief, certificate, config, evidence, geo, grading, permitted_use, seed, service, signing
from .indicators import INDICATORS
from .models import Mission, Report, Rung

router = APIRouter(prefix="/api")
MAX_UPLOAD = 15 * 1024 * 1024
ORDER = [Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY, Rung.EXPERT, Rung.DECISION]
GRADE_WORDS = {"A": "Strong evidence", "B": "Good evidence", "C": "Needs verification", "D": "Low confidence"}
PRIORITY = {"dead-fish": 5, "sewage": 4, "algal-scum": 4, "oil-sheen": 4, "mosquitoes": 3, "stagnant-water": 3}


def _store():
    from .main import store  # the app's single store
    return store


# ---------------- session ----------------

def role(request: Request, name: str) -> dict:
    u = request.session.get(name)
    if not u:
        raise HTTPException(401, detail={"signin": name})
    return u


@router.get("/session")
def session_get(request: Request):
    return {"citizen": request.session.get("citizen"), "org": request.session.get("org")}


@router.post("/session")
def session_start(request: Request, role: str = Form(...)):
    if role == "citizen":
        request.session["citizen"] = {"id": seed.DEMO_CITIZEN[0], "name": seed.DEMO_CITIZEN[1]}
    elif role == "org":
        request.session["org"] = {"id": seed.DEMO_EXPERT, "name": "Reviewer (demo)"}
    else:
        raise HTTPException(400, "unknown role")
    return session_get(request)


@router.delete("/session")
def session_end(request: Request):
    request.session.clear()
    return {"citizen": None, "org": None}


# ---------------- shapes ----------------

def _rung(r: Rung) -> dict:
    return {"value": r.value, "label": r.label, "level": r.level}


def _signs(codes: list[str]) -> list[dict]:
    return [{"code": c, "chip": INDICATORS[c].chip, "display": INDICATORS[c].display} for c in codes]


def place(lat: float, lon: float) -> str:
    s = geo.snap(lat, lon)
    if not s or s.distance_m > 200:
        return "Away from a mapped stream"
    km = (s.stream.chainage[-1] - s.chainage_m) / 1000
    return f"{s.stream.name}, {km:.1f} km above the Mondego"


def report_json(r: Report, exact: bool) -> dict:
    lat, lon = (r.lat, r.lon) if exact else geo.coarsen(r.lat, r.lon)
    store = _store()
    cert = store.certificate(r.id)
    return {
        "id": r.id,
        "created_at": r.created_at.isoformat(),
        "signs": _signs(r.indicators),
        "description": r.description,
        "grade": r.grade,
        "grade_words": GRADE_WORDS.get(r.grade or "", ""),
        "score": r.score,
        "rung": _rung(r.rung),
        "status": r.status,
        "reasons": [x.__dict__ for x in r.reasons],
        "hint": r.hint,
        "safety": r.safety,
        "support": r.support,
        "verification": r.verification,
        "rejection": r.rejection,
        "mission_id": r.mission_id,
        "history": [e.__dict__ for e in r.history],
        "photo": ({"url": f"/api/media/{r.photo_file}"} if r.photo_file
                  else {"synthetic": True} if r.photo else None),
        "position": {"lat": lat, "lon": lon, "exact": exact, "accuracy_m": r.gps_accuracy_m if exact else None},
        "place": place(r.lat, r.lon),
        "uses": [{"code": u, "label": permitted_use.USES[u]} for u in permitted_use.allowed_uses(r.rung)],
        "certificate": {"sha256": cert["sha256"], "issued": cert["issued"]} if cert else None,
        "shareable": r.rung not in (Rung.NOT_CONFIRMED, Rung.REPORT),
    }


def mission_json(m: Mission) -> dict:
    return {"id": m.id, "report_id": m.report_id, "signs": _signs(m.indicators),
            "position": {"lat": m.lat, "lon": m.lon}, "radius_m": m.radius_m, "request": m.request,
            "safety": m.safety, "status": m.status, "submissions": len(m.submissions),
            "created_at": m.created_at.isoformat(), "place": place(m.lat, m.lon)}


# ---------------- shared reference data ----------------

@router.get("/meta")
def meta():
    s = geo.streams()[0]
    lat, lon = geo.point_at(s, s.chainage[-1] - 2550)
    return {
        "signs": [{"code": i.code, "chip": i.chip, "display": i.display, "definition": i.definition,
                   "health_relevant": i.health_relevant} for i in INDICATORS.values()],
        "rungs": [_rung(r) for r in ORDER],
        "uses": [{"code": u, "label": l, "min_rung": permitted_use.minimum_rung(u).value}
                 for u, l in permitted_use.USES.items()],
        "streams": [{"name": x.name, "city": x.city, "line": [[la, lo] for lo, la in x.coords]} for x in geo.streams()],
        "start": [round(lat + 0.0001, 6), round(lon, 6)],
        "rules": {"radius_m": config.NEARBY_RADIUS_M, "window_days": config.NEARBY_WINDOW_DAYS,
                  "min_expert": config.ADVISORY_MIN_EXPERT, "min_community": config.ADVISORY_MIN_COMMUNITY,
                  "per_day": config.CORROBORATIONS_PER_ACCOUNT_PER_DAY, "upstream_m": config.MISSION_UPSTREAM_M},
    }


# ---------------- citizen ----------------

@router.get("/me")
def me(request: Request):
    u = role(request, "citizen")
    store = _store()
    mine = list(reversed(store.by_observer(u["id"])))
    return {
        "name": u["name"],
        "reports": [report_json(r, exact=False) for r in mine],
        "missions": [mission_json(m) for m in store.missions() if m.status == "open"],
        "counts": {"reports": len(mine),
                   "verified": sum(r.rung in (Rung.EXPERT, Rung.DECISION) for r in mine),
                   "missions": sum(1 for r in mine if r.mission_id)},
    }


@router.post("/reports")
async def submit(request: Request, lat: float = Form(...), lon: float = Form(...), accuracy: str = Form(""),
                 codes: list[str] = Form(...), description: str = Form(""), contact: str = Form(""),
                 mission_id: str = Form(""), photo: UploadFile | None = File(None)):
    u = role(request, "citizen")
    data = None
    if photo is not None and photo.filename:
        data = await photo.read(MAX_UPLOAD + 1)
        if len(data) > MAX_UPLOAD:
            raise HTTPException(413, "The photo is larger than 15 MB.")
    acc = float(accuracy) if accuracy.strip() else None
    try:
        r = service.submit(_store(), u["id"], codes, lat, lon, acc, data, description, contact, mission_id or None)
    except service.ServiceError as e:
        raise HTTPException(400, str(e))
    return report_json(r, exact=False)


def _own(request: Request, rid: str) -> tuple[Report, bool]:
    """A report the caller may see: any report for the org, only their own for a citizen."""
    store = _store()
    r = store.get(rid)
    if r is None:
        raise HTTPException(404, "No such report.")
    if request.session.get("org"):
        return r, True
    u = role(request, "citizen")
    if r.observer != u["id"]:
        raise HTTPException(404, "No such report.")
    return r, False


@router.get("/reports/{rid}")
def report(request: Request, rid: str):
    r, is_org = _own(request, rid)
    out = report_json(r, exact=is_org)
    if is_org:
        store = _store()
        reports = store.all()
        agree, contradict = grading.nearby_matches(r, reports)
        ok, bad = grading.track_record(r.observer, [x for x in reports if x.id != r.id])
        mission = next((m for m in store.missions() if m.report_id == rid), None)
        out["org"] = {
            "observer": {"pseudonym": r.observer, "display": store.observer_display(r.observer),
                         "confirmed": ok, "not_confirmed": bad},
            "agree": [{"id": o.id, "signs": _signs(o.indicators), "rung": _rung(o.rung),
                       "position": {"lat": o.lat, "lon": o.lon}} for o in agree],
            "contradict": [{"id": o.id, "position": {"lat": o.lat, "lon": o.lon}} for o in contradict],
            "gate": [{"code": d.use, "label": permitted_use.USES[d.use], "allowed": d.allowed, "reason": d.reason,
                      "needs": permitted_use.minimum_rung(d.use).label}
                     for d in (permitted_use.check(r.rung, x) for x in permitted_use.USES)],
            "mission": mission_json(mission) if mission else None,
            "can_decide": r.rung in (Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY),
            "ai_suggestion": r.ai_suggestion,
        }
    return out


@router.get("/reports/{rid}/certificate.pdf")
def certificate_pdf(request: Request, rid: str):
    u = role(request, "citizen")
    store = _store()
    r, cert = store.get(rid), store.certificate(rid)
    if not r or r.observer != u["id"] or not cert:
        raise HTTPException(404, "No certificate for this report yet.")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    proto = request.headers.get("x-forwarded-proto", "http")
    pdf = certificate.pdf(u["name"], cert["record"], cert, f"{proto}://{host}/verify/{rid}")
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="streamproof-{rid}.pdf"'})


@router.get("/missions/{mid}")
def mission(request: Request, mid: str):
    if not request.session.get("org"):
        role(request, "citizen")
    m = _store().mission(mid)
    if not m:
        raise HTTPException(404, "No such mission.")
    return mission_json(m)


@router.post("/me/forget")
def forget(request: Request):
    u = role(request, "citizen")
    n = service.forget(_store(), u["id"])
    request.session.pop("citizen", None)
    return {"removed_from": n}


@router.get("/media/{name}")
def media(request: Request, name: str):
    path = (config.MEDIA_DIR / name).resolve()
    if path.parent != config.MEDIA_DIR.resolve() or not path.exists():
        raise HTTPException(404)
    _own(request, name.rsplit(".", 1)[0])
    return FileResponse(path, media_type="image/jpeg")


# ---------------- organization ----------------

def _priority(r: Report) -> tuple:
    health = max((PRIORITY.get(c, 1) for c in r.indicators), default=1)
    return (-health, -r.created_at.timestamp())


@router.get("/queue")
def queue(request: Request):
    role(request, "org")
    store = _store()
    reports = store.all()
    todo = sorted([r for r in reports if r.rung in (Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY)], key=_priority)
    done = sorted([r for r in reports if r not in todo], key=lambda r: r.created_at, reverse=True)
    return {
        "todo": [report_json(r, exact=True) for r in todo],
        "done": [report_json(r, exact=True) for r in done],
        "missions": [mission_json(m) for m in store.missions()],
        "signals": [{"sign": INDICATORS[s.indicator].chip, "reports": len(s.reports), "expert": s.expert,
                     "community": s.community_or_better, "decision_grade": s.decision_grade,
                     "place": place(*s.center), "gaps": s.gaps} for s in evidence.signals(reports)],
    }


def _act(fn):
    try:
        return fn()
    except service.ServiceError as e:
        raise HTTPException(400, str(e))
    except permitted_use.Blocked as e:
        raise HTTPException(403, e.decision.reason)


@router.post("/reports/{rid}/verify")
def verify(request: Request, rid: str, method: str = Form(...), note: str = Form("")):
    u = role(request, "org")
    _act(lambda: service.verify(_store(), rid, u["id"], method, note))
    return report(request, rid)


@router.post("/reports/{rid}/reject")
def reject(request: Request, rid: str, reason: str = Form("")):
    u = role(request, "org")
    _act(lambda: service.reject(_store(), rid, u["id"], reason))
    return report(request, rid)


@router.post("/reports/{rid}/mission")
def open_mission(request: Request, rid: str):
    u = role(request, "org")
    _act(lambda: service.request_mission(_store(), rid, u["id"]))
    return report(request, rid)


@router.get("/reports/{rid}/fhir")
def fhir_bundle(request: Request, rid: str):
    """The gate decides: below Expert-verified this returns 403 with the gate's reason."""
    role(request, "org")
    b = _act(lambda: service.export_fhir(_store(), rid))
    return JSONResponse(b, media_type="application/fhir+json")


@router.get("/brief")
def river_brief(request: Request):
    role(request, "org")
    store = _store()
    b = brief.build(store.all(), store.missions())
    return {
        "generated": b["generated"], "area": b["area"], "window_days": b["window_days"], "total": b["total"],
        "counts": [{"label": k, "count": v} for k, v in b["counts"].items()],
        "rows": [{"sign": INDICATORS[row.signal.indicator].chip, "code": row.signal.indicator, "place": row.place,
                  "best_grade": row.best_grade, "confidence": row.confidence, "label": row.label,
                  "reports": len(row.signal.reports), "people": len({r.observer for r in row.signal.reports}),
                  "gaps": row.signal.gaps, "why": row.signal.why} for row in b["rows"]],
        "advisories": b["advisories"],
        "measures": [{"code": c, "sign": INDICATORS[c].chip, "measures": m} for c, m in b["measures"].items()],
        "missions": [mission_json(m) for m in b["missions"]],
        "threshold": b["threshold"],
    }


@router.post("/demo/reset")
def demo_reset(request: Request):
    role(request, "org")
    seed.run(_store())
    return {"ok": True}


# ---------------- public ----------------

@router.get("/standards")
def standards():
    root = config.ROOT / "fhir"
    out = root / "validation" / "validation-outcome.json"
    results = []
    if out.exists():
        d = json.loads(out.read_text(encoding="utf-8"))
        for e in d.get("entry", [d]):
            oo = e.get("resource", e)
            f = next((x.get("valueString") for x in oo.get("extension", []) if "file" in x.get("url", "")), "")
            iss = oo.get("issue", [])
            results.append({"file": Path(f).name, **{s: sum(i["severity"] == s for i in iss)
                                                     for s in ("fatal", "error", "warning")}})
    log = root / "validation" / "validator-output.txt"
    return {
        "definitions": [{"name": p.name, "url": f"/fhir/definitions/{p.name}"}
                        for p in sorted((root / "definitions").glob("*.json"))],
        "validation": {"results": results,
                       "validator": log.read_text(encoding="utf-8").splitlines()[:1] if log.exists() else []},
        "matrix": [{"rung": _rung(r), "adds": [{"code": u, "label": permitted_use.USES[u]}
                                               for u in permitted_use.MATRIX[r]]} for r in ORDER],
        "uses": [{"code": u, "label": l} for u, l in permitted_use.USES.items()],
    }


def _verify_payload(rid: str, rec: dict, edited: bool) -> dict:
    cert = _store().certificate(rid)
    ok, msg = signing.verify(rec, cert["sha256"], cert["signature"], cert["public_key"])
    return {"id": rid, "ok": ok, "message": msg, "edited": edited, "record": rec,
            "sha256": cert["sha256"], "signature": cert["signature"], "alg": cert["alg"],
            "public_key": cert["public_key"], "signed_by": cert["signed_by"], "issued": cert["issued"]}


@router.get("/verify/{rid}")
def verify_get(rid: str):
    cert = _store().certificate(rid)
    if not cert:
        raise HTTPException(404, "No signed record with that id.")
    return _verify_payload(rid, cert["record"], edited=False)


@router.post("/verify/{rid}")
def verify_post(rid: str, record_json: str = Form(...)):
    if not _store().certificate(rid):
        raise HTTPException(404, "No signed record with that id.")
    try:
        rec = json.loads(record_json)
        if not isinstance(rec, dict):
            raise TypeError
    except (ValueError, TypeError):
        raise HTTPException(400, "That isn't a valid JSON record.")
    return _verify_payload(rid, rec, edited=True)
