"""Demo data for the video (docs/VIDEO-SCRIPT.md): five pilot cities, about 40 citizens, 130+ reports.

    python -m app.seed_video          # reset the database and build it

Everything is created through the app's own services, in time order, at backdated times: each report is
graded by the real engine against what existed then, corroboration links itself, reviewers verify or
reject with notes, missions open, certificates are signed with the real verification date. Nothing is
written to the database directly, so every reason, badge and number on screen is genuine app output.

It is still demo data: the people, reports and photos are invented (photos are rendered scenes when
data/demo-photos/ has them). The stream lines and the rainfall are real. Organisation names keep "(demo)".

The script needs one moment to happen live, on camera: Maria's new report near the footbridge is verified
and the signal becomes decision-grade. So this seed guarantees there is NO decision-grade signal in Coimbra
beforehand, and that an expert-verified mosquito report by someone else is waiting within 500 m.
"""

import io
import random
from datetime import datetime, timedelta

from PIL import Image, ImageEnhance, ImageOps

from . import auth, config, coverage, evidence, geo, service
from .models import Rung, now
from .seed import DEMO_ACCOUNTS, DEMO_CITIZEN, DEMO_EXPERT, DEMO_ORG, _photo, ensure_accounts
from .store import Store

PASSWORD = DEMO_ACCOUNTS[0]["password"]
PHOTOS = config.ROOT / "data" / "demo-photos"
RNG_SEED = 2026

CITIES = {
    "Coimbra": {"stream": "coselhas", "lang": "pt", "org": DEMO_ORG["id"], "n": 50},
    "Benevento": {"stream": "sabato-benevento", "lang": "it", "org": "org-benevento", "n": 18},
    "Ghent": {"stream": "leie-gent", "lang": "nl", "org": "org-ghent", "n": 18},
    "Oslo": {"stream": "akerselva", "lang": "no", "org": "org-oslo", "n": 18},
    "Toulouse": {"stream": "hers-mort-toulouse", "lang": "fr", "org": "org-toulouse", "n": 18},
}

ORGS = {  # other pilots; Coimbra's comes from app/seed.py
    "org-benevento": ("Benevento pilot (demo)", "Benevento", "Reviewers for the Sabato reach in Benevento."),
    "org-ghent": ("Ghent pilot (demo)", "Ghent", "Reviewers for the Leie through Ghent."),
    "org-oslo": ("Oslo pilot (demo)", "Oslo", "Reviewers for the Akerselva, from Maridalsvannet to the fjord."),
    "org-toulouse": ("Toulouse pilot (demo)", "Toulouse", "Reviewers for the Hers-Mort through north-east Toulouse."),
}
STAFF = {  # org -> (reviewer, coordinator): (id, email, name, title)
    DEMO_ORG["id"]: (("exp-coimbra-01", "reviewer@coimbra-pilot.demo", "Helena M.", "Reviewer, freshwater ecology"),
                     ("adm-coimbra-01", "coordinator@coimbra-pilot.demo", "Rui T.", "Pilot coordinator")),
    "org-benevento": (("exp-benevento-01", "reviewer@benevento-pilot.demo", "Giulia R.", "Reviewer, river ecology"),
                      ("adm-benevento-01", "coordinator@benevento-pilot.demo", "Marco D.", "Pilot coordinator")),
    "org-ghent": (("exp-ghent-01", "reviewer@ghent-pilot.demo", "Femke J.", "Reviewer, water quality"),
                  ("adm-ghent-01", "coordinator@ghent-pilot.demo", "Pieter V.", "Pilot coordinator")),
    "org-oslo": (("exp-oslo-01", "reviewer@oslo-pilot.demo", "Ingrid H.", "Reviewer, urban streams"),
                 ("adm-oslo-01", "coordinator@oslo-pilot.demo", "Magnus B.", "Pilot coordinator")),
    "org-toulouse": (("exp-toulouse-01", "reviewer@toulouse-pilot.demo", "Camille D.", "Reviewer, hydrobiology"),
                     ("adm-toulouse-01", "coordinator@toulouse-pilot.demo", "Hugo R.", "Pilot coordinator")),
}

