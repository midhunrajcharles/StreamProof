"""Does the grade mean anything? Two honest answers, and the limits of each.

1. `scenarios()` is a behaviour table: reports built to isolate one weakness, graded by the real grader.
   It shows what the rules DO (for example that a lone first report can reach B but not A, and that a
   contradicting all-clear costs a lone report only 3 points). It is a specification check, not evidence
   that the grade predicts anything.
2. `confusion()` compares the grade with what experts later decided, over real decided reports: how often
   grade A to D reports were confirmed. That is the calibration that matters. On the synthetic demo data it
   only shows the method works; it says nothing about accuracy until enough real decisions exist, and it
   refuses to quote rates before then (`MIN_DECIDED`).

Known biases, stated rather than hidden: experts do not review a random sample (health-relevant reports come
first), a grade may influence who gets looked at, and experts see the grade's reasons before deciding.
"""

from datetime import datetime, timedelta, timezone

from . import grading
from .grading import GRADE_BANDS
from .models import Report, Rung

MIN_DECIDED = 30  # below this, counts are shown but no rates
GRADES = [g for _, g in GRADE_BANDS]
DECIDED = (Rung.EXPERT, Rung.DECISION, Rung.NOT_CONFIRMED)

LIMITS = [
    "Experts do not review a random sample: health-relevant reports come first, so the reviewed reports are not typical.",
    "A grade may influence which reports get looked at, and experts read the grade's reasons before they decide.",
    "'Confirmed' means an expert agreed the sign is visible, not that the stream is unhealthy.",
    "Thresholds and weights are configurable defaults, to be calibrated with OneAquaHealth ecologists on real field data.",
]


def confusion(reports: list[Report]) -> dict:
    """Grade A-D against the expert's decision, for reports an expert has decided."""
    decided = [r for r in reports if r.rung in DECIDED and r.grade]
    rows = []
    for g in GRADES:
        mine = [r for r in decided if r.grade == g]
        ok = sum(r.rung != Rung.NOT_CONFIRMED for r in mine)
        rows.append({"grade": g, "decided": len(mine), "confirmed": ok, "not_confirmed": len(mine) - ok,
                     "share_confirmed": round(ok / len(mine), 2) if len(decided) >= MIN_DECIDED and mine else None})
    confirmed = sum(r.rung != Rung.NOT_CONFIRMED for r in decided)
    enough = len(decided) >= MIN_DECIDED
    return {"rows": rows, "decided": len(decided), "confirmed": confirmed,
            "not_confirmed": len(decided) - confirmed, "enough": enough, "min_decided": MIN_DECIDED,
            "note": (None if enough else
                     f"Only {len(decided)} decided reports so far (at least {MIN_DECIDED} are needed before any rate "
                     f"means anything). These counts show the method, not the grade's accuracy.")}


# ---------- behaviour table ----------

_T0 = datetime(2026, 10, 2, 9, 0, tzinfo=timezone.utc)
_SPOT = (40.22267, -8.42745)  # on Ribeira de Coselhas
_PHOTO = {"sha256": "ab" * 32, "width": 3000, "height": 4000, "sharpness": 200.0, "brightness": 120.0,
          "exif_time": "2026-10-02T10:00:00", "has_gps_exif": True}


def _r(i: int, obs: str, codes=("stagnant-water",), photo=_PHOTO, acc: float | None = 8.0, dlat: float = 0.0,
       hours: float = 0, rung: Rung = Rung.REPORT) -> Report:
    r = Report(f"CAL-{i}", obs, _T0 + timedelta(hours=hours), list(codes), _SPOT[0] + dlat, _SPOT[1], acc,
               photo=dict(photo) if photo else None)
    r.rung = rung
    return r


def _history(obs: str, confirmed: int, bad: int) -> list[Report]:
    out = [_r(100 + i, obs, hours=-24 * 40, rung=Rung.EXPERT) for i in range(confirmed)]
    return out + [_r(200 + i, obs, hours=-24 * 41, rung=Rung.NOT_CONFIRMED) for i in range(bad)]


def scenarios() -> list[dict]:
    """(name, what it isolates, the real grader's answer). Built fresh each call, nothing stored."""
    neighbour = lambda i, h=1.0, codes=("stagnant-water",): _r(300 + i, f"nb-{i}", codes=codes, hours=h, dlat=0.0004)  # noqa: E731
    cases = [
        ("First report: clear photo, good GPS, on the stream", "the best a lone newcomer can do",
         _r(1, "me"), []),
        ("... and one other person reported the same nearby", "corroboration, one neighbour",
         _r(2, "me"), [neighbour(1)]),
        ("... and two other people", "corroboration, two neighbours", _r(3, "me"), [neighbour(1), neighbour(2)]),
        ("Proven observer (3 of 3 earlier reports confirmed), lone report", "track record on its own",
         _r(4, "pro"), _history("pro", 3, 0)),
        ("No photo, two neighbours agree", "the photo is worth the most points (30)",
         _r(5, "me", photo=None), [neighbour(1), neighbour(2)]),
        ("Blurry, dark, small photo", "photo quality",
         _r(6, "me", photo={**_PHOTO, "width": 400, "height": 300, "sharpness": 30.0, "brightness": 20.0}), []),
        ("Poor GPS (150 m), 1 km from any stream", "location checks",
         _r(7, "me", acc=150.0, dlat=0.009), []),
        ("Photo taken 5 days before the report", "photo time",
         _r(8, "me", photo={**_PHOTO, "exif_time": "2026-09-27T10:00:00"}), []),
        ("A nearby all-clear within 48 h contradicts it", "contradiction (a different person, 100 m away)",
         _r(9, "me"), [_r(309, "nb-c", codes=("all-clear",), hours=-10, dlat=0.0009)]),
        ("Observer mostly not confirmed (1 of 5 earlier reports)", "track record, the bad end",
         _r(10, "poor"), _history("poor", 1, 4)),
        ("Worst case: no photo, no GPS accuracy, off stream, 0 of 4 confirmed", "everything wrong at once",
         _r(11, "poor", photo=None, acc=None, dlat=0.009), _history("poor", 0, 4)),
    ]
    out = []
    for name, why, report, others in cases:
        grading.grade(report, others)
        out.append({"name": name, "isolates": why, "score": report.score, "grade": report.grade,
                    "points": {x.signal: x.points for x in report.reasons}})
    return out


def report(reports: list[Report]) -> dict:
    return {"confusion": confusion(reports), "scenarios": scenarios(), "limits": LIMITS,
            "bands": [{"grade": g, "from": f} for f, g in GRADE_BANDS]}
