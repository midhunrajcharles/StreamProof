"""Evidence Grade A-D with visible reasons.

Rule-based on purpose: every point has a sentence a citizen or an ecologist can read and
argue with. Seven signals, 100 points. An AI photo suggestion (if configured) is shown to
the expert but never changes the grade.

    A >= 85   strong evidence
    B >= 70   good evidence
    C >= 50   needs verification
    D <  50   low confidence
A report with no photo is capped at C.
"""

from datetime import datetime

from . import config, context, geo
from .indicators import INDICATORS
from .models import Reason, Report, Rung

GRADE_BANDS = [(85, "A"), (70, "B"), (50, "C"), (0, "D")]
SAFETY_SIGNS = {"dead-fish", "sewage", "algal-scum", "oil-sheen"}
SAFETY_TEXT = ("Keep people and pets away from the water. If there is immediate risk, call 112. "
               "StreamProof is not an emergency channel.")


def _band(score: int) -> str:
    return next(g for floor, g in GRADE_BANDS if score >= floor)


def _photo(r: Report) -> Reason:
    p = r.photo
    if not p:
        return Reason("photo", "fail", "No photo. Reports without a photo stay at grade C or below.", 0, 30)
    pts, notes = 30, []
    if min(p["width"], p["height"]) < 480:
        pts -= 10
        notes.append(f"small image ({p['width']}x{p['height']})")
    if p["sharpness"] < 60:
        pts -= 15
        notes.append("looks blurry")
    if not 35 <= p["brightness"] <= 225:
        pts -= 10
        notes.append("too dark" if p["brightness"] < 35 else "overexposed")
    if not notes:
        return Reason("photo", "ok", "Photo is clear and well exposed.", pts, 30)
    return Reason("photo", "warn", "Photo usable but " + ", ".join(notes) + ".", max(pts, 0), 30)


def _photo_time(r: Report) -> Reason:
    p = r.photo
    if not p:
        return Reason("photo_time", "info", "No photo, so no capture time to check.", 0, 10)
    if not p.get("exif_time"):
        return Reason("photo_time", "warn",
                      "Photo has no capture time (common after messaging apps). Time taken from submission.", 5, 10)
    taken = datetime.fromisoformat(p["exif_time"])
    # EXIF has no timezone: compare as wall-clock with a generous margin.
    gap_h = abs((r.created_at.replace(tzinfo=None) - taken).total_seconds()) / 3600
    if gap_h <= 36:
        return Reason("photo_time", "ok", "Photo was taken at the time of the report.", 10, 10)
    return Reason("photo_time", "fail", f"Photo appears to be taken {gap_h / 24:.0f} days before the report.", 0, 10)


def _location(r: Report) -> Reason:
    a = r.gps_accuracy_m
    if a is None:
        return Reason("location", "fail", "No GPS accuracy given. Please confirm the spot on the map.", 0, 12)
    if a <= 30:
        return Reason("location", "ok", f"Location confirmed (GPS accuracy {a:.0f} m).", 12, 12)
    if a <= 100:
        return Reason("location", "warn", f"GPS accuracy is {a:.0f} m. Confirming on the map would help.", 6, 12)
    return Reason("location", "fail", f"GPS accuracy is poor ({a:.0f} m). Please confirm the spot on the map.", 0, 12)


def _stream(r: Report) -> Reason:
    s = geo.snap(r.lat, r.lon)
    if s is None or s.distance_m > 200:
        return Reason("stream", "warn", "Not next to a mapped stream. It may be a pond or an unmapped channel.", 0, 8)
    if s.distance_m <= 60:
        return Reason("stream", "ok", f"On {s.stream.name} ({s.distance_m:.0f} m from the mapped channel).", 8, 8)
    return Reason("stream", "warn", f"{s.distance_m:.0f} m from {s.stream.name}; a little far from the channel.", 4, 8)


def nearby_matches(r: Report, others: list[Report]) -> tuple[list[Report], list[Report]]:
    """Reports by other people, near in space and time, that agree or contradict."""
    agree, contradict = [], []
    for o in others:
        if o.id == r.id or o.observer == r.observer or o.rung == Rung.NOT_CONFIRMED:
            continue
        if abs((o.created_at - r.created_at).days) > config.NEARBY_WINDOW_DAYS:
            continue
        if geo.distance_m(r.lat, r.lon, o.lat, o.lon) > config.NEARBY_RADIUS_M:
            continue
        if set(o.indicators) & set(r.indicators) - {"all-clear"}:
            agree.append(o)
        elif "all-clear" in o.indicators and "all-clear" not in r.indicators \
                and abs((o.created_at - r.created_at).total_seconds()) <= 48 * 3600 \
                and geo.distance_m(r.lat, r.lon, o.lat, o.lon) <= 200:
            contradict.append(o)
        elif "all-clear" in r.indicators and "all-clear" in o.indicators:
            agree.append(o)
    return agree, contradict