PEOPLE = {
    "Coimbra": ["Ana R.", "Rui M.", "Inês C.", "Tiago F.", "Beatriz L.", "João P.", "Carla V.", "Duarte A.",
                "Turma do 6.º B", "Grupo de voluntários do Vale"],
    "Benevento": ["Chiara B.", "Luca P.", "Francesca M.", "Antonio S.", "Sara G.", "Davide L.", "Classe 2B"],
    "Ghent": ["Lotte V.", "Wout M.", "Sanne B.", "Jonas C.", "Elien D.", "Klas 5A"],
    "Oslo": ["Sofie L.", "Henrik A.", "Nora K.", "Emil T.", "Kari S.", "Klasse 6B"],
    "Toulouse": ["Lucas M.", "Chloé B.", "Léa F.", "Nathan G.", "Manon P.", "Classe de CM2"],
}
CITIZEN_LOGINS = {  # one citizen account per city besides Maria (email, display, bio, avatar)
    "Benevento": ("chiara@benevento-pilot.demo", "Chiara B.", "Cammino lungo il Sabato ogni mattina.", "sand"),
    "Ghent": ("lotte@ghent-pilot.demo", "Lotte V.", "Fiets elke dag langs de Leie.", "moss"),
    "Oslo": ("sofie@oslo-pilot.demo", "Sofie L.", "Går langs Akerselva til jobben.", "dusk"),
    "Toulouse": ("lucas@toulouse-pilot.demo", "Lucas M.", "Je cours le long de l'Hers le week-end.", "stone"),
}

