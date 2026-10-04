"""JSON API for the StreamProof web app (web/). Same engine and rules as the HTML pages.

Demo sign-in keeps one session per role, so one browser can hold the citizen and the
reviewer at the same time:

    session["citizen"] = {"id": pseudonym, "name": display}
    session["org"]     = {"id": expert id, "name": "Reviewer (demo)"}

Privacy rules carry over from the HTML app: a citizen only ever sees their own reports,
and exact GPS is returned to the organization only; everyone else gets the ~100 m area.
"""

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response

from . import (auth, brief, calibration, catalogue, certificate, cities, config, dipteracast, evidence, geo, grading,
               permitted_use, seed, service, signing)
from .indicators import INDICATORS, OAH, OAH_URL
from .models import Mission, Report, Rung, now


def _general_limit(request: Request) -> None:
    auth.limit("api", auth.client_ip(request), 600, 60)


router = APIRouter(prefix="/api", dependencies=[Depends(_general_limit)])
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
    if name == "org":  # a deactivated account loses access at its next request
        acct = _store().user(u.get("email", ""))
        if not acct or not acct["active"]:
            request.session.pop("org", None)
            raise HTTPException(401, detail={"signin": "org"})
    return u


def admin(request: Request) -> dict:
    u = role(request, "org")
    if u.get("role") != "admin":
        raise HTTPException(403, "Only an organisation admin can do this.")
    return u


def _org_session(request: Request, acct: dict) -> None:
    org = _store().org(acct.get("org_id") or "") or {}
    request.session["org"] = {"id": acct["id"], "name": acct["name"], "email": acct["email"], "role": acct["role"],
                              "org_id": org.get("id"), "org_name": org.get("name"), "city": org.get("city"),
                              "avatar": acct.get("avatar") or "ink"}


def _citizen_session(request: Request, pseudonym: str, demo: bool = False) -> None:
    store = _store()
    acct = store.citizen_account(pseudonym)
    request.session["citizen"] = {"id": pseudonym, "name": store.observer_display(pseudonym), "demo": demo,
                                  "account": bool(acct), "avatar": (acct or {}).get("avatar") or "water"}


# ---------------- organisation scope: a pilot sees its own city's reports ----------------

def report_city(lat: float, lon: float) -> str | None:
    return cities.city_at(lat, lon)


def in_scope(request: Request, lat: float, lon: float) -> bool:
    city = (request.session.get("org") or {}).get("city")
    return city is None or report_city(lat, lon) == city


def scoped(request: Request, rid: str) -> Report:
    r = _store().get(rid)
    if r is None or not in_scope(request, r.lat, r.lon):
        raise HTTPException(404, "No such report.")
    return r


@router.get("/session")
def session_get(request: Request):
    c = request.session.get("citizen")
    return {"citizen": c, "org": request.session.get("org"), "demo": config.DEMO_MODE,
            "consented": bool(c and _store().consent(c["id"]))}


@router.post("/session")
def session_start(request: Request, role: str = Form(...)):
    """One-tap demo accounts (demo mode only)."""
    if not config.DEMO_MODE:
        raise HTTPException(403, "Demo sign-in is switched off. Sign in with your account.")
    if role == "citizen":
        _citizen_session(request, seed.DEMO_CITIZEN[0], demo=True)
    elif role == "org":
        _org_session(request, _store().user(seed.DEMO_ACCOUNTS[0]["email"]))
    else:
        raise HTTPException(400, "unknown role")
    return session_get(request)


@router.delete("/session")
def session_end(request: Request):
    request.session.clear()
    return {"citizen": None, "org": None}


# ---------------- citizens: pseudonymous, no password ----------------

@router.post("/citizen/start")
def citizen_start(request: Request, display: str = Form("")):
    """Start reporting as a new pseudonymous citizen (one per device session)."""
    auth.limit("citizen-start", auth.client_ip(request), 10, 3600)
    pseudonym = auth.new_pseudonym()
    name = display.strip()[:40] or "Citizen"
    _store().upsert_observer(pseudonym, name)
    _citizen_session(request, pseudonym)
    return session_get(request)


