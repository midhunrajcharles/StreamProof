"""Where nobody has looked: the equity line of the River Health Brief.

Evidence that only follows busy, well-walked paths gives a city a skewed picture. This splits each mapped
stream into reaches of `COVERAGE_REACH_M` and counts, per reach, how many different people reported in the
last `COVERAGE_WINDOW_DAYS`. A reach nobody reported on is "no reports", one person is "thin"; both are
shown as under-observed, and an organisation can send a community mission there.

A reach is a stretch of the mapped stream, not a neighbourhood: StreamProof holds no demographic data, so
it can show where evidence is thin but not who lives there.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from . import config, geo
from .models import Mission, Report, now

MOUTHS = {"coselhas": "the Mondego"}  # streams whose downstream end we can name
MIN_REACH_M = 100  # ignore a tiny tail left over at the downstream end


@dataclass
class Reach:
    id: str  # "<stream id>:<index>"
    stream: geo.Stream
    index: int
    start_m: float
    end_m: float

    @property
    def mid(self) -> tuple[float, float]:
        return geo.point_at(self.stream, (self.start_m + self.end_m) / 2)

    @property
    def label(self) -> str:
        total = self.stream.chainage[-1]
        if self.stream.id in MOUTHS:
            return (f"{self.stream.name}, {(total - self.end_m) / 1000:.1f} to {(total - self.start_m) / 1000:.1f} km "
                    f"above {MOUTHS[self.stream.id]}")
        return f"{self.stream.name}, {self.start_m / 1000:.1f} to {self.end_m / 1000:.1f} km from its upstream end"


def reaches(stream: geo.Stream) -> list[Reach]:
    total = stream.chainage[-1]
    out, i, start = [], 0, 0.0
    while start < total:
        end = min(start + config.COVERAGE_REACH_M, total)
        if end - start >= MIN_REACH_M:
            out.append(Reach(f"{stream.id}:{i}", stream, i, start, end))
        i, start = i + 1, start + config.COVERAGE_REACH_M
    return out


def reach_of(r_lat: float, r_lon: float) -> str | None:
    """Reach id for a point on (or within 200 m of) a mapped stream, else None."""
    s = geo.snap(r_lat, r_lon)
    if s is None or s.distance_m > 200:
        return None
    return f"{s.stream.id}:{int(s.chainage_m // config.COVERAGE_REACH_M)}"


def find(reach_id: str, streams: list[geo.Stream]) -> Reach | None:
    sid, _, idx = reach_id.partition(":")
    for s in streams:
        if s.id == sid:
            return next((r for r in reaches(s) if str(r.index) == idx), None)
    return None


def _status(people: int) -> str:
    return "none" if people == 0 else "thin" if people < config.COVERAGE_MIN_PEOPLE else "ok"


def build(streams: list[geo.Stream], reports: list[Report], missions: list[Mission],
          at: datetime | None = None) -> dict:
    """Coverage of the given streams: every reach with its status, and the under-observed ones first."""
    at = at or now()
    since = at - timedelta(days=config.COVERAGE_WINDOW_DAYS)
    seen: dict[str, list[Report]] = {}
    for r in reports:
        if r.created_at < since:
            continue
        rid = reach_of(r.lat, r.lon)
        if rid:
            seen.setdefault(rid, []).append(r)
    open_cov = [m for m in missions if m.kind == "coverage" and m.status == "open"]
    rows = []
    for s in streams:
        for reach in reaches(s):
            here = seen.get(reach.id, [])
            people = len({r.observer for r in here})
            lat, lon = reach.mid
            mission = next((m.id for m in open_cov if geo.distance_m(lat, lon, m.lat, m.lon) <= 300), None)
            rows.append({"id": reach.id, "label": reach.label, "status": _status(people), "reports": len(here),
                         "people": people, "last": max((r.created_at for r in here), default=None),
                         "mission": mission, "start_m": reach.start_m, "stream": s.name})
    under = [x for x in rows if x["status"] != "ok"]
    under.sort(key=lambda x: (x["status"] != "none", x["stream"], x["start_m"]))
    return {"reach_m": config.COVERAGE_REACH_M, "window_days": config.COVERAGE_WINDOW_DAYS,
            "min_people": config.COVERAGE_MIN_PEOPLE, "total": len(rows), "covered": len(rows) - len(under),
            "none": sum(x["status"] == "none" for x in rows), "thin": sum(x["status"] == "thin" for x in rows),
            "under": under}


def mission_for(reach: Reach, by: str, mission_id: str) -> Mission:
    lat, lon = reach.mid
    request = (f"Few people have looked at this stretch lately ({reach.label}). If it is safe to walk, photograph "
               f"the water surface, the bank and anything unusual. If everything looks fine, report that too: it "
               f"counts the same, and it helps the city see the whole stream, not only the busy parts.")
    return Mission(id=mission_id, report_id="", indicators=[], lat=round(lat, 6), lon=round(lon, 6),
                   radius_m=config.COVERAGE_REACH_M // 2, request=request, created_by=by, created_at=now(),
                   kind="coverage")
