"""River Health Brief: what is happening, where, how sure we are, and what to do next.

Every section passes through the permitted-use gate: the signal table may show Assessed
records (labelled unverified), the advisory section only Decision-grade ones.

Suggested next steps come from the real OneAquaHealth Catalogue of Measures (app/catalogue.py).
"""

from dataclasses import dataclass
from datetime import datetime

from . import catalogue, config, geo, permitted_use
from .evidence import Signal, signals
from .indicators import INDICATORS
from .models import Mission, Report, Rung, now


@dataclass
class Row:
    signal: Signal
    place: str
    best_grade: str
    confidence: str
    label: str


MOUTHS = {"coselhas": "the Mondego"}  # streams whose downstream end we can name


def place_name(lat: float, lon: float) -> str:
    """'Ribeira de Coselhas, 2.6 km above the Mondego' / 'Akerselva, Oslo' / 'Away from a mapped stream'."""
    s = geo.snap(lat, lon)
    if not s or s.distance_m > 200:
        return "Away from a mapped stream"
    if s.stream.id in MOUTHS:
        km = (s.stream.chainage[-1] - s.chainage_m) / 1000
        return f"{s.stream.name}, {km:.1f} km above {MOUTHS[s.stream.id]}"
    return f"{s.stream.name}, {s.stream.city}"


def _place(lat: float, lon: float) -> str:
    return place_name(lat, lon)


def _confidence(s: Signal) -> str:
    if s.decision_grade:
        return "High"
    if s.expert:
        return "Moderate"
    if s.community_or_better:
        return "Building"
    return "Low"


def build(reports: list[Report], missions: list[Mission], at: datetime | None = None) -> dict:
    at = at or now()
    visible = [r for r in reports if permitted_use.check(r.rung, "org_dashboard").allowed]
    rows = []
    for s in signals(visible, at):
        grades = sorted(r.grade for r in s.reports if r.grade)
        label = "Decision-grade" if s.decision_grade else (
            "Expert-verified" if s.expert else "Community-supported" if s.community_or_better else "Unverified")
        rows.append(Row(s, _place(*s.center), grades[0] if grades else "-", _confidence(s), label))
    rows.sort(key=lambda r: (not r.signal.decision_grade, -r.signal.expert, -len(r.signal.reports)))

    advisories = []
    for row in rows:
        s = row.signal
        if not s.advisory:
            continue
        if not all(permitted_use.check(r.rung, "advisory_flag").allowed
                   for r in s.reports if r.rung in (Rung.EXPERT, Rung.DECISION)):
            continue
        advisories.append({
            "sign": INDICATORS[s.indicator].display, "place": row.place, "why": s.why,
            "text": (f"Conditions at {row.place} may warrant inspection by public-health partners "
                     f"({INDICATORS[s.indicator].display.lower()}). Advisory only; this is not a diagnosis "
                     f"or a statement about disease."),
        })

    open_missions = [m for m in missions if m.status == "open"]
    counts = {rung.label: sum(r.rung == rung for r in reports) for rung in Rung}
    return {
        "generated": at.strftime("%Y-%m-%d %H:%M"),
        "area": "Ribeira de Coselhas catchment, Coimbra",
        "window_days": config.NEARBY_WINDOW_DAYS,
        "total": len(reports),
        "counts": counts,
        "rows": rows,
        "advisories": advisories,
        "measures": {c: catalogue.for_sign(c) for c in INDICATORS if c != "all-clear"},
        "missions": open_missions,
        "threshold": (f">= {config.ADVISORY_MIN_EXPERT} expert-verified, or >= {config.ADVISORY_MIN_COMMUNITY} "
                      f"community-supported, reports of the same sign within {config.NEARBY_RADIUS_M} m and "
                      f"{config.NEARBY_WINDOW_DAYS} days (illustrative default, to be calibrated with ecologists)"),
        "indicators": INDICATORS,
    }