@router.post("/citizen/logout")
def citizen_logout(request: Request):
    request.session.pop("citizen", None)
    return session_get(request)


@router.post("/consent")
def give_consent(request: Request):
    u = role(request, "citizen")
    _store().save_consent(u["id"], auth.CONSENT_VERSION, now().isoformat(timespec="seconds"))
    return {"consented": True, "version": auth.CONSENT_VERSION}


# ---------------- organisation accounts ----------------

@router.post("/auth/login")
def login(request: Request, email: str = Form(...), password: str = Form(...)):
    ip, key = auth.client_ip(request), email.strip().lower()
    auth.limit("login-ip", ip, 30, 900)  # every attempt from one address
    auth.limit("login-fail", key, 5, 900, record=False)  # failed attempts per account
    acct = _store().user(email)
    if not acct or not acct["active"] or not auth.check_password(password, acct["pw_hash"]):
        auth.hit("login-fail", key)
        raise HTTPException(401, "That email and password don't match an active account.")
    _org_session(request, acct)
    return session_get(request)


@router.post("/auth/logout")
def logout(request: Request):
    request.session.pop("org", None)
    return session_get(request)


@router.post("/auth/password")
def change_password(request: Request, current: str = Form(...), new: str = Form(...)):
    u = role(request, "org")
    auth.limit("password-fail", u["email"], 5, 900, record=False)
    store = _store()
    acct = store.user(u["email"])
    if not auth.check_password(current, acct["pw_hash"]):
        auth.hit("password-fail", u["email"])
        raise HTTPException(400, "Your current password isn't right.")
    if len(new) < auth.MIN_PASSWORD:
        raise HTTPException(400, f"Passwords need at least {auth.MIN_PASSWORD} characters.")
    acct["pw_hash"] = auth.hash_password(new)
    store.save_user(acct)
    return {"ok": True}


@router.get("/org/team")
def team(request: Request):
    me = admin(request)
    return {"members": [auth.public_user(u) for u in _store().users(me.get("org_id"))]}


@router.post("/org/team")
def add_member(request: Request, email: str = Form(...), name: str = Form(...), role_: str = Form("reviewer", alias="role"),
               password: str = Form(...)):
    me = admin(request)
    store = _store()
    if store.user(email):
        raise HTTPException(409, "There is already an account with that email.")
    try:
        u = auth.new_user(email, name, role_, password, org_id=me.get("org_id"))
    except ValueError as e:
        raise HTTPException(400, str(e))
    store.save_user(u)
    return auth.public_user(u)


@router.post("/org/team/{email}/active")
def set_active(request: Request, email: str, active: str = Form(...)):
    me = admin(request)
    store = _store()
    u = store.user(email)
    if not u or u.get("org_id") != me.get("org_id"):
        raise HTTPException(404, "No such account.")
    if u["email"] == me.get("email") and active != "1":
        raise HTTPException(400, "You can't deactivate your own account.")
    u["active"] = 1 if active == "1" else 0
    store.save_user(u)
    return auth.public_user(u)


# ---------------- shapes ----------------

def _rung(r: Rung) -> dict:
    return {"value": r.value, "label": r.label, "level": r.level}


def _signs(codes: list[str]) -> list[dict]:
    return [{"code": c, "chip": INDICATORS[c].chip, "display": INDICATORS[c].display} for c in codes]


def place(lat: float, lon: float) -> str:
    return brief.place_name(lat, lon)


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
    return {"id": m.id, "report_id": m.report_id, "kind": m.kind, "signs": _signs(m.indicators),
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
        # city switcher: the five OneAquaHealth cities, then any city people added
        "cities": [cities.public(_store(), c) for c in cities.known(_store())],
        "rules": {"radius_m": config.NEARBY_RADIUS_M, "window_days": config.NEARBY_WINDOW_DAYS,
                  "min_expert": config.ADVISORY_MIN_EXPERT, "min_community": config.ADVISORY_MIN_COMMUNITY,
                  "per_day": config.CORROBORATIONS_PER_ACCOUNT_PER_DAY, "upstream_m": config.MISSION_UPSTREAM_M},
    }