def _nearby(r: Report, others: list[Report]) -> Reason:
    agree, contradict = nearby_matches(r, others)
    if contradict and not agree:
        return Reason("nearby", "warn",
                      f"{len(contradict)} nearby report(s) in the last 48 h saw nothing of concern.", 3, 20)
    if len(agree) >= 2:
        return Reason("nearby", "ok", f"{len(agree)} other people reported the same within 500 m.", 20, 20)
    if len(agree) == 1:
        return Reason("nearby", "ok", "1 other person reported the same within 500 m.", 14, 20)
    return Reason("nearby", "info", "No nearby reports yet (not a penalty for a first report).", 6, 20)


def _context(r: Report) -> Reason:
    s = geo.snap(r.lat, r.lon)
    if s is None or s.distance_m > 5000:  # not in a city we have rainfall for
        return Reason("context", "info", "No weather data for this place.", 5, 10)
    w = context.rain_summary(r.created_at.date(), s.stream.city)
    if w is None:
        return Reason("context", "info", "No weather data for this date.", 5, 10)
    codes = set(r.indicators)
    if codes & context.DRY_FAVOURS:
        if w["rain_48h_mm"] >= 10:
            return Reason("context", "warn",
                          f"{w['rain_48h_mm']} mm of rain in the last 48 h usually flushes ponded water.", 3, 10)
        if w["dry_days"] >= 3 or w["rain_7d_mm"] < 5:
            return Reason("context", "ok",
                          f"Consistent with weather: {w['rain_7d_mm']} mm of rain in 7 days.", 10, 10)
    if codes & context.RAIN_FAVOURS and w["rain_48h_mm"] >= 5:
        return Reason("context", "ok", f"Consistent with {w['rain_48h_mm']} mm of recent rain.", 10, 10)
    return Reason("context", "info", "Weather neither supports nor contradicts this sign.", 7, 10)


def track_record(observer: str, others: list[Report]) -> tuple[int, int]:
    """(confirmed, not confirmed) from the observer's earlier reports."""
    mine = [o for o in others if o.observer == observer]
    ok = sum(o.rung in (Rung.EXPERT, Rung.DECISION) for o in mine)
    bad = sum(o.rung == Rung.NOT_CONFIRMED for o in mine)
    return ok, bad


def reliability(observer: str, others: list[Report]) -> float:
    """Corroboration weight: 1.5 proven, 1.0 new, 0.5 mostly not confirmed."""
    ok, bad = track_record(observer, others)
    if ok + bad < 2:
        return 1.0
    rate = ok / (ok + bad)
    return 1.5 if rate >= 0.8 and ok >= 3 else 1.0 if rate >= 0.5 else 0.5


def _track(r: Report, others: list[Report]) -> Reason:
    ok, bad = track_record(r.observer, [o for o in others if o.id != r.id])
    if ok + bad < 2:
        return Reason("track_record", "info", "New observer: no history yet.", 5, 10)
    rate = ok / (ok + bad)
    if rate >= 0.8:
        return Reason("track_record", "ok", f"{ok} of {ok + bad} earlier reports were confirmed by an expert.", 10, 10)
    if rate >= 0.5:
        return Reason("track_record", "info", f"{ok} of {ok + bad} earlier reports were confirmed.", 6, 10)
    return Reason("track_record", "warn", f"Only {ok} of {ok + bad} earlier reports were confirmed.", 2, 10)


def _hint(reasons: list[Reason]) -> str | None:
    by = {x.signal: x for x in reasons}
    if by["photo"].status == "fail":
        return "Adding a photo would raise this report to at least grade B if the rest holds."
    if by["location"].status != "ok":
        return "Confirming the exact spot on the map would help."
    if by["nearby"].status == "info":
        return "A second photo from upstream, by you or a neighbour, would help confirm this."
    if by["photo"].status == "warn":
        return "A sharper close-up of the water would help."
    return None


def grade(r: Report, others: list[Report]) -> Report:
    """Fill grade, score, reasons, hint and safety on `r` and move it to Assessed."""
    reasons = [_photo(r), _photo_time(r), _location(r), _stream(r),
               _nearby(r, others), _context(r), _track(r, others)]
    score = sum(x.points for x in reasons)
    g = _band(score)
    if not r.photo and g in ("A", "B"):
        g = "C"
    r.reasons, r.score, r.grade = reasons, score, g
    r.hint = _hint(reasons)
    r.safety = SAFETY_TEXT if set(r.indicators) & SAFETY_SIGNS else None
    if r.rung == Rung.REPORT:
        r.rung = Rung.ASSESSED
        r.log("evidence-engine", f"Assessed: grade {g} ({score}/100)")
    return r


def describe(codes: list[str]) -> str:
    return ", ".join(INDICATORS[c].display.lower() for c in codes)
