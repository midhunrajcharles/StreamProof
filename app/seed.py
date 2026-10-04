"""Synthetic demo data on the real Ribeira de Coselhas line in Coimbra.

Every seeded observer, report and verification here is invented for the demo and
labelled as such in the UI. Weather context and stream geometry are real.

    python -m app.seed          # reset the demo database
"""

import os
from datetime import timedelta

from . import auth, evidence, geo, service
from .models import now
from .store import Store

DEMO_CITIZEN = ("obs-3c9a", "Maria S.")
DEMO_EXPERT = "exp-coimbra-01"

# Demo organisation accounts (test values for this demo; override with environment
# variables, and change them for any real deployment).
DEMO_ACCOUNTS = [
    {"email": os.environ.get("STREAMPROOF_DEMO_REVIEWER", "reviewer@coimbra-pilot.demo"), "name": "Reviewer (demo)",
     "role": "reviewer", "id": DEMO_EXPERT, "password": os.environ.get("STREAMPROOF_DEMO_PASSWORD", "stream-demo-2026")},
    {"email": os.environ.get("STREAMPROOF_DEMO_ADMIN", "coordinator@coimbra-pilot.demo"), "name": "Pilot coordinator (demo)",
     "role": "admin", "id": "adm-coimbra-01", "password": os.environ.get("STREAMPROOF_DEMO_PASSWORD", "stream-demo-2026")},
]


DEMO_ORG = {"id": "org-coimbra", "name": "Coimbra pilot (demo)", "city": "Coimbra",
            "about": "Demo organisation for the Ribeira de Coselhas pilot. Reviewers verify citizen reports and publish the River Health Brief.",
            "website": ""}
DEMO_CITIZEN_EMAIL = os.environ.get("STREAMPROOF_DEMO_CITIZEN", "maria@coimbra-pilot.demo")


def ensure_accounts(store: Store) -> None:
    """Create the demo organisation, its accounts and the demo citizen's account once.
    Never overwrites changed passwords or profiles."""
    if not store.org(DEMO_ORG["id"]):
        store.save_org({**DEMO_ORG, "created": "2026-10-01T09:00:00"})
    for a in DEMO_ACCOUNTS:
        if not store.user(a["email"]):
            store.save_user(auth.new_user(a["email"], a["name"], a["role"], a["password"], a["id"], DEMO_ORG["id"]))
    for u in store.users():  # accounts made before organisations existed belong to the Coimbra pilot
        if not u.get("org_id"):
            store.save_user({**u, "org_id": DEMO_ORG["id"]})
    pseudonym, display = DEMO_CITIZEN
    if not store.citizen_account(pseudonym):
        store.save_citizen_account({"pseudonym": pseudonym, "email": DEMO_CITIZEN_EMAIL, "pw_hash": auth.hash_password(DEMO_ACCOUNTS[0]["password"]),
                                    "bio": "Walks the Coselhas path most evenings.", "city": "Coimbra", "avatar": "water",
                                    "created": "2026-10-01T09:00:00"})
        store.upsert_observer(pseudonym, display)
    if not store.consent(pseudonym):  # the demo citizen already reports, so she has agreed
        store.save_consent(pseudonym, auth.CONSENT_VERSION, "2026-10-01T09:00:00")

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
    ensure_accounts(store)
    for p, d in OBSERVERS:
        store.upsert_observer(p, d, contact="")
    t = now()

    def add(obs, codes, km, days_ago, hours=10, acc=9.0, side=11.0, desc=""):
        lat, lon = _at_km(km, side)
        when = (t - timedelta(days=days_ago)).replace(hour=hours, minute=12, second=0, microsecond=0)
        n = store.next_id("seedphoto", 1)
        return service.submit(store, obs, codes, lat, lon, acc, description=desc, created_at=when,
                              photo_metrics=_photo(n, when))

    # Ana: a reliable observer with three confirmed reports further downstream (gives her a track record).
    for i, km in enumerate((0.4, 0.7, 1.0)):
        r = add("obs-7f3a", ["litter"], km, 13 - i)
        service.verify(store, r.id, DEMO_EXPERT, "remote", "Litter visible in photo.")

    # Maria, the demo citizen: two checked reports, so her account shows stars and badges.
    m1 = add(DEMO_CITIZEN[0], ["litter"], 1.8, 9, hours=18, desc="Plastic bags caught on the bank below the path.")
    service.verify(store, m1.id, DEMO_EXPERT, "remote", "Litter visible in photo. Thanks, passed to the clean-up team.")
    m2 = add(DEMO_CITIZEN[0], ["all-clear"], 3.1, 6, hours=19, desc="Flowing and clear after the weekend rain.")
    service.verify(store, m2.id, DEMO_EXPERT, "field", "Checked on the field visit: flowing and clear.")

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

    # Ground truth for DipteraCAST: verified sightings and verified all-clears spread along the stream and in
    # time. Kept far (> 500 m) from the hotspot and from each other, so no new signal reaches decision grade
    # and the demo story's threshold is untouched. Appended last so earlier report ids don't move.
    for obs, codes, km, days, hrs, method, note, desc in [
        ("obs-91d2", ["mosquitoes"], 4.6, 8, 19, "field", "Adults and larvae in the dip sample.",
         "Adults at dusk over a rain-filled drain."),
        ("obs-5e10", ["mosquitoes"], 1.5, 11, 18, "remote", "Many adults visible in the photo.",
         "Cloud of mosquitoes by the weir."),
        ("obs-5e10", ["all-clear"], 5.4, 7, 9, "remote", "Clear photo, flowing water.",
         "Quiet reach, flowing, nothing unusual."),
        ("obs-c21e", ["all-clear"], 2.1, 10, 11, "field", "Checked on the field visit: flowing and clear.",
         "School walk: clear water and no mosquitoes."),
        ("obs-7f3a", ["all-clear"], 4.0, 12, 8, "remote", "Clear photo, flowing water.",
         "Early walk: water moving, no insects over it."),
    ]:
        g = add(obs, codes, km, days, hours=hrs, desc=desc)
        service.verify(store, g.id, DEMO_EXPERT, method, note)
    evidence.promote_decision_grade(store.all())
    return store


if __name__ == "__main__":
    s = run()
    for r in s.all():
        print(r.id, r.observer, r.indicators, r.grade, r.score, r.rung.value)