# ---------------- any city ----------------

@router.get("/cities/search")
def city_search(request: Request, q: str = "", lang: str = "en"):
    auth.limit("city-search", auth.client_ip(request), 120, 600)
    return {"results": cities.search(_store(), q[:80], lang[:5])}


@router.post("/cities")
def city_add(request: Request, name: str = Form(...), country: str = Form(""), cc: str = Form(""),
             lat: float = Form(...), lon: float = Form(...), bbox: str = Form("")):
    """Pick a city: registers it and fetches its streams and rainfall in the background."""
    if not (-90 <= lat <= 90 and -180 <= lon <= 180) or not name.strip():
        raise HTTPException(400, "That isn't a valid place.")
    box = None
    try:
        b = json.loads(bbox) if bbox else None
        box = [float(x) for x in b] if b and len(b) == 4 else None
    except (ValueError, TypeError):
        pass
    store = _store()
    if not cities.exists(store, name.strip()):
        auth.limit("city-add", auth.client_ip(request), 20, 3600)
    c = cities.register(store, name.strip()[:80], country.strip()[:80], cc.strip().lower()[:3], lat, lon, box)
    return cities.public(store, c)


@router.get("/cities/{name}")
def city_get(name: str):
    store = _store()
    c = cities.get(store, name)
    if not c:
        raise HTTPException(404, "Unknown city.")
    return {**cities.public(store, c),
            "lines": [{"name": x.name, "line": [[la, lo] for lo, la in x.coords]} for x in geo.streams() if x.city == c["name"]]}


# ---------------- citizen ----------------

UPDATE_KINDS = [("Expert-verified", "verified"), ("Not confirmed", "not_confirmed"), ("Community-supported", "community"),
                ("Decision-grade", "decision"), ("More evidence requested", "mission"), ("Signed contribution", "certificate")]


def updates_for(mine: list[Report], days: int = 14, limit: int = 8) -> list[dict]:
    """What changed on a citizen's reports lately: the reason to come back. Events made by other people or by
    the engine (never the citizen's own, never the intake grading), without naming anyone."""
    since = now().timestamp() - days * 86400
    out = []
    for r in mine:
        for e in r.history:
            kind = next((k for prefix, k in UPDATE_KINDS if e.note.startswith(prefix)), None)
            try:
                when = datetime.fromisoformat(e.at).timestamp()
            except ValueError:
                continue
            if kind and e.by != r.observer and when >= since:
                out.append({"report_id": r.id, "at": e.at, "kind": kind, "text": e.note, "signs": _signs(r.indicators)})
    out.sort(key=lambda x: x["at"], reverse=True)
    return out[:limit]


@router.get("/me")
def me(request: Request):
    u = role(request, "citizen")
    store = _store()
    mine = list(reversed(store.by_observer(u["id"])))
    return {
        "name": u["name"],
        "pseudonym": u["id"],
        "demo": bool(u.get("demo")),
        "consent": store.consent(u["id"]),
        "reports": [report_json(r, exact=False) for r in mine],
        "updates": updates_for(mine),
        # what would strengthen the reports that are still open (the hint the grader wrote)
        "strengthen": [{"report_id": r.id, "hint": r.hint, "signs": _signs(r.indicators)} for r in mine
                       if r.hint and r.rung in (Rung.ASSESSED, Rung.COMMUNITY)][:3],
        "missions": [mission_json(m) for m in store.missions() if m.status == "open"],
        "counts": {"reports": len(mine),
                   "verified": sum(r.rung in (Rung.EXPERT, Rung.DECISION) for r in mine),
                   "missions": sum(1 for r in mine if r.mission_id)},
    }


