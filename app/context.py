"""Weather context from real daily rainfall for the city (Open-Meteo, cached in data/)."""

import json
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "weather_coimbra.json"


@lru_cache(maxsize=1)
def _days() -> dict[str, float]:
    raw = json.loads(DATA.read_text(encoding="utf-8"))
    return {d["date"]: (d["precip_mm"] or 0.0) for d in raw["days"]}


def rain_summary(on: date) -> dict | None:
    """Dry days in a row before `on`, rain in the last 2 and 7 days. None if no data for that date."""
    days = _days()
    if on.isoformat() not in days and (on - timedelta(days=1)).isoformat() not in days:
        return None
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
