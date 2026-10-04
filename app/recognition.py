"""Stars: recognition for contributions that held up, never a competition.

Design rules (engagement without leaderboards):
- Stars are earned by evidence that was confirmed, not by volume: a burst of unchecked
  reports earns nothing, so there is no reason to spam.
- "Everything looks fine" earns the same as a problem, once confirmed.
- No one is penalised for a report that was not confirmed.
- Stars are private to the person (and printed on their certificate); there is no ranking.
"""

from .models import Mission, Report, Rung

LEVELS = [(0, "newcomer"), (1, "observer"), (3, "contributor"), (10, "stream-keeper"), (25, "river-guardian")]


def _level(stars: int) -> dict:
    current = next(name for floor, name in reversed(LEVELS) if stars >= floor)
    nxt = next(((floor, name) for floor, name in LEVELS if floor > stars), None)
    return {"level": current, "next_level": nxt[1] if nxt else None, "stars_to_next": (nxt[0] - stars) if nxt else 0}


def _city(r: Report) -> str | None:
    from . import geo
    s = geo.snap(r.lat, r.lon)
    return s.stream.city if s and s.distance_m <= 5000 else None


def citizen(pseudonym: str, reports: list[Report]) -> dict:
    mine = [r for r in reports if r.observer == pseudonym]
    confirmed = [r for r in mine if r.rung in (Rung.EXPERT, Rung.DECISION)]
    decision = [r for r in mine if r.rung == Rung.DECISION]
    mission_help = [r for r in mine if r.mission_id and r.rung.level >= Rung.ASSESSED.level]
    all_clear = [r for r in confirmed if r.indicators == ["all-clear"]]
    breakdown = [
        {"rule": "confirmed", "count": len(confirmed), "stars": len(confirmed)},
        {"rule": "decision", "count": len(decision), "stars": len(decision)},
        {"rule": "mission", "count": len(mission_help), "stars": len(mission_help)},
    ]
    stars = sum(b["stars"] for b in breakdown)
    cities = {c for c in (_city(r) for r in mine) if c}
    badges = [
        {"code": "first-report", "earned": len(mine) >= 1},
        {"code": "first-confirmed", "earned": len(confirmed) >= 1},
        {"code": "all-clear", "earned": len(all_clear) >= 1},
        {"code": "mission-helper", "earned": len(mission_help) >= 1},
        {"code": "five-confirmed", "earned": len(confirmed) >= 5},
        {"code": "two-cities", "earned": len(cities) >= 2},
    ]
    return {"stars": stars, **_level(stars), "breakdown": breakdown, "badges": badges,
            "counts": {"reports": len(mine), "confirmed": len(confirmed), "decision": len(decision),
                       "missions": len(mission_help), "all_clear": len(all_clear)}}


def reviewer(user_id: str, reports: list[Report], missions: list[Mission]) -> dict:
    """Reviewers earn stars for decisions that explain themselves to the citizen."""
    explained_verifications = sum(1 for r in reports if r.verification and r.verification.get("by") == user_id
                                  and (r.verification.get("note") or "").strip())
    rejections = sum(1 for r in reports for e in r.history if e.by == user_id and e.note.startswith("Not confirmed:"))
    verifications = sum(1 for r in reports if r.verification and r.verification.get("by") == user_id)
    opened = sum(1 for m in missions if m.created_by == user_id)
    breakdown = [
        {"rule": "explained-verification", "count": explained_verifications, "stars": explained_verifications},
        {"rule": "explained-rejection", "count": rejections, "stars": rejections},
        {"rule": "mission-opened", "count": opened, "stars": opened},
    ]
    stars = sum(b["stars"] for b in breakdown)
    decisions = verifications + rejections
    badges = [
        {"code": "first-decision", "earned": decisions >= 1},
        {"code": "ten-decisions", "earned": decisions >= 10},
        {"code": "mission-opener", "earned": opened >= 1},
        {"code": "kind-reviewer", "earned": rejections >= 1},
    ]
    return {"stars": stars, **_level(stars), "breakdown": breakdown, "badges": badges,
            "counts": {"verifications": verifications, "rejections": rejections, "missions": opened}}