@router.post("/reports")
async def submit(request: Request, lat: float = Form(...), lon: float = Form(...), accuracy: str = Form(""),
                 codes: list[str] = Form(...), description: str = Form(""), contact: str = Form(""),
                 mission_id: str = Form(""), consent: str = Form(""), photo: UploadFile | None = File(None)):
    u = role(request, "citizen")
    auth.limit("reports", u["id"], 20, 3600)
    store = _store()
    if not store.consent(u["id"]):
        if consent != "1":
            raise HTTPException(428, detail={"consent": auth.CONSENT_VERSION})
        store.save_consent(u["id"], auth.CONSENT_VERSION, now().isoformat(timespec="seconds"))
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
    if request.session.get("org") and in_scope(request, r.lat, r.lon):
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
            # one context line for the expert; never counted in the grade (see app/dipteracast.py)
            "dipteracast": ({"prediction": dipteracast.prediction(r.lat, r.lon), "note": dipteracast.INTERFACE_NOTE,
                             "counted_in_grade": False}
                            if {"mosquitoes", "stagnant-water"} & set(r.indicators) else None),
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
    _store().delete_citizen_account(u["id"])
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
    reports = [r for r in store.all() if in_scope(request, r.lat, r.lon)]
    todo = sorted([r for r in reports if r.rung in (Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY)], key=_priority)
    done = sorted([r for r in reports if r not in todo], key=lambda r: r.created_at, reverse=True)
    return {
        "todo": [report_json(r, exact=True) for r in todo],
        "done": [report_json(r, exact=True) for r in done],
        "missions": [mission_json(m) for m in store.missions() if in_scope(request, m.lat, m.lon)],
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
    scoped(request, rid)
    _act(lambda: service.verify(_store(), rid, u["id"], method, note))
    return report(request, rid)


@router.post("/reports/{rid}/reject")
def reject(request: Request, rid: str, reason: str = Form("")):
    u = role(request, "org")
    scoped(request, rid)
    _act(lambda: service.reject(_store(), rid, u["id"], reason))
    return report(request, rid)


@router.post("/reports/{rid}/mission")
def open_mission(request: Request, rid: str):
    u = role(request, "org")
    scoped(request, rid)
    _act(lambda: service.request_mission(_store(), rid, u["id"]))
    return report(request, rid)


@router.get("/reports/{rid}/fhir")
def fhir_bundle(request: Request, rid: str):
    """The gate decides: below Expert-verified this returns 403 with the gate's reason."""
    role(request, "org")
    scoped(request, rid)
    b = _act(lambda: service.export_fhir(_store(), rid))
    return JSONResponse(b, media_type="application/fhir+json")


@router.get("/export/diptera-ground-truth")
def diptera_ground_truth(request: Request, format: str = "json"):
    """Expert-verified Diptera records as labelled ground truth for DipteraCAST: json (summary + rows),
    csv, or fhir (a Bundle of OAH-profiled Observations, code #diptera). Each record passes the gate."""
    role(request, "org")
    store = _store()
    scope = [r for r in store.all() if in_scope(request, r.lat, r.lon)]
    data = dipteracast.export(scope)
    stamp = now().strftime("%Y%m%d")
    if format == "csv":
        return Response(dipteracast.csv_text(data["rows"]), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="streamproof-diptera-ground-truth-{stamp}.csv"'})
    if format == "fhir":
        keep, _ = dipteracast.eligible(scope)
        b = dipteracast.bundle(keep, {r.id: store.certificate(r.id) for r in keep})
        return JSONResponse(b, media_type="application/fhir+json",
                            headers={"Content-Disposition": f'attachment; filename="streamproof-diptera-ground-truth-{stamp}.json"'})
    if format != "json":
        raise HTTPException(400, "format must be json, csv or fhir")
    return data


@router.post("/coverage/mission")
def coverage_mission(request: Request, reach: str = Form(...)):
    """Send a community mission to a thinly observed reach of this organisation's city."""
    u = role(request, "org")
    city = u.get("city")
    streams = [s for s in geo.streams() if s.city == (city or "Coimbra")]
    return mission_json(_act(lambda: service.request_coverage_mission(_store(), reach, u["id"], streams)))


@router.get("/brief")
def river_brief(request: Request):
    u = role(request, "org")
    store = _store()
    city = u.get("city")
    scope_streams = [s for s in geo.streams() if s.city == (city or "Coimbra")]
    b = brief.build([r for r in store.all() if in_scope(request, r.lat, r.lon)],
                    [m for m in store.missions() if in_scope(request, m.lat, m.lon)], streams=scope_streams)
    stream = next((s.name for s in geo.streams() if s.city == city), None)
    area = b["area"] if city in (None, "Coimbra") else f"{stream} catchment, {city}" if stream else city
    return {
        "generated": b["generated"], "area": area, "window_days": b["window_days"], "total": b["total"],
        "counts": [{"label": k, "count": v} for k, v in b["counts"].items()],
        "rows": [{"sign": INDICATORS[row.signal.indicator].chip, "code": row.signal.indicator, "place": row.place,
                  "best_grade": row.best_grade, "confidence": row.confidence, "label": row.label,
                  "reports": len(row.signal.reports), "people": len({r.observer for r in row.signal.reports}),
                  "gaps": row.signal.gaps, "why": row.signal.why} for row in b["rows"]],
        "advisories": b["advisories"],
        "measures": [{"code": c, "sign": INDICATORS[c].chip, **m} for c, m in b["measures"].items()],
        "catalogue": {"source": catalogue.SOURCE, "about": catalogue.ABOUT},
        "missions": [mission_json(m) for m in b["missions"]],
        "coverage": {**b["coverage"], "under": [{**x, "last": x["last"].isoformat() if x["last"] else None}
                                                for x in b["coverage"]["under"]]},
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
    neg = root / "validation" / "negative-control-outcome.json"
    negative = None
    if neg.exists():
        d = json.loads(neg.read_text(encoding="utf-8"))
        res = [e.get("resource", e) for e in d.get("entry", [])]
        iss = [i for oo in res for i in oo.get("issue", []) if i["severity"] in ("fatal", "error")]
        negative = {"file": Path(next((x.get("valueString") for oo in res for x in oo.get("extension", [])
                                       if "file" in x.get("url", "")), "")).name,
                    "rejected": any("sp-obs-1" in json.dumps(i) for i in iss), "errors": len(iss)}
    return {
        "oah_map": [{"sign": code, "system": sysurl, "code": c, "display": disp,
                     "kind": "wider" if sysurl == OAH_URL else "proposed"} for code, (sysurl, c, disp) in OAH.items()],
        "negative_control": negative,
        "calibration": calibration.report(_store().all()),
        "profiles": [{"name": "StreamProofObservation", "parent": "ObservationIndicatorsOah"},
                     {"name": "StreamProofLocation", "parent": "LocationOah"},
                     {"name": "StreamProofProvenance", "parent": "Provenance"}],
        "definitions": [{"name": p.name, "url": f"/fhir/definitions/{p.name}"}
                        for p in sorted((root / "definitions").glob("*.json"))],
        "validation": {"results": results,
                       "validator": [ln.lstrip("# ") for ln in log.read_text(encoding="utf-8").splitlines()[:1]] if log.exists() else []},
        "matrix": [{"rung": _rung(r), "adds": [{"code": u, "label": permitted_use.USES[u]}
                                               for u in permitted_use.MATRIX[r]]} for r in ORDER],
        "uses": [{"code": u, "label": l} for u, l in permitted_use.USES.items()],
    }


@router.get("/share/{rid}")
def share(rid: str):
    """Public share card: signs, trust level and an area name only. No person, no coordinates."""
    r = _store().get(rid)
    if not r or r.rung in (Rung.NOT_CONFIRMED, Rung.REPORT):
        raise HTTPException(404, "This report can't be shared.")
    s = geo.snap(r.lat, r.lon)
    return {"id": r.id, "signs": _signs(r.indicators), "rung": _rung(r.rung), "grade": r.grade,
            "reported_on": r.created_at.date().isoformat(), "verified": r.rung.level >= Rung.EXPERT.level,
            "area": s.stream.name if s and s.distance_m <= 200 else "a city stream",
            "all_clear": r.indicators == ["all-clear"]}


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
