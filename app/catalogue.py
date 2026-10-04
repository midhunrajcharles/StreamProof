"""The OneAquaHealth Catalogue of Measures, as the brief uses it.

`data/measures-oah.json` maps each citizen sign to entries of the real Catalogue (D2.4, Dias, Serra and
Feio, 2025, CC BY 4.0, doi:10.5281/zenodo.20040211): the measure's own number and title, the Catalogue's
own grouping and "line" (first = essential, second = structural, third = social), the printed page, a
short paraphrase of what it does and of its stated limitations. Where the Catalogue is silent on a sign
the entry says so (`inferred`) instead of inventing a measure. First-response checks are kept apart: the
Catalogue is about rehabilitation, not emergency response.

The file is checked when this module loads (every sign is covered, every id exists), and by
tests/test_catalogue.py against the Catalogue text itself when it is available locally.
"""

import json

from . import config
from .indicators import INDICATORS

FILE = config.ROOT / "data" / "measures-oah.json"


def _load() -> dict:
    data = json.loads(FILE.read_text(encoding="utf-8"))
    missing = set(INDICATORS) - set(data["signs"])
    if missing:
        raise ValueError(f"{FILE.name} has no entry for sign(s): {sorted(missing)}")
    for code, entry in data["signs"].items():
        if code not in INDICATORS:
            raise ValueError(f"{FILE.name}: unknown sign {code!r}")
        for mid in entry.get("measures", []) + entry.get("cautions", []):
            if mid not in data["measures"]:
                raise ValueError(f"{FILE.name}: {code} cites unknown measure {mid!r}")
            if mid in entry.get("measures", []) and "what" not in data["measures"][mid]:
                raise ValueError(f"{FILE.name}: measure {mid} is recommended for {code} but has no 'what'")
    return data


DATA = _load()
SOURCE = DATA["source"]
ABOUT = DATA["about"]


def _item(mid: str) -> dict:
    m = DATA["measures"][mid]
    return {"id": mid, "title": m["title"], "group": m["group"], "line": m["line"], "page": m["page"],
            "what": m.get("what"), "limits": m.get("limits"), "caution": m.get("caution")}


def for_sign(code: str) -> dict:
    """What the brief shows under one sign: matched Catalogue measures, cautions, notes, first response."""
    e = DATA["signs"][code]
    return {"measures": [_item(m) for m in e.get("measures", [])],
            "cautions": [_item(m) for m in e.get("cautions", [])],
            "notes": e.get("notes", []),
            "inferred": e.get("inferred"),
            "first_response": e.get("first_response", [])}
