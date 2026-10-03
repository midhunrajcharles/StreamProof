"""Small geometry helpers on WGS84 points: distances, snapping to a stream, walking upstream.

Distances use an equirectangular approximation, which is accurate to well under 1%
over the few kilometres a city stream covers.
"""

import json
import math
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from . import config

EARTH_R = 6_371_000.0
DATA = Path(__file__).resolve().parent.parent / "data" / "streams.json"
EXTRA = config.DATA_DIR / "streams"  # streams of cities people added (app/cities.py)


def slug(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "city"


def _xy(lon: float, lat: float, lat0: float) -> tuple[float, float]:
    k = math.pi / 180 * EARTH_R
    return lon * k * math.cos(math.radians(lat0)), lat * k


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat0 = (lat1 + lat2) / 2
    x1, y1 = _xy(lon1, lat1, lat0)
    x2, y2 = _xy(lon2, lat2, lat0)
    return math.hypot(x2 - x1, y2 - y1)


def coarsen(lat: float, lon: float, decimals: int = 3) -> tuple[float, float]:
    """About 100 m at 3 decimals. Public cards and FHIR Location use this, never exact GPS."""
    return round(lat, decimals), round(lon, decimals)


@dataclass(frozen=True)
class Stream:
    id: str
    name: str
    city: str
    coords: tuple[tuple[float, float], ...]  # (lon, lat), ordered upstream -> downstream

    @property
    def chainage(self) -> list[float]:
        """Cumulative distance from the upstream end, metres, for each vertex."""
        out = [0.0]
        for (lo1, la1), (lo2, la2) in zip(self.coords, self.coords[1:]):
            out.append(out[-1] + distance_m(la1, lo1, la2, lo2))
        return out


@dataclass(frozen=True)
class Snap:
    stream: Stream
    distance_m: float  # from the point to the stream line
    chainage_m: float  # position along the stream from its upstream end
    lat: float
    lon: float


@lru_cache(maxsize=1)
def streams() -> tuple[Stream, ...]:
    """The five OAH cities' streams (data/streams.json), then those of cities people added."""
    raw = json.loads(DATA.read_text(encoding="utf-8"))["streams"]
    if EXTRA.exists():
        for f in sorted(EXTRA.glob("*.json")):
            raw += json.loads(f.read_text(encoding="utf-8"))["streams"]
    return tuple(
        Stream(s["id"], s["name"], s["city"], tuple((c[0], c[1]) for c in s["coordinates"]))
        for s in raw
    )


def reload() -> None:
    streams.cache_clear()


def snap(lat: float, lon: float) -> Snap | None:
    """Nearest point on any known stream."""
    best: Snap | None = None
    for s in streams():
        ch = s.chainage
        for i, ((lo1, la1), (lo2, la2)) in enumerate(zip(s.coords, s.coords[1:])):
            x1, y1 = _xy(lo1, la1, lat)
            x2, y2 = _xy(lo2, la2, lat)
            px, py = _xy(lon, lat, lat)
            dx, dy = x2 - x1, y2 - y1
            seg2 = dx * dx + dy * dy
            t = 0.0 if seg2 == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / seg2))
            qx, qy = x1 + t * dx, y1 + t * dy
            d = math.hypot(px - qx, py - qy)
            if best is None or d < best.distance_m:
                best = Snap(s, d, ch[i] + t * (ch[i + 1] - ch[i]),
                            la1 + t * (la2 - la1), lo1 + t * (lo2 - lo1))
    return best


def point_at(stream: Stream, chainage_m: float) -> tuple[float, float]:
    """(lat, lon) at a distance along the stream, clamped to its ends."""
    ch = stream.chainage
    target = max(0.0, min(chainage_m, ch[-1]))
    for i in range(len(ch) - 1):
        if ch[i + 1] >= target:
            seg = ch[i + 1] - ch[i]
            t = 0.0 if seg == 0 else (target - ch[i]) / seg
            (lo1, la1), (lo2, la2) = stream.coords[i], stream.coords[i + 1]
            return la1 + t * (la2 - la1), lo1 + t * (lo2 - lo1)
    lo, la = stream.coords[-1]
    return la, lo


def upstream_point(lat: float, lon: float, metres: float = 400.0) -> tuple[float, float, float] | None:
    """Walk `metres` upstream along the stream from the snapped position.

    Returns (lat, lon, metres actually walked), or None if the point is not near a stream.
    """
    s = snap(lat, lon)
    if s is None:
        return None
    target = max(0.0, s.chainage_m - metres)
    la, lo = point_at(s.stream, target)
    return la, lo, s.chainage_m - target
