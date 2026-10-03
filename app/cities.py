"""Any city, not only the five OneAquaHealth cities.

- Search: Photon (OpenStreetMap type-ahead), falling back to Nominatim; cities already known
  are matched locally first, so the five OAH cities work offline.
- Picking a new city registers it and fetches, in the background:
    streams  - named rivers, streams and canals inside the city, from OpenStreetMap via Nominatim
    rainfall - the last 45 days of daily rainfall from Open-Meteo (same source as the OAH cities)
  Both are cached under the data folder, so each city is fetched once.
- A city with no mapped streams still works: reports are graded without the "on a stream" points.

Data: (c) OpenStreetMap contributors, ODbL; Open-Meteo.com, CC BY 4.0.
Service policies: Nominatim and Photon allow light use (about 1 request per second, with a
User-Agent); requests here are throttled and cached.
"""

import json
import math
import os
import threading
import time
import urllib.parse
import urllib.request
from datetime import date, datetime

from . import config, context, geo

UA = {"User-Agent": "StreamProof hackathon demo (OneAquaHealth; city streams lookup)"}
NETWORK = os.environ.get("STREAMPROOF_NETWORK", "1") == "1"
STREAMS_DIR = config.DATA_DIR / "streams"
WEATHER_DIR = config.DATA_DIR / "weather"
PLACE_TYPES = ("city", "town", "village", "municipality", "borough", "suburb")
MAX_HALF_KM = 8  # streams are looked for within this distance of the centre
MAX_STREAMS = 8

# The five OneAquaHealth cities ship with the repository (data/streams.json, data/weather_*.json).
OAH = {
    "Coimbra": {"country": "Portugal", "cc": "pt", "lat": 40.2033, "lon": -8.4103},
    "Benevento": {"country": "Italy", "cc": "it", "lat": 41.1298, "lon": 14.7826},
    "Ghent": {"country": "Belgium", "cc": "be", "lat": 51.0543, "lon": 3.7174},
    "Oslo": {"country": "Norway", "cc": "no", "lat": 59.9139, "lon": 10.7522},
    "Toulouse": {"country": "France", "cc": "fr", "lat": 43.6045, "lon": 1.4440},
}

_centres: dict[str, tuple[float, float]] = {k: (v["lat"], v["lon"]) for k, v in OAH.items()}
_throttle = threading.Lock()
_last_call = [0.0]
_search_cache: dict[tuple[str, str], list[dict]] = {}


slug = geo.slug


def _get(url: str, timeout: float = 20) -> dict | list:
    if not NETWORK:
        raise OSError("network disabled")
    with _throttle:  # one request per second across all upstream services
        wait = 1.1 - (time.monotonic() - _last_call[0])
        if wait > 0:
            time.sleep(wait)
        _last_call[0] = time.monotonic()
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.load(r)


# ---------------- registry ----------------

def load(store) -> None:
    """Remember the centres of cities people added, for scoping and weather."""
    for c in store.cities():
        _centres[c["name"]] = (c["lat"], c["lon"])


def known(store) -> list[dict]:
    """The five OAH cities first, then the ones people added."""
    out = [{"name": n, **v, "oah": True, "status": "ready"} for n, v in OAH.items()]
    return out + [{**c, "oah": False} for c in store.cities() if c["name"] not in OAH]


def exists(store, name: str) -> bool:
    return name in OAH or store.city(name) is not None


def get(store, name: str) -> dict | None:
    if name in OAH:
        return {"name": name, **OAH[name], "oah": True, "status": "ready"}
    c = store.city(name)
    return {**c, "oah": False} if c else None


def city_at(lat: float, lon: float) -> str | None:
    """The city a point belongs to: the stream it's on (within 5 km), else the nearest centre within 15 km."""
    s = geo.snap(lat, lon)
    if s and s.distance_m <= 5000:
        return s.stream.city
    best = min(((geo.distance_m(lat, lon, la, lo), n) for n, (la, lo) in _centres.items()), default=None)
    return best[1] if best and best[0] <= 15_000 else None


def start_point(name: str) -> tuple[float, float] | None:
    """Where the map opens for a city: halfway along its longest stream, else the centre."""
    lines = [s for s in geo.streams() if s.city == name]
    if name == "Coimbra" and lines:  # the hero demo spot, 2.55 km above the Mondego
        s = lines[0]
        la, lo = geo.point_at(s, s.chainage[-1] - 2550)
        return round(la + 0.0001, 6), round(lo, 6)
    if lines:
        s = max(lines, key=lambda x: x.chainage[-1])
        la, lo = geo.point_at(s, s.chainage[-1] / 2)
        return round(la, 6), round(lo, 6)
    c = _centres.get(name)
    return (round(c[0], 6), round(c[1], 6)) if c else None


def public(store, c: dict) -> dict:
    lines = [s for s in geo.streams() if s.city == c["name"]]
    start = start_point(c["name"]) or (c["lat"], c["lon"])
    return {"city": c["name"], "country": c.get("country", ""), "cc": c.get("cc", ""), "oah": bool(c.get("oah")),
            "status": c.get("status", "ready"), "stream": lines[0].name if lines else None, "streams": len(lines),
            "start": [start[0], start[1]], "error": c.get("error")}


