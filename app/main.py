"""StreamProof web app: a citizen PWA and an organization review portal.

    uvicorn app.main:app --reload
"""

import json
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware

from . import brief, certificate, config, evidence, geo, grading, permitted_use, seed, service, signing
from .indicators import INDICATORS
from .models import Rung
from .store import Store

HERE = Path(__file__).resolve().parent
MAX_UPLOAD = 15 * 1024 * 1024

app = FastAPI(title="StreamProof", docs_url=None, redoc_url=None)
app.add_middleware(SessionMiddleware, secret_key=config.SESSION_SECRET, same_site="lax", https_only=False)
app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")
app.mount("/fhir/definitions", StaticFiles(directory=config.ROOT / "fhir" / "definitions"), name="fhirdefs")
templates = Jinja2Templates(directory=HERE / "templates")
templates.env.globals.update(INDICATORS=INDICATORS, Rung=Rung)

store = Store()
if not store.all():
    seed.run(store)


def ctx(request: Request, **kw) -> dict:
    return {"request": request, "user": request.session.get("user"), "Rung": Rung, "INDICATORS": INDICATORS,
            "display": store.observer_display, **kw}


def need(request: Request, role: str) -> dict:
    u = request.session.get("user")
    if not u or u["role"] != role:
        raise HTTPException(303, headers={"Location": f"/login?next={request.url.path}"})
    return u


def stream_geojson() -> list:
    return [[[la, lo] for lo, la in s.coords] for s in geo.streams()]


# ---------------- auth (demo: two fixed accounts, no passwords) ----------------

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    u = request.session.get("user")
    if u:
        return RedirectResponse("/c" if u["role"] == "citizen" else "/o", 303)
    return RedirectResponse("/login", 303)


@app.get("/login", response_class=HTMLResponse)
def login_page(request: Request, next: str = ""):
    return templates.TemplateResponse(request, "login.html", ctx(request, next=next))


@app.post("/login")
def login(request: Request, role: str = Form(...), next: str = Form("")):
    if role == "citizen":
        request.session["user"] = {"role": "citizen", "id": seed.DEMO_CITIZEN[0], "name": seed.DEMO_CITIZEN[1]}
        dest = next if next.startswith("/c") else "/c"
    elif role == "org":
        request.session["user"] = {"role": "org", "id": seed.DEMO_EXPERT, "name": "Reviewer (demo)"}
        dest = next if next.startswith("/o") else "/o"
    else:
        raise HTTPException(400, "unknown role")
    return RedirectResponse(dest, 303)


@app.get("/logout")
def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login", 303)


@app.post("/demo/reset")
def demo_reset(request: Request):
    need(request, "org")
    seed.run(store)
    return RedirectResponse("/o", 303)


# ---------------- citizen ----------------

@app.get("/c", response_class=HTMLResponse)
def citizen_home(request: Request):
    u = need(request, "citizen")
    mine = list(reversed(store.by_observer(u["id"])))
    missions = [m for m in store.missions() if m.status == "open"]
    verified = [r for r in mine if r.rung in (Rung.EXPERT, Rung.DECISION)]
    return templates.TemplateResponse(request, "citizen_home.html", ctx(request, mine=mine, missions=missions, verified=verified,
        missions_done=sum(1 for r in mine if r.mission_id)))


@app.get("/c/report", response_class=HTMLResponse)
def report_form(request: Request, mission: str = ""):
    need(request, "citizen")
    m = store.mission(mission) if mission else None
    return templates.TemplateResponse(request, "report_form.html", ctx(request, mission=m, streams=stream_geojson(), consented=request.session.get("consented", False)))


@app.post("/c/report")
async def report_submit(request: Request, lat: float = Form(...), lon: float = Form(...),
                        accuracy: str = Form(""), codes: list[str] = Form(...), description: str = Form(""),
                        contact: str = Form(""), mission_id: str = Form(""), photo: UploadFile | None = File(None)):
    u = need(request, "citizen")
    data = None
    if photo is not None and photo.filename:
        data = await photo.read(MAX_UPLOAD + 1)
        if len(data) > MAX_UPLOAD:
            raise HTTPException(413, "photo is larger than 15 MB")
    acc = float(accuracy) if accuracy.strip() else None
    try:
        r = service.submit(store, u["id"], codes, lat, lon, acc, data, description, contact, mission_id or None)
    except service.ServiceError as e:
        raise HTTPException(400, str(e))
    request.session["consented"] = True
    return RedirectResponse(f"/c/r/{r.id}?new=1", 303)


