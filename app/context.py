"""Weather context from real daily rainfall for each city (Open-Meteo, cached in data/)."""

import json
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from . import config
from .geo import slug

DATA = Path(__file__).resolve().parent.parent / "data"


@lru_cache(maxsize=64)
def _days(city: str) -> dict[str, float]:
    path = DATA / f"weather_{city.lower()}.json"  # the five OAH cities ship with the repo
    if not path.exists():
        path = config.DATA_DIR / "weather" / f"weather_{slug(city)}.json"  # cities people added
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {d["date"]: (d["precip_mm"] or 0.0) for d in raw["days"]}


def reload() -> None:
    _days.cache_clear()


def rain_summary(on: date, city: str = "Coimbra") -> dict | None:
    """Dry days in a row before `on`, rain in the last 2 and 7 days, for that city's rainfall.
    None if there is no data for that city and date."""
    days = _days(city)
    if not any((on - timedelta(days=k)).isoformat() in days for k in range(4)):
        return None  # data more than 3 days stale: say so rather than guess
    dry = 0
    d = on - timedelta(days=1)
    while d.isoformat() in days and days[d.isoformat()] < 1.0:
        dry += 1
        d -= timedelta(days=1)
    last2 = sum(days.get((on - timedelta(days=i)).isoformat(), 0.0) for i in range(0, 3))
    last7 = sum(days.get((on - timedelta(days=i)).isoformat(), 0.0) for i in range(0, 8))
    return {"dry_days": dry, "rain_48h_mm": round(last2, 1), "rain_7d_mm": round(last7, 1)}


# Which signs are expected after dry spells vs after rain. Coarse, explainable, and labelled as context.
DRY_FAVOURS = {"stagnant-water", "mosquitoes", "algal-scum", "odour", "dead-fish"}
RAIN_FAVOURS = {"foam", "sewage", "litter", "oil-sheen"}