DESC = {
    "pt": {"stagnant-water": ["Água parada no braço lateral, não corre nada.", "Poça grande junto à ponte, a água não se mexe."],
           "mosquitoes": ["Muitos mosquitos ao fim da tarde perto da água parada.", "Nuvem de mosquitos junto ao açude."],
           "algal-scum": ["Água esverdeada com uma película à superfície.", "Manchas verdes a boiar perto da margem."],
           "dead-fish": ["Dois peixes mortos encostados à margem."],
           "oil-sheen": ["Mancha com reflexos de arco-íris junto à saída de água pluvial."],
           "sewage": ["Cano a descarregar água cinzenta para a ribeira.", "Cheiro a esgoto junto ao coletor."],
           "litter": ["Sacos de plástico presos nos ramos.", "Garrafas e latas na margem depois do fim de semana."],
           "foam": ["Espuma branca que não desaparece abaixo da queda de água."],
           "odour": ["Cheiro forte a podre junto ao caminho."],
           "all-clear": ["Corre bem e a água está limpa.", "Tudo normal neste troço.", "Sem problemas, água transparente."]},
    "it": {"stagnant-water": ["Acqua ferma sotto il ponte, non scorre.", "Pozza laterale stagnante."],
           "mosquitoes": ["Tantissime zanzare al tramonto vicino all'acqua ferma."],
           "algal-scum": ["Patina verde sull'acqua vicino alla riva.", "Acqua verde con schiuma in superficie."],
           "dead-fish": ["Pesci morti vicino alla riva."],
           "oil-sheen": ["Chiazza iridescente vicino allo scarico."],
           "sewage": ["Un tubo scarica acqua grigia nel fiume."],
           "litter": ["Bottiglie e buste di plastica sulla riva.", "Rifiuti incastrati tra i rami."],
           "foam": ["Schiuma bianca che non si scioglie."],
           "odour": ["Forte odore di marcio vicino al sentiero."],
           "all-clear": ["Acqua limpida, scorre bene.", "Tutto a posto lungo questo tratto."]},
    "nl": {"stagnant-water": ["Stilstaand water in de zijarm.", "Het water staat stil bij de brug."],
           "mosquitoes": ["Veel muggen bij het stilstaande water 's avonds."],
           "algal-scum": ["Groene laag op het water langs de kade.", "Groen water met wat schuim."],
           "dead-fish": ["Dode vissen langs de oever."],
           "oil-sheen": ["Regenboogvlek op het water bij de overstort."],
           "sewage": ["Een buis loost grijs water in de Leie."],
           "litter": ["Plastic zakken en flessen langs de oever.", "Afval vast in het riet."],
           "foam": ["Wit schuim dat blijft liggen."],
           "odour": ["Sterke rotte geur bij het pad."],
           "all-clear": ["Het water stroomt goed en ziet er schoon uit.", "Niets bijzonders vandaag."]},
    "no": {"stagnant-water": ["Stillestående vann i en sidelomme.", "Vannet står stille ved brua."],
           "mosquitoes": ["Mye mygg ved det stille vannet om kvelden."],
           "algal-scum": ["Grønt belegg på vannet langs bredden."],
           "dead-fish": ["Død fisk ved bredden."],
           "oil-sheen": ["Regnbuefarget film på vannet ved utløpet."],
           "sewage": ["Et rør slipper ut grått vann i elva."],
           "litter": ["Plastposer og flasker langs elvebredden.", "Søppel som har satt seg fast i greinene."],
           "foam": ["Hvitt skum som ikke forsvinner under fossen."],
           "odour": ["Sterk råtten lukt ved stien."],
           "all-clear": ["Elva renner fint og vannet er klart.", "Alt ser normalt ut i dag."]},
    "fr": {"stagnant-water": ["Eau stagnante dans un bras mort.", "L'eau ne coule plus sous le pont."],
           "mosquitoes": ["Beaucoup de moustiques le soir près de l'eau stagnante.", "Nuée de moustiques au bord du bras mort."],
           "algal-scum": ["Pellicule verte sur l'eau près de la berge.", "Eau verte avec un peu de mousse."],
           "dead-fish": ["Poissons morts au bord de l'eau."],
           "oil-sheen": ["Irisations sur l'eau près de l'exutoire pluvial."],
           "sewage": ["Un tuyau rejette de l'eau grise dans la rivière."],
           "litter": ["Sacs plastiques et bouteilles sur la berge.", "Déchets coincés dans les branches."],
           "foam": ["Mousse blanche persistante sous le seuil."],
           "odour": ["Forte odeur de pourriture le long du chemin."],
           "all-clear": ["L'eau coule bien et elle est claire.", "Rien à signaler aujourd'hui."]},
}
VERIFY_NOTE = {
    "litter": "Litter visible in the photo. Passed to the clean-up team.",
    "all-clear": "Clear photo, flowing water.",
    "stagnant-water": "Ponded side channel confirmed on site.",
    "mosquitoes": "Adults and larvae in the dip sample.",
    "algal-scum": "Green scum visible; sample sent to the lab.",
    "foam": "Persistent foam below the weir; we are monitoring it.",
    "sewage": "Grey discharge from the outfall; the utility has been notified.",
    "odour": "Strong odour confirmed near the collector.",
    "oil-sheen": "Sheen visible near the outfall; the source is being traced.",
    "dead-fish": "Dead fish confirmed; water sampled the same day.",
}
REJECT_REASON = {
    "algal-scum": "The photo shows pollen on the surface, not an algal scum. Thanks for checking!",
    "foam": "This looks like natural foam from leaves after rain; it breaks up quickly. Thanks for reporting!",
    "oil-sheen": "The shimmer is sunlight on ripples, not oil. Thanks for looking closely!",
    "litter": "We couldn't see litter in this photo. A closer shot next time would help. Thanks!",
}
# share of random reports per sign (problems are rarer than all-clears in real use)
MIX = [("all-clear", 32), ("litter", 20), ("foam", 8), ("stagnant-water", 8), ("algal-scum", 7), ("odour", 6),
       ("mosquitoes", 6), ("sewage", 5), ("oil-sheen", 5), ("dead-fish", 3)]
EVENING = {"mosquitoes"}


class Plan:
    """Events (submit, verify, reject, mission) executed in time order."""

    def __init__(self, store: Store):
        self.store, self.events, self.ids, self.n = store, [], {}, 0

    def report(self, obs: str, codes: list[str], lat: float, lon: float, when: datetime, desc: str,
               acc: float = 9.0, city: str = "") -> int:
        self.n += 1
        self.events.append((when, "submit", self.n, (obs, codes, lat, lon, acc, desc, city)))
        return self.n

    def verify(self, ref: int, when: datetime, by: str, method: str, note: str) -> None:
        self.events.append((when, "verify", ref, (by, method, note)))

    def reject(self, ref: int, when: datetime, by: str, reason: str) -> None:
        self.events.append((when, "reject", ref, (by, reason)))

    def mission(self, ref: int, when: datetime, by: str) -> None:
        self.events.append((when, "mission", ref, (by,)))


