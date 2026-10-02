"""Synthetic demo data on the real Ribeira de Coselhas line in Coimbra.

Every seeded observer, report and verification here is invented for the demo and
labelled as such in the UI. Weather context and stream geometry are real.

    python -m app.seed          # reset the demo database
"""

from datetime import timedelta

from . import evidence, geo, service
from .models import now
from .store import Store

DEMO_CITIZEN = ("obs-3c9a", "Maria S.")
DEMO_EXPERT = "exp-coimbra-01"

OBSERVERS = [
    DEMO_CITIZEN,
    ("obs-7f3a", "Ana R. (synthetic)"),
    ("obs-c21e", "Escola Básica volunteers (synthetic)"),
    ("obs-0b44", "Rui M. (synthetic)"),
    ("obs-91d2", "Rios Vivos NGO (synthetic)"),
    ("obs-5e10", "Jo T. (synthetic)"),
]


def _photo(seed: int, taken) -> dict:
    """Metrics of a seeded photo that isn't stored (shown as 'synthetic seed, no photo')."""
    return {"sha256": f"{seed:064x}", "width": 3024, "height": 4032, "sharpness": 140.0 + seed % 50,
            "brightness": 110.0 + seed % 30, "exif_time": taken.replace(tzinfo=None).isoformat(timespec="seconds"),
            "has_gps_exif": True}


def _at_km(km_from_mouth: float, side_m: float = 0.0) -> tuple[float, float]:
    s = geo.streams()[0]
    lat, lon = geo.point_at(s, s.chainage[-1] - km_from_mouth * 1000)
    return lat + side_m / 111_000, lon


def run(store: Store | None = None) -> Store:
    store = store or Store()
    store.reset()
    for p, d in OBSERVERS:
        store.upsert_observer(p, d, contact="")
    t = now()

    def add(obs, codes, km, days_ago, hours=10, acc=9.0, side=0.0, desc=""):
        lat, lon = _at_km(km, side)
        when = (t - timedelta(days=days_ago)).replace(hour=hours, minute=12, second=0, microsecond=0)
        n = store.next_id("seedphoto", 1)
        return service.submit(store, obs, codes, lat, lon, acc, description=desc, created_at=when,
                              photo_metrics=_photo(n, when))

    # Ana: a reliable observer with three confirmed reports further downstream (gives her a track record).
    for i, km in enumerate((0.4, 0.7, 1.0)):
        r = add("obs-7f3a", ["litter"], km, 13 - i)
        service.verify(store, r.id, DEMO_EXPERT, "remote", "Litter visible in photo.")

    # The upstream hotspot (~2.6 km above the mouth): ponded water and mosquitoes during the dry spell.
    a = add("obs-7f3a", ["stagnant-water", "mosquitoes"], 2.62, 5, desc="Side pool, water not moving, lots of mosquitoes at dusk.")
    service.verify(store, a.id, DEMO_EXPERT, "field", "Ponded side channel; larvae in dip sample.")
    add("obs-c21e", ["stagnant-water"], 2.45, 3, hours=11, desc="School walk: green still water by the footbridge.")

    # Downstream: a report that was reviewed and not confirmed (kept, with its reason).
    x = add("obs-0b44", ["algal-scum"], 1.3, 4, acc=60)
    service.reject(store, x.id, DEMO_EXPERT, "Photo shows pollen on the surface, not an algal scum. Thanks for checking!")

    # An all-clear observation, credited like any other.
    add("obs-91d2", ["all-clear"], 3.4, 2, desc="Upper reach flowing and clear.")

    # A lone litter report: assessed, waiting.
    add("obs-5e10", ["litter", "foam"], 0.9, 1, acc=25)

    # A mission already open further up, so the citizen view has one nearby.
    service.request_mission(store, a.id, DEMO_EXPERT)
    evidence.promote_decision_grade(store.all())
    return store


if __name__ == "__main__":
    s = run()
    for r in s.all():
        print(r.id, r.observer, r.indicators, r.grade, r.score, r.rung.value)
