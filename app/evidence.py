"""The evidence graph: corroboration, expert decisions, missions and decision-grade signals.

    Report -> Assessed -> (Community-supported) -> Expert-verified -> Decision-grade
                    \\_______________________________/^
               expert verification is reachable straight from Assessed

Pure functions over lists of reports, so the rules are testable without a database.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from . import config, geo
from .grading import reliability
from .indicators import INDICATORS
from .models import Mission, Report, Rung, now

COMMUNITY_THRESHOLD = 1.0
STATUS = {
    Rung.REPORT: "Under review",
    Rung.ASSESSED: "Under review",
    Rung.COMMUNITY: "Community-supported, waiting for an expert",
    Rung.EXPERT: "Verified",
    Rung.DECISION: "Passed to partners",
    Rung.NOT_CONFIRMED: "Not confirmed",
}


class TransitionError(ValueError):
    pass


def _independent(a: Report, b: Report) -> bool:
    """Two reports count as independent only if different people made them, and they are
    spread in time or place (stops one group standing in one spot and tapping submit)."""
    if a.observer == b.observer:
        return False
    gap_min = abs((a.created_at - b.created_at).total_seconds()) / 60
    gap_m = geo.distance_m(a.lat, a.lon, b.lat, b.lon)
    return gap_min >= config.MIN_CORROBORATION_GAP_MIN or gap_m >= config.MIN_CORROBORATION_GAP_M


def _corroborations_today(observer: str, reports: list[Report], day: datetime) -> int:
    mine_today = {s.id for s in reports if s.observer == observer and s.created_at.date() == day.date()}
    return sum(1 for r in reports if r.observer != observer for sid in r.supporters if sid in mine_today)


def link_corroboration(new: Report, reports: list[Report]) -> list[str]:
    """Link `new` with earlier reports it independently agrees with. Returns ids linked.

    Rules: different observer, same sign within 500 m and 14 days, grade C or better,
    independent in time or place, at most N corroborations per account per day. Each link
    is weighted by the corroborator's track record. Support >= 1.0 lifts to Community-supported.
    """
    if new.grade in (None, "D") or "all-clear" in new.indicators:
        return []
    if _corroborations_today(new.observer, reports, new.created_at) >= config.CORROBORATIONS_PER_ACCOUNT_PER_DAY:
        new.log("evidence-engine", "Corroboration cap reached for this account today")
        return []
    linked = []
    for old in reports:
        if old.id == new.id or old.rung == Rung.NOT_CONFIRMED or old.grade in (None, "D"):
            continue
        if not set(old.indicators) & set(new.indicators):
            continue
        if abs(old.created_at - new.created_at) > timedelta(days=config.NEARBY_WINDOW_DAYS):
            continue
        if geo.distance_m(old.lat, old.lon, new.lat, new.lon) > config.NEARBY_RADIUS_M:
            continue
        if not _independent(old, new):
            continue
        others = [r for r in reports if r.id not in (old.id, new.id)]
        old.supporters[new.id] = reliability(new.observer, others)
        new.supporters[old.id] = reliability(old.observer, others)
        linked.append(old.id)
        for r in (old, new):
            if r.rung == Rung.ASSESSED and r.support >= COMMUNITY_THRESHOLD:
                r.rung = Rung.COMMUNITY
                r.status = STATUS[r.rung]
                r.log("evidence-engine", f"Community-supported (support {r.support})")
    return linked


def verify(r: Report, expert: str, method: str, note: str = "") -> Report:
    if method not in ("remote", "field"):
        raise TransitionError("method must be 'remote' or 'field'")
    if r.rung not in (Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY):
        raise TransitionError(f"cannot verify a {r.rung.label} report")
    shortcut = r.rung != Rung.COMMUNITY
    r.rung = Rung.EXPERT
    r.status = STATUS[r.rung]
    r.verification = {"by": expert, "method": method, "at": now().isoformat(timespec="seconds"), "note": note}
    r.log(expert, f"Expert-verified ({method} check)" + (" via graph shortcut, no community step" if shortcut else ""))
    return r


def reject(r: Report, expert: str, reason: str) -> Report:
    if not reason.strip():
        raise TransitionError("a rejection needs a reason the citizen can read")
    if r.rung in (Rung.EXPERT, Rung.DECISION):
        raise TransitionError("verified reports can't be rejected; open a correction instead")
    r.rung = Rung.NOT_CONFIRMED
    r.status = STATUS[r.rung]
    r.rejection = reason.strip()
    r.log(expert, f"Not confirmed: {r.rejection}")
    return r


def open_mission(r: Report, by: str, mission_id: str) -> Mission:
    """Ask nearby people for evidence where it is missing: ~400 m upstream along the stream."""
    up = geo.upstream_point(r.lat, r.lon, config.MISSION_UPSTREAM_M)
    if up is None:
        lat, lon, walked = r.lat, r.lon, 0.0
    else:
        lat, lon, walked = up
    where = f"about {walked:.0f} m upstream of the original report" if walked >= 50 else "at the reported spot"
    signs = ", ".join(INDICATORS[c].chip.lower() for c in r.indicators)
    target = {"C": "B", "D": "C"}.get(r.grade or "", "a higher grade")
    m = Mission(
        id=mission_id, report_id=r.id, indicators=list(r.indicators), lat=round(lat, 6), lon=round(lon, 6),
        radius_m=150, created_by=by, created_at=now(),
        request=(f"Evidence needed near you: check the stream {where}. Photograph the water surface, the bank and "
                 f"any {signs}. If everything looks fine, report that too: it counts the same. "
                 f"This could raise the evidence from {r.grade} to {target}."),
    )
    r.status = "Community mission open nearby"
    r.log(by, f"More evidence requested: mission {m.id}")
    return m


@dataclass
class Signal:
    """A cluster of reports of the same sign, near in space and time."""
    indicator: str
    reports: list[Report]
    center: tuple[float, float]
    expert: int = 0
    community_or_better: int = 0
    decision_grade: bool = False
    advisory: bool = False
    why: str = ""
    gaps: list[str] = field(default_factory=list)


def signals(reports: list[Report], at: datetime | None = None) -> list[Signal]:
    """Group live reports by sign and place, then apply the decision-grade threshold:
    >= 2 expert-verified, or >= 3 community-supported-or-better, of the same sign within
    500 m and 14 days. Expert-verified reports in a qualifying cluster become Decision-grade.
    Health-relevant signs at decision grade raise an advisory flag."""
    at = at or now()
    live = [r for r in reports if r.rung not in (Rung.NOT_CONFIRMED, Rung.REPORT)
            and at - r.created_at <= timedelta(days=config.NEARBY_WINDOW_DAYS)]
    out: list[Signal] = []
    for code in INDICATORS:
        if code == "all-clear":
            continue
        pool = [r for r in live if code in r.indicators]
        used: set[str] = set()
        for seed in sorted(pool, key=lambda r: -r.rung.level):
            if seed.id in used:
                continue
            members = [r for r in pool if r.id not in used
                       and geo.distance_m(seed.lat, seed.lon, r.lat, r.lon) <= config.NEARBY_RADIUS_M]
            used |= {r.id for r in members}
            lat = sum(r.lat for r in members) / len(members)
            lon = sum(r.lon for r in members) / len(members)
            s = Signal(code, members, (lat, lon))
            s.expert = sum(r.rung in (Rung.EXPERT, Rung.DECISION) for r in members)
            s.community_or_better = sum(r.rung.level >= Rung.COMMUNITY.level for r in members)
            met = s.expert >= config.ADVISORY_MIN_EXPERT or s.community_or_better >= config.ADVISORY_MIN_COMMUNITY
            if met and s.expert >= 1:
                s.decision_grade = True
                s.why = (f"{s.expert} expert-verified and {s.community_or_better} community-supported-or-better "
                         f"reports within {config.NEARBY_RADIUS_M} m and {config.NEARBY_WINDOW_DAYS} days.")
                s.advisory = INDICATORS[code].health_relevant
            elif met:
                s.gaps.append("Threshold met on community evidence; one expert verification makes it decision-grade.")
            else:
                need_e = config.ADVISORY_MIN_EXPERT - s.expert
                need_c = config.ADVISORY_MIN_COMMUNITY - s.community_or_better
                s.gaps.append(f"Needs {need_e} more expert-verified or {need_c} more community-supported report(s).")
            out.append(s)
    return out


def promote_decision_grade(reports: list[Report]) -> list[str]:
    """Move expert-verified reports in decision-grade signals to Decision-grade. Returns ids moved."""
    moved = []
    for s in signals(reports):
        if not s.decision_grade:
            continue
        for r in s.reports:
            if r.rung == Rung.EXPERT:
                r.rung = Rung.DECISION
                r.status = STATUS[r.rung]
                r.log("evidence-engine", f"Decision-grade: {s.why}")
                moved.append(r.id)
    return moved