def _photo_bytes(rng: random.Random, sign: str, city: str, when: datetime) -> bytes | None:
    """A rendered scene for this sign (or this city, for all-clears), varied slightly so no two are identical,
    with an EXIF capture time like a phone photo. None when no renders exist yet."""
    folders = [PHOTOS / sign] + ([PHOTOS / f"place-{city.lower()}", PHOTOS / "clear"] if sign == "all-clear" else [])
    files = [p for f in folders if f.exists() for p in sorted(f.glob("*.jpg"))]
    if not files:
        return None
    im = Image.open(rng.choice(files)).convert("RGB")
    w, h = im.size
    k = rng.uniform(0.82, 0.96)
    x, y = rng.randint(0, int(w * (1 - k))), rng.randint(0, int(h * (1 - k)))
    im = im.crop((x, y, x + int(w * k), y + int(h * k)))
    if rng.random() < 0.5:
        im = ImageOps.mirror(im)
    im = ImageEnhance.Brightness(im).enhance(rng.uniform(0.9, 1.08))
    im = ImageEnhance.Contrast(im).enhance(rng.uniform(0.92, 1.08))
    exif = Image.Exif()
    exif[0x0132] = when.replace(tzinfo=None).strftime("%Y:%m:%d %H:%M:%S")  # DateTime
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=rng.randint(84, 92), exif=exif.tobytes())
    return buf.getvalue()


def _point(stream: geo.Stream, from_upstream_m: float, rng: random.Random) -> tuple[float, float]:
    lat, lon = geo.point_at(stream, max(0.0, min(from_upstream_m, stream.chainage[-1])))
    return lat + rng.uniform(-18, 18) / 111_000, lon + rng.uniform(-18, 18) / 85_000


def _at(days: float, hour: int, rng: random.Random, t: datetime) -> datetime:
    d = (t - timedelta(days=days)).replace(hour=hour, minute=rng.randint(2, 57), second=0, microsecond=0)
    return min(d, t - timedelta(hours=2))


def _would_be_decision(store: Store, rid: str) -> bool:
    """Would verifying this report complete a decision-grade signal? (Coimbra must have none before the demo.)"""
    r = store.get(rid)
    others = [o for o in store.all() if o.id != rid and o.observer != r.observer
              and set(o.indicators) & set(r.indicators) - {"all-clear"}
              and abs((o.created_at - r.created_at).days) <= config.NEARBY_WINDOW_DAYS
              and geo.distance_m(r.lat, r.lon, o.lat, o.lon) <= config.NEARBY_RADIUS_M]
    experts = {o.observer for o in others if o.rung in (Rung.EXPERT, Rung.DECISION)}
    community = {o.observer for o in others if o.rung.level >= Rung.COMMUNITY.level and o.rung != Rung.NOT_CONFIRMED}
    return bool(experts) or len(community) >= config.ADVISORY_MIN_COMMUNITY - 1


def _accounts(store: Store, t: datetime) -> None:
    ensure_accounts(store)
    for oid, (name, city, about) in ORGS.items():
        store.save_org({"id": oid, "name": name, "city": city, "about": about, "website": "",
                        "created": (t - timedelta(days=40)).isoformat(timespec="seconds")})
    for oid, staff in STAFF.items():
        for (uid, email, name, title), role in zip(staff, ("reviewer", "admin")):
            u = store.user(email) or auth.new_user(email, name, role, PASSWORD, uid, oid)
            store.save_user({**u, "name": name, "title": title, "org_id": oid, "avatar": u.get("avatar") or "ink"})
    for city, (email, display, bio, avatar) in CITIZEN_LOGINS.items():
        pseudo = _pseudo(display, city)
        store.save_citizen_account({"pseudonym": pseudo, "email": email, "pw_hash": auth.hash_password(PASSWORD),
                                    "bio": bio, "city": city, "avatar": avatar,
                                    "created": (t - timedelta(days=35)).isoformat(timespec="seconds")})


def _pseudo(display: str, city: str) -> str:
    """A stable pseudonym (Python's hash() is salted per run, so it can't be used here)."""
    return "obs-" + format(sum((i + 1) * ord(c) for i, c in enumerate(display + city)) % 0xFFFF, "04x")