# ---------------- search ----------------

def search(store, q: str, lang: str = "en") -> list[dict]:
    q = q.strip()
    if len(q) < 2:
        return []
    ql = slug(q)
    local = [{"name": c["name"], "country": c.get("country", ""), "cc": c.get("cc", ""), "lat": c["lat"], "lon": c["lon"],
              "bbox": c.get("bbox"), "kind": "city", "known": True, "oah": c["oah"]}
             for c in known(store) if slug(c["name"]).startswith(ql)]
    key = (ql, lang)
    if key not in _search_cache:
        try:
            _search_cache[key] = _photon(q, lang)
        except (OSError, ValueError, KeyError):
            try:
                _search_cache[key] = _nominatim_city(q, lang)
            except (OSError, ValueError, KeyError):
                return local  # offline: known cities only
    seen = {(c["name"].lower(), c["cc"]) for c in local}
    remote = [r for r in _search_cache[key] if (r["name"].lower(), r["cc"]) not in seen]
    rank = {k: i for i, k in enumerate(PLACE_TYPES)}  # cities before towns before villages
    remote.sort(key=lambda r: rank.get(r["kind"], len(rank)))
    for r in remote:
        r["known"] = exists(store, r["name"])
    return (local + remote)[:10]


def _photon(q: str, lang: str) -> list[dict]:
    params = [("q", q), ("limit", "12"), ("lang", lang if lang in ("en", "de", "fr", "it") else "default")]
    params += [("osm_tag", f"place:{t}") for t in PLACE_TYPES]
    d = _get("https://photon.komoot.io/api/?" + urllib.parse.urlencode(params))
    out = []
    for f in d["features"]:
        p, (lon, lat) = f["properties"], f["geometry"]["coordinates"]
        if not p.get("name"):
            continue
        ext = p.get("extent")  # [west, north, east, south]
        out.append({"name": p["name"], "country": p.get("country", ""), "cc": (p.get("countrycode") or "").lower(),
                    "region": p.get("state", ""), "lat": lat, "lon": lon, "kind": p.get("osm_value", "place"),
                    "bbox": [ext[0], ext[3], ext[2], ext[1]] if ext else None, "oah": False})
    return out


def _nominatim_city(q: str, lang: str) -> list[dict]:
    d = _get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"q": q, "format": "jsonv2", "addressdetails": 1, "limit": 10, "featureType": "settlement", "accept-language": lang}))
    out = []
    for x in d:
        a = x.get("address", {})
        s, n, w, e = (float(v) for v in x["boundingbox"])
        out.append({"name": x.get("name") or q, "country": a.get("country", ""), "cc": a.get("country_code", ""),
                    "region": a.get("state", ""), "lat": float(x["lat"]), "lon": float(x["lon"]), "kind": x.get("type", "place"),
                    "bbox": [w, s, e, n], "oah": False})
    return out


# ---------------- registering a new city ----------------

def _box(lat: float, lon: float, bbox: list | None) -> list[float]:
    """The city's own box, capped to MAX_HALF_KM around the centre."""
    dlat = MAX_HALF_KM / 111.0
    dlon = MAX_HALF_KM / (111.0 * max(0.2, math.cos(math.radians(lat))))
    cap = [lon - dlon, lat - dlat, lon + dlon, lat + dlat]
    if not bbox:
        return [lon - dlon / 2, lat - dlat / 2, lon + dlon / 2, lat + dlat / 2]
    w, s, e, n = bbox
    return [max(w, cap[0]), max(s, cap[1]), min(e, cap[2]), min(n, cap[3])]


def register(store, name: str, country: str, cc: str, lat: float, lon: float, bbox: list | None, background: bool = True) -> dict:
    """Add a city (idempotent) and start fetching its streams and rainfall."""
    if name in OAH:
        return get(store, name)
    have = store.city(name)
    if have and have.get("cc") == cc:
        if have["status"] in ("unavailable", "no-streams"):  # try again
            have = {**have, "status": "pending"}
            store.save_city(have)
            _start(store, have, background)
        return {**store.city(name), "oah": False}
    if have:  # same name, different country: keep both apart
        name = f"{name}, {country}"
        if store.city(name):
            return {**store.city(name), "oah": False}
    c = {"name": name, "country": country, "cc": cc, "lat": round(lat, 6), "lon": round(lon, 6),
         "bbox": _box(lat, lon, bbox), "status": "pending", "added": datetime.now().isoformat(timespec="seconds")}
    store.save_city(c)
    _centres[name] = (c["lat"], c["lon"])
    _start(store, c, background)
    return {**store.city(name), "oah": False}


def _start(store, c: dict, background: bool) -> None:
    if background:
        threading.Thread(target=_fetch, args=(store, c["name"]), daemon=True).start()
    else:
        _fetch(store, c["name"])


