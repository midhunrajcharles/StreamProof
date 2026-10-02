"""Refresh data/weather_coimbra.json with the last 45 days of daily rainfall from Open-Meteo.

    python tools/refresh_weather.py
"""

import json
import urllib.request
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "weather_coimbra.json"
URL = ("https://api.open-meteo.com/v1/forecast?latitude=40.22&longitude=-8.41"
       "&daily=precipitation_sum,temperature_2m_max&past_days=45&forecast_days=1&timezone=Europe%2FLisbon")


def main() -> None:
    with urllib.request.urlopen(URL, timeout=60) as r:
        d = json.load(r)["daily"]
    out = {"place": "Coimbra (40.22,-8.41)",
           "source": f"Open-Meteo forecast API, past_days=45, fetched {date.today().isoformat()}",
           "license": "CC BY 4.0 Open-Meteo.com",
           "days": [{"date": t, "precip_mm": p, "tmax_c": x}
                    for t, p, x in zip(d["time"], d["precipitation_sum"], d["temperature_2m_max"])]}
    OUT.write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"{len(out['days'])} days, last {out['days'][-1]}")


if __name__ == "__main__":
    main()
