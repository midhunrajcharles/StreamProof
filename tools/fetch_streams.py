"""Add one urban stream per OneAquaHealth city to data/streams.json, from OpenStreetMap.

    python tools/fetch_streams.py

Geometry comes from Nominatim (OpenStreetMap's search service, which returns each
matching waterway's line), clipped to a box around the city and joined in flow order.
The streams for Benevento, Ghent, Oslo and Toulouse are example urban streams chosen
for the demo, not OneAquaHealth study sites. Coimbra's Ribeira de Coselhas (the hero
demo) is kept as it is.
Data: (c) OpenStreetMap contributors, ODbL. Nominatim usage policy: 1 request/second.
"""

import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "streams.json"
UA = {"User-Agent": "StreamProof hackathon demo (stream geometry for 5 cities)"}

# city -> (stream id, display name, search text or OSM relation "R<id>", box west, south, east, north)
CITIES = {
    "Benevento": ("sabato-benevento", "Sabato", "R2570008", 14.72, 41.10, 14.80, 41.16),
    "Ghent": ("leie-gent", "Leie", "R1201127", 3.66, 51.03, 3.73, 51.06),
    "Oslo": ("akerselva", "Akerselva", "Akerselva", 10.74, 59.90, 10.77, 59.95),
    "Toulouse": ("hers-mort-toulouse", "Hers-Mort", "R1143595", 1.43, 43.57, 1.50, 43.67),
}


def nominatim(q: str, box: tuple) -> list:
    w, s, e, n = box
    if q.startswith("R") and q[1:].isdigit():  # a whole river relation; clipped to the city below
        url = "https://nominatim.openstreetmap.org/lookup?" + urllib.parse.urlencode(
            {"osm_ids": q, "format": "geojson", "polygon_geojson": 1})
    else:
        params = {"q": q, "format": "geojson", "polygon_geojson": 1, "limit": 50, "bounded": 1, "viewbox": f"{w},{n},{e},{s}"}
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        feats = json.load(r)["features"]
    time.sleep(1.1)
    lines = []
    for f in feats:
        if f["properties"].get("category") != "waterway":
            continue
        g = f["geometry"]
        parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"] if g["type"] == "MultiLineString" else []
        lines += [[(round(x, 7), round(y, 7)) for x, y in p] for p in parts]
    return lines


def clip(lines: list, box: tuple) -> list:
    """Keep only the parts of each line inside the box (splitting where it leaves)."""
    w, s, e, n = box
    out = []
    for line in lines:
        cur = []
        for x, y in line:
            if w <= x <= e and s <= y <= n:
                cur.append((x, y))
            elif cur:
                out.append(cur); cur = []
        if len(cur) > 1:
            out.append(cur)
    return [l for l in out if len(l) > 1]


def chain(ways: list) -> list:
    """Join lines (each in flow direction) into the longest connected line."""
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
                    line += w[1:]; used.add(id(w)); grew = True
                elif w[-1] == line[0]:
                    line = w[:-1] + line; used.add(id(w)); grew = True
        if len(line) > len(best):
            best = line
    return best


def length_m(line: list) -> float:
    return sum(math.hypot((b[0] - a[0]) * 111_320 * math.cos(math.radians(a[1])), (b[1] - a[1]) * 110_540)
               for a, b in zip(line, line[1:]))


def thin(line: list, min_m: float = 25.0) -> list:
    out = [line[0]]
    for p in line[1:]:
        if length_m([out[-1], p]) >= min_m:
            out.append(p)
    if out[-1] != line[-1]:
        out.append(line[-1])
    return out


def main() -> None:
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    keep = [s for s in doc["streams"] if s["city"] == "Coimbra"]
    for city, (sid, name, q, *box) in CITIES.items():
        line = chain(clip(nominatim(q, tuple(box)), tuple(box)))
        if len(line) < 2:
            print("nothing usable for", city)
            continue
        line = thin(line)
        keep.append({"id": sid, "name": name, "city": city, "flow": "upstream_to_downstream",
                     "coordinates": [list(p) for p in line],
                     "source": f"OpenStreetMap via Nominatim ({q}), clipped to the city", "license": "ODbL, (c) OpenStreetMap contributors",
                     "note": "Example urban stream for the demo, not a OneAquaHealth study site."})
        print(f"{city}: {name}, {len(line)} points, {length_m(line) / 1000:.1f} km")
    doc["streams"] = keep
    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