def _fetch(store, name: str) -> None:
    c = store.city(name)
    try:
        lines = fetch_streams(name, c["bbox"])
        STREAMS_DIR.mkdir(parents=True, exist_ok=True)
        (STREAMS_DIR / f"{slug(name)}.json").write_text(json.dumps({"streams": lines}, ensure_ascii=False), encoding="utf-8")
        geo.reload()
        try:
            fetch_weather(name, c["lat"], c["lon"])
        except (OSError, ValueError, KeyError):
            pass  # rainfall is context only; grading says "no weather data" without it
        store.save_city({**c, "status": "ready" if lines else "no-streams", "streams": len(lines), "error": None})
    except (OSError, ValueError, KeyError) as e:
        store.save_city({**c, "status": "unavailable", "error": str(e)[:200]})


def fetch_streams(city: str, box: list[float]) -> list[dict]:
    """Named rivers, streams and canals inside the box, each joined into its longest line."""
    w, s, e, n = box
    ids: list[str] = []  # search finds the waterways; lookup returns their lines (search only gives a point)
    for kind in ("stream", "river", "canal"):
        d = _get("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
            {"q": kind, "format": "jsonv2", "limit": 50, "bounded": 1, "viewbox": f"{w},{n},{e},{s}"}), timeout=30)
        ids += [f"{x['osm_type'][0].upper()}{x['osm_id']}" for x in d
                if x.get("category") == "waterway" and x.get("name") and x.get("osm_type") in ("way", "relation")]
    ids = list(dict.fromkeys(ids))
    by_name: dict[str, list] = {}
    for i in range(0, len(ids), 50):
        d = _get("https://nominatim.openstreetmap.org/lookup?" + urllib.parse.urlencode(
            {"osm_ids": ",".join(ids[i:i + 50]), "format": "geojson", "polygon_geojson": 1}), timeout=30)
        for f in d["features"]:
            g, name = f["geometry"], f["properties"].get("name")
            parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"] if g["type"] == "MultiLineString" else []
            if name:
                by_name.setdefault(name, []).extend([[(round(x, 6), round(y, 6)) for x, y in part] for part in parts])
    out = []
    for nm, ways in by_name.items():
        line = _chain(_clip(ways, box))
        if len(line) < 2 or _length_m(line) < 300:
            continue
        out.append({"id": f"{slug(city)}-{slug(nm)}", "name": nm, "city": city, "flow": "upstream_to_downstream",
                    "coordinates": [list(p) for p in _thin(line)], "source": "OpenStreetMap via Nominatim",
                    "license": "ODbL, (c) OpenStreetMap contributors"})
    out.sort(key=lambda x: -_length_m([tuple(c) for c in x["coordinates"]]))
    return out[:MAX_STREAMS]


def fetch_weather(city: str, lat: float, lon: float) -> None:
    d = _get(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
             "&daily=precipitation_sum,temperature_2m_max&past_days=45&forecast_days=1&timezone=auto", timeout=30)["daily"]
    out = {"place": f"{city} ({lat},{lon})", "source": f"Open-Meteo forecast API, past_days=45, fetched {date.today().isoformat()}",
           "license": "CC BY 4.0 Open-Meteo.com",
           "days": [{"date": t, "precip_mm": p, "tmax_c": x} for t, p, x in zip(d["time"], d["precipitation_sum"], d["temperature_2m_max"])]}
    WEATHER_DIR.mkdir(parents=True, exist_ok=True)
    (WEATHER_DIR / f"weather_{slug(city)}.json").write_text(json.dumps(out), encoding="utf-8")
    context.reload()


# ---------------- line helpers (as in tools/fetch_streams.py) ----------------

def _clip(lines: list, box: list[float]) -> list:
    w, s, e, n = box
    out = []
    for line in lines:
        cur = []
        for x, y in line:
            if w <= x <= e and s <= y <= n:
                cur.append((x, y))
            elif cur:
                out.append(cur)
                cur = []
        if len(cur) > 1:
            out.append(cur)
    return [l for l in out if len(l) > 1]


def _chain(ways: list) -> list:
    best: list = []
    for start in ways:
        line, used = list(start), {id(start)}
        grew = True
        while grew:
            grew = False
            for w in ways:
                if id(w) in used:
                    continue
                if w[0] == line[-1]:
                    line += w[1:]
                    used.add(id(w))
                    grew = True
                elif w[-1] == line[0]:
                    line = w[:-1] + line
                    used.add(id(w))
                    grew = True
        if len(line) > len(best):
            best = line
    return best


def _length_m(line: list) -> float:
    return sum(geo.distance_m(a[1], a[0], b[1], b[0]) for a, b in zip(line, line[1:]))


def _thin(line: list, min_m: float = 25.0) -> list:
    out = [line[0]]
    for p in line[1:]:
        if geo.distance_m(out[-1][1], out[-1][0], p[1], p[0]) >= min_m:
            out.append(p)
    if out[-1] != line[-1]:
        out.append(line[-1])
    return out
