"""Use cases. Each one loads the reports it needs, applies the engine rules, and saves."""

from datetime import datetime

from . import config, evidence, fhir, grading, imaging, permitted_use, signing
from .indicators import validate_codes
from .models import Mission, Report, Rung, now
from .store import Store


class ServiceError(ValueError):
    pass


def new_report_id(store: Store) -> str:
    return f"SP-{store.next_id('report', 1001)}"


def submit(store: Store, observer: str, codes: list[str], lat: float, lon: float, accuracy: float | None,
           photo_bytes: bytes | None = None, description: str = "", contact: str = "",
           mission_id: str | None = None, created_at: datetime | None = None,
           photo_metrics: dict | None = None) -> Report:
    try:
        codes = validate_codes(codes)
    except (ValueError, KeyError) as e:
        raise ServiceError(str(e)) from e
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ServiceError("location is out of range")
    others = store.all()
    r = Report(new_report_id(store), observer, created_at or now(), codes, lat, lon, accuracy,
               description=description.strip()[:500], mission_id=mission_id)
    if photo_bytes:
        try:
            r.photo = imaging.analyse(photo_bytes).to_dict()
        except Exception as e:  # not an image
            raise ServiceError("that file isn't a readable photo") from e
        config.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
        name = f"{r.id}.jpg"
        (config.MEDIA_DIR / name).write_bytes(imaging.strip_metadata(photo_bytes))
        r.photo_file = name
    elif photo_metrics:
        r.photo = photo_metrics
    r.log(observer, "Report submitted")
    grading.grade(r, others)
    linked = evidence.link_corroboration(r, others)
    if mission_id:
        m = store.mission(mission_id)
        if m:
            m.submissions.append(r.id)
            store.save_mission(m)
            r.log("evidence-engine", f"Submitted for mission {mission_id}")
    if created_at is not None:  # backfilled (seed/import): stamp intake events with the report time
        for e in r.history:
            e.at = created_at.isoformat(timespec="seconds")
    for o in others:
        if o.id in linked:
            store.save(o)
    store.save(r, contact=contact.strip()[:200])
    return r


def verify(store: Store, rid: str, expert: str, method: str, note: str = "") -> Report:
    reports = store.all()
    r = next((x for x in reports if x.id == rid), None)
    if r is None:
        raise ServiceError("no such report")
    try:
        evidence.verify(r, expert, method, note)
    except evidence.TransitionError as e:
        raise ServiceError(str(e)) from e
    evidence.promote_decision_grade(reports)
    store.save_all(reports)
    for x in reports:
        if x.rung in (Rung.EXPERT, Rung.DECISION) and not store.certificate(x.id):
            issue_certificate(store, x)
    return store.get(rid)


def reject(store: Store, rid: str, expert: str, reason: str) -> Report:
    r = store.get(rid)
    if r is None:
        raise ServiceError("no such report")
    try:
        evidence.reject(r, expert, reason)
    except evidence.TransitionError as e:
        raise ServiceError(str(e)) from e
    store.save(r)
    return r


def request_mission(store: Store, rid: str, expert: str) -> Mission:
    r = store.get(rid)
    if r is None:
        raise ServiceError("no such report")
    permitted_use.require(r.rung, "mission")
    m = evidence.open_mission(r, expert, f"M-{store.next_id('mission', 11)}")
    store.save_mission(m)
    store.save(r)
    return m


def issue_certificate(store: Store, r: Report) -> dict:
    permitted_use.require(r.rung, "recognition")
    record = signing.deidentified(r)
    signed = signing.sign(record)
    cert = {"record": record, **signed, "issued": now().isoformat(timespec="seconds")}
    store.save_certificate(r.id, cert)
    r.log(config.ORG_NAME, "Signed contribution record issued")
    store.save(r)
    return cert


def export_fhir(store: Store, rid: str) -> dict:
    r = store.get(rid)
    if r is None:
        raise ServiceError("no such report")
    cert = store.certificate(rid)
    return fhir.bundle(r, cert)  # raises permitted_use.Blocked below Expert-verified


def forget(store: Store, observer: str) -> int:
    return store.forget_observer(observer)