@app.get("/c/r/{rid}", response_class=HTMLResponse)
def report_card(request: Request, rid: str, new: int = 0):
    u = need(request, "citizen")
    r = store.get(rid)
    if not r or r.observer != u["id"]:
        raise HTTPException(404)
    return templates.TemplateResponse(request, "report_card.html", ctx(request, r=r, new=new, cert=store.certificate(rid), uses=permitted_use.allowed_uses(r.rung)))


@app.get("/c/r/{rid}/certificate.pdf")
def certificate_pdf(request: Request, rid: str):
    u = need(request, "citizen")
    r = store.get(rid)
    cert = store.certificate(rid)
    if not r or r.observer != u["id"] or not cert:
        raise HTTPException(404)
    pdf = certificate.pdf(u["name"], cert["record"], cert, str(request.url_for("verify_page", rid=rid)))
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="streamproof-{rid}.pdf"'})


@app.get("/c/missions/{mid}", response_class=HTMLResponse)
def mission_page(request: Request, mid: str):
    need(request, "citizen")
    m = store.mission(mid)
    if not m:
        raise HTTPException(404)
    return templates.TemplateResponse(request, "mission.html", ctx(request, m=m, streams=stream_geojson()))


@app.post("/c/forget")
def forget_me(request: Request):
    u = need(request, "citizen")
    n = service.forget(store, u["id"])
    request.session.clear()
    return HTMLResponse(f"<p style='font-family:sans-serif;padding:2rem'>Your contact details and exact locations "
                        f"were removed from {n} report(s). The de-identified evidence and its signatures remain "
                        f"valid. <a href='/login'>Back</a></p>")


# ---------------- public ----------------

@app.get("/share/{rid}", response_class=HTMLResponse)
def share_card(request: Request, rid: str):
    r = store.get(rid)
    if not r or r.rung == Rung.NOT_CONFIRMED:
        raise HTTPException(404)
    s = geo.snap(r.lat, r.lon)
    area = s.stream.name if s and s.distance_m <= 200 else "a city stream"
    return templates.TemplateResponse(request, "share.html", ctx(request, r=r, area=area))


@app.get("/verify/{rid}", response_class=HTMLResponse, name="verify_page")
def verify_page(request: Request, rid: str):
    cert = store.certificate(rid)
    if not cert:
        raise HTTPException(404)
    ok, msg = signing.verify(cert["record"], cert["sha256"], cert["signature"], cert["public_key"])
    return templates.TemplateResponse(request, "verify.html", ctx(request, rid=rid, cert=cert, ok=ok, msg=msg, record_json=json.dumps(cert["record"], indent=2)))


@app.post("/verify/{rid}", response_class=HTMLResponse)
def verify_edited(request: Request, rid: str, record_json: str = Form(...)):
    cert = store.certificate(rid)
    if not cert:
        raise HTTPException(404)
    try:
        rec = json.loads(record_json)
        ok, msg = signing.verify(rec, cert["sha256"], cert["signature"], cert["public_key"])
    except (ValueError, TypeError):
        ok, msg = False, "That isn't valid JSON."
    return templates.TemplateResponse(request, "verify.html", ctx(request, rid=rid, cert=cert, ok=ok, msg=msg, record_json=record_json, edited=True))


@app.get("/media/{name}")
def media(request: Request, name: str):
    u = request.session.get("user")
    path = (config.MEDIA_DIR / name).resolve()
    if not u or path.parent != config.MEDIA_DIR.resolve() or not path.exists():
        raise HTTPException(404)
    rid = name.rsplit(".", 1)[0]
    r = store.get(rid)
    if u["role"] == "citizen" and (not r or r.observer != u["id"]):
        raise HTTPException(404)
    return FileResponse(path, media_type="image/jpeg")


# ---------------- organization portal ----------------

PRIORITY = {"dead-fish": 5, "sewage": 4, "algal-scum": 4, "oil-sheen": 4, "mosquitoes": 3, "stagnant-water": 3}


def _priority(r) -> tuple:
    health = max((PRIORITY.get(c, 1) for c in r.indicators), default=1)
    return (r.rung.level >= Rung.EXPERT.level, -health, r.created_at.timestamp() * -1)


@app.get("/o", response_class=HTMLResponse)
def org_queue(request: Request):
    need(request, "org")
    reports = store.all()
    queue = sorted([r for r in reports if r.rung in (Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY)], key=_priority)
    done = sorted([r for r in reports if r not in queue], key=lambda r: r.created_at, reverse=True)
    pins = [{"id": r.id, "lat": round(r.lat, 5), "lon": round(r.lon, 5), "rung": r.rung.value, "grade": r.grade,
             "signs": ", ".join(INDICATORS[c].chip for c in r.indicators)} for r in reports]
    sig = [s for s in evidence.signals(reports)]
    return templates.TemplateResponse(request, "org_queue.html", ctx(request, queue=queue, done=done, pins=pins, streams=stream_geojson(), missions=store.missions(),
        signals=sig))


