"""Refresh data/weather_<city>.json with the last 45 days of daily rainfall from Open-Meteo.

    python tools/refresh_weather.py            # all five OneAquaHealth cities
    python tools/refresh_weather.py Oslo       # one city
"""

import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
CITIES = {  # city -> (lat, lon, timezone)
    "Coimbra": (40.22, -8.41, "Europe/Lisbon"),
    "Benevento": (41.13, 14.78, "Europe/Rome"),
    "Ghent": (51.05, 3.72, "Europe/Brussels"),
    "Oslo": (59.93, 10.76, "Europe/Oslo"),
    "Toulouse": (43.62, 1.46, "Europe/Paris"),
}


def refresh(city: str) -> None:
    lat, lon, tz = CITIES[city]
    url = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
           f"&daily=precipitation_sum,temperature_2m_max&past_days=45&forecast_days=1&timezone={tz.replace('/', '%2F')}")
    with urllib.request.urlopen(url, timeout=60) as r:
        d = json.load(r)["daily"]
    out = {"place": f"{city} ({lat},{lon})",
           "source": f"Open-Meteo forecast API, past_days=45, fetched {date.today().isoformat()}",
           "license": "CC BY 4.0 Open-Meteo.com",
           "days": [{"date": t, "precip_mm": p, "tmax_c": x}
                    for t, p, x in zip(d["time"], d["precipitation_sum"], d["temperature_2m_max"])]}
    (DATA / f"weather_{city.lower()}.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"{city}: {len(out['days'])} days, last {out['days'][-1]}")


if __name__ == "__main__":
    for c in sys.argv[1:] or CITIES:
        refresh(c)