def run(store: Store | None = None) -> Store:
    store = store or Store()
    store.reset()
    rng = random.Random(RNG_SEED)
    t = now()
    _accounts(store, t)
    plan = Plan(store)
    people: dict[str, list[str]] = {}
    for city, names in PEOPLE.items():
        people[city] = []
        for name in names:
            p = _pseudo(name, city)
            store.upsert_observer(p, name)
            store.save_consent(p, auth.CONSENT_VERSION, (t - timedelta(days=40)).isoformat(timespec="seconds"))
            people[city].append(p)
    maria, ana, school = DEMO_CITIZEN[0], people["Coimbra"][0], people["Coimbra"][8]
    store.upsert_observer(maria, DEMO_CITIZEN[1])
    people["Coimbra"].append(maria)
    rev = {c: STAFF[CITIES[c]["org"]][0][0] for c in CITIES}

    # ---- the Coimbra story the script needs (km above the Mondego) ----
    co = next(s for s in geo.streams() if s.id == "coselhas")
    total = co.chainage[-1]
    at_km = lambda km: _point(co, total - km * 1000, rng)  # noqa: E731
    for i, km in enumerate((0.4, 0.7, 1.0)):  # Ana: a reliable observer with a track record
        when = _at(20 - i * 2, 9 + i, rng, t)
        ref = plan.report(ana, ["litter"], *at_km(km), when, rng.choice(DESC["pt"]["litter"]), city="Coimbra")
        plan.verify(ref, when + timedelta(hours=20), rev["Coimbra"], "remote", VERIFY_NOTE["litter"])
    m1 = plan.report(maria, ["litter"], *at_km(1.8), _at(9, 18, rng, t), "Sacos de plástico presos nos ramos, por baixo do caminho.", city="Coimbra")
    plan.verify(m1, _at(8, 10, rng, t), rev["Coimbra"], "remote", "Litter visible in the photo. Thanks, passed to the clean-up team.")
    m2 = plan.report(maria, ["all-clear"], *at_km(3.1), _at(6, 19, rng, t), "Corre bem e a água está limpa depois da chuva do fim de semana.", city="Coimbra")
    plan.verify(m2, _at(5, 11, rng, t), rev["Coimbra"], "field", "Checked on the field visit: flowing and clear.")
    hot = plan.report(ana, ["stagnant-water", "mosquitoes"], *at_km(2.62), _at(5, 19, rng, t),
                      "Braço lateral com água parada e muitos mosquitos ao anoitecer.", city="Coimbra")
    plan.verify(hot, _at(4, 10, rng, t), rev["Coimbra"], "field", "Ponded side channel; larvae in the dip sample.")
    plan.mission(hot, _at(4, 10, rng, t) + timedelta(minutes=12), rev["Coimbra"])
    plan.report(school, ["stagnant-water"], *at_km(2.45), _at(2, 11, rng, t),
                "Passeio da escola: água verde e parada junto à ponte pedonal.", city="Coimbra")
    x = plan.report(people["Coimbra"][1], ["algal-scum"], *at_km(1.3), _at(4, 16, rng, t),
                    "Manchas verdes a boiar perto da margem.", acc=60, city="Coimbra")
    plan.reject(x, _at(3, 9, rng, t), rev["Coimbra"], REJECT_REASON["algal-scum"])
    plan.report(people["Coimbra"][9], ["all-clear"], *at_km(3.4), _at(2, 10, rng, t), "Troço de cima a correr bem, água clara.", city="Coimbra")

    # ---- the rest: lived-in activity in every city ----
    hot_up = total - 2620  # hotspot position from the upstream end
    for city, c in CITIES.items():
        stream = next(s for s in geo.streams() if s.id == c["stream"])
        n_reach = len(coverage.reaches(stream))
        skip = {1, 3} if city == "Coimbra" else {n_reach // 2}  # stretches nobody walked lately (no story report there)
        crowd = [p for p in people[city] if p != maria]
        for _ in range(c["n"]):
            sign = rng.choices([s for s, _ in MIX], [w for _, w in MIX])[0]
            while True:
                pos = rng.uniform(60, stream.chainage[-1] - 60)
                if int(pos // config.COVERAGE_REACH_M) in skip:
                    continue
                if city == "Coimbra" and sign in ("stagnant-water", "mosquitoes") and abs(pos - hot_up) < 900:
                    continue  # keep the hotspot's story clean
                break
            days = rng.uniform(1.2, 29)
            hour = rng.randint(18, 21) if sign in EVENING else rng.randint(7, 19)
            when = _at(days, hour, rng, t)
            obs = rng.choice(crowd)
            ref = plan.report(obs, [sign], *_point(stream, pos, rng), when, rng.choice(DESC[c["lang"]][sign]),
                              acc=rng.choice([4, 5, 6, 7, 8, 9, 11, 14, 18, 25, 40, 65]), city=city)
            roll = rng.random()
            later = when + timedelta(hours=rng.uniform(5, 40))
            if later > t - timedelta(hours=3):
                continue
            if sign in REJECT_REASON and roll < 0.12:
                plan.reject(ref, later, rev[city], REJECT_REASON[sign])
            elif roll < (0.42 if sign == "all-clear" else 0.55):
                plan.verify(ref, later, rev[city], rng.choice(["remote", "remote", "field"]), VERIFY_NOTE[sign])

    # ---- a decision-grade signal in two other cities (scale shot) ----
    for city, sign, base in (("Benevento", "algal-scum", 0.35), ("Toulouse", "mosquitoes", 0.6)):
        stream = next(s for s in geo.streams() if s.id == CITIES[city]["stream"])
        pos = stream.chainage[-1] * base
        for i, obs in enumerate(people[city][:3]):
            when = _at(6 - i * 1.5, 19 if sign in EVENING else 15, rng, t)
            ref = plan.report(obs, [sign], *_point(stream, pos + i * 120, rng), when, rng.choice(DESC[CITIES[city]["lang"]][sign]),
                              acc=8, city=city)
            if i < 2:
                plan.verify(ref, when + timedelta(hours=18), rev[city], "field", VERIFY_NOTE[sign])

    # ---- execute in time order ----
    for when, kind, ref, data in sorted(plan.events, key=lambda e: e[0]):
        if kind == "submit":
            obs, codes, lat, lon, acc, desc, city = data
            photo = _photo_bytes(rng, codes[0], city, when)
            r = service.submit(store, obs, codes, lat, lon, acc, photo_bytes=photo, description=desc, created_at=when,
                               photo_metrics=None if photo else _photo(store.next_id("seedphoto", 1), when))
            plan.ids[ref] = r.id
        elif ref not in plan.ids:
            continue
        elif kind == "verify":
            rid = plan.ids[ref]
            r = store.get(rid)
            coimbra = geo.snap(r.lat, r.lon) and geo.snap(r.lat, r.lon).stream.id == "coselhas"
            if r.rung in (Rung.ASSESSED, Rung.COMMUNITY) and not (coimbra and ref != hot and _would_be_decision(store, rid)):
                service.verify(store, rid, data[0], data[1], data[2], at=when)
        elif kind == "reject":
            r = store.get(plan.ids[ref])
            if r.rung in (Rung.ASSESSED, Rung.COMMUNITY):
                service.reject(store, r.id, data[0], data[1], at=when)
        elif kind == "mission":
            service.request_mission(store, plan.ids[ref], data[0], at=when)
    evidence.promote_decision_grade(store.all())
    store.save_all(store.all())
    _check(store, plan.ids[hot])
    return store


def _check(store: Store, hotspot_id: str) -> None:
    """The demo moment must be real: no live decision-grade signal in Coimbra yet (an old one may have expired),
    and the expert-verified hotspot report is waiting."""
    live = [s for s in evidence.signals(store.all()) if s.decision_grade
            and (sn := geo.snap(*s.center)) and sn.stream.id == "coselhas"]
    assert not live, f"Coimbra already has a live decision-grade signal: {[s.why for s in live]}"
    assert store.get(hotspot_id).rung == Rung.EXPERT, "the hotspot mosquito report must be expert-verified"


def summary(store: Store) -> str:
    reports = store.all()
    lines = [f"{len(reports)} reports, {len(store.missions())} missions"]
    for city, c in CITIES.items():
        mine = [r for r in reports if (s := geo.snap(r.lat, r.lon)) and s.stream.id == c["stream"]]
        by = {rung.label: sum(r.rung == rung for r in mine) for rung in Rung}
        lines.append(f"  {city:9s} {len(mine):3d}  " + ", ".join(f"{k} {v}" for k, v in by.items() if v))
    return "\n".join(lines)


if __name__ == "__main__":
    s = run()
    print(summary(s))