@app.get("/o/r/{rid}", response_class=HTMLResponse)
def org_report(request: Request, rid: str, blocked: str = "", msg: str = ""):
    need(request, "org")
    reports = store.all()
    r = next((x for x in reports if x.id == rid), None)
    if not r:
        raise HTTPException(404)
    agree, contradict = grading.nearby_matches(r, reports)
    ok, bad = grading.track_record(r.observer, [x for x in reports if x.id != r.id])
    gate = [permitted_use.check(r.rung, u) for u in permitted_use.USES]
    s = geo.snap(r.lat, r.lon)
    return templates.TemplateResponse(request, "org_report.html", ctx(request, r=r, agree=agree, contradict=contradict, track=(ok, bad), gate=gate, blocked=blocked, msg=msg,
        cert=store.certificate(rid), snap=s, streams=stream_geojson(),
        mission=next((m for m in store.missions() if m.report_id == rid), None)))


@app.post("/o/r/{rid}/verify")
def org_verify(request: Request, rid: str, method: str = Form(...), note: str = Form("")):
    u = need(request, "org")
    try:
        service.verify(store, rid, u["id"], method, note)
    except service.ServiceError as e:
        return RedirectResponse(f"/o/r/{rid}?msg={e}", 303)
    return RedirectResponse(f"/o/r/{rid}?msg=Verified", 303)


@app.post("/o/r/{rid}/reject")
def org_reject(request: Request, rid: str, reason: str = Form("")):
    u = need(request, "org")
    try:
        service.reject(store, rid, u["id"], reason)
    except service.ServiceError as e:
        return RedirectResponse(f"/o/r/{rid}?msg={e}", 303)
    return RedirectResponse(f"/o/r/{rid}?msg=Marked not confirmed", 303)


@app.post("/o/r/{rid}/mission")
def org_mission(request: Request, rid: str):
    u = need(request, "org")
    m = service.request_mission(store, rid, u["id"])
    return RedirectResponse(f"/o/r/{rid}?msg=Mission {m.id} opened", 303)


@app.get("/o/r/{rid}/fhir")
def org_fhir(request: Request, rid: str, download: int = 0):
    need(request, "org")
    try:
        b = service.export_fhir(store, rid)
    except permitted_use.Blocked as e:
        return RedirectResponse(f"/o/r/{rid}?blocked={e.decision.reason}", 303)
    except service.ServiceError:
        raise HTTPException(404)
    headers = {"Content-Disposition": f'attachment; filename="Bundle-{rid}.json"'} if download else {}
    return JSONResponse(b, media_type="application/fhir+json", headers=headers)


@app.get("/o/brief", response_class=HTMLResponse)
def org_brief(request: Request):
    need(request, "org")
    return templates.TemplateResponse(request, "brief.html", ctx(request, b=brief.build(store.all(), store.missions())))


@app.get("/o/matrix", response_class=HTMLResponse)
def org_matrix(request: Request):
    need(request, "org")
    return templates.TemplateResponse(request, "matrix.html", ctx(request, rows=permitted_use.table(), uses=permitted_use.USES, matrix=permitted_use.MATRIX,
        order=[Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY, Rung.EXPERT, Rung.DECISION],
        allowed=permitted_use.allowed_uses, threshold=brief.build([], [])["threshold"]))


@app.get("/o/standards", response_class=HTMLResponse)
def org_standards(request: Request):
    need(request, "org")
    out = config.ROOT / "fhir" / "validation" / "validation-outcome.json"
    results = []
    if out.exists():
        d = json.loads(out.read_text(encoding="utf-8"))
        for e in d.get("entry", [d]):
            oo = e.get("resource", e)
            f = next((x.get("valueString") for x in oo.get("extension", []) if "file" in x.get("url", "")), "")
            iss = oo.get("issue", [])
            results.append({"file": Path(f).name, **{s: sum(i["severity"] == s for i in iss)
                                                     for s in ("fatal", "error", "warning")},
                            "text": "; ".join(i.get("details", {}).get("text", "") for i in iss[:2])})
    log = config.ROOT / "fhir" / "validation" / "validator-output.txt"
    head = log.read_text(encoding="utf-8").splitlines()[:2] if log.exists() else []
    defs = sorted(p.name for p in (config.ROOT / "fhir" / "definitions").glob("*.json"))
    return templates.TemplateResponse(request, "standards.html", ctx(request, results=results, head=head, defs=defs))
