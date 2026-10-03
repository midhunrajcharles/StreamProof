"""Organisation login, team admin, citizen consent, rate limits and the public share card."""

import secrets

import pytest
from fastapi.testclient import TestClient

from app import auth, config, seed
from app.main import app, store
from tests.test_api import submit

REVIEWER, ADMIN = seed.DEMO_ACCOUNTS
PW = REVIEWER["password"]


@pytest.fixture()
def client():
    seed.run(store)
    for a in seed.DEMO_ACCOUNTS:  # undo password changes and deactivations from other tests
        store.save_user(auth.new_user(a["email"], a["name"], a["role"], a["password"], a["id"], seed.DEMO_ORG["id"]))
    for u in store.users():
        if u["email"] not in {a["email"] for a in seed.DEMO_ACCOUNTS}:
            u["active"] = 0
            store.save_user(u)
    maria = store.citizen_account(seed.DEMO_CITIZEN[0])
    store.save_citizen_account({**maria, "pw_hash": auth.hash_password(PW), "bio": "", "city": "Coimbra"})
    auth.reset_limits()
    return TestClient(app)


def login(c, email, password=PW):
    return c.post("/api/auth/login", data={"email": email, "password": password})


def test_password_hashing():
    h = auth.hash_password("correct horse battery")
    assert h.startswith("scrypt$") and "correct" not in h
    assert auth.check_password("correct horse battery", h)
    assert not auth.check_password("wrong", h)


def test_login_and_roles(client):
    assert login(client, REVIEWER["email"], "not-the-password").status_code == 401
    r = login(client, REVIEWER["email"].upper())  # email is case-insensitive
    assert r.status_code == 200 and r.json()["org"]["role"] == "reviewer"
    assert client.get("/api/queue").status_code == 200
    assert client.get("/api/org/team").status_code == 403  # reviewers can't manage the team
    client.post("/api/auth/logout")
    assert client.get("/api/queue").status_code == 401


def test_failed_logins_are_rate_limited(client):
    for _ in range(6):  # successful sign-ins don't count toward the lock
        assert login(client, REVIEWER["email"]).status_code == 200
    for _ in range(5):
        assert login(client, REVIEWER["email"], "wrong-password").status_code == 401
    r = login(client, REVIEWER["email"])
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_admin_manages_team_and_deactivation_takes_effect(client):
    assert login(client, ADMIN["email"]).status_code == 200
    r = client.post("/api/org/team", data={"email": "new.reviewer@example.org", "name": "New Reviewer", "role": "reviewer",
                                           "password": "short"})
    assert r.status_code == 400
    r = client.post("/api/org/team", data={"email": "new.reviewer@example.org", "name": "New Reviewer", "role": "reviewer",
                                           "password": "a-long-enough-password"})
    assert r.status_code == 200 and r.json()["active"]
    assert any(m["email"] == "new.reviewer@example.org" for m in client.get("/api/org/team").json()["members"])

    other = TestClient(app)
    assert login(other, "new.reviewer@example.org", "a-long-enough-password").status_code == 200
    assert other.get("/api/queue").status_code == 200
    client.post("/api/org/team/new.reviewer@example.org/active", data={"active": "0"})
    assert other.get("/api/queue").status_code == 401  # loses access at the next request
    assert client.post(f"/api/org/team/{ADMIN['email']}/active", data={"active": "0"}).status_code == 400


def test_change_password(client):
    login(client, REVIEWER["email"])
    assert client.post("/api/auth/password", data={"current": "nope", "new": "another-long-password"}).status_code == 400
    assert client.post("/api/auth/password", data={"current": PW, "new": "another-long-password"}).status_code == 200
    client.post("/api/auth/logout")
    assert login(client, REVIEWER["email"]).status_code == 401
    assert login(client, REVIEWER["email"], "another-long-password").status_code == 200


def test_new_citizen_is_pseudonymous_and_needs_consent(client):
    s = client.post("/api/citizen/start", data={"display": "Ana"}).json()
    pid = s["citizen"]["id"]
    assert pid.startswith("obs-") and pid != seed.DEMO_CITIZEN[0] and not s["consented"]
    from tests.test_app import hotspot
    lat, lon = hotspot()
    r = client.post("/api/reports", data={"lat": str(lat), "lon": str(lon), "accuracy": "8", "codes": ["litter"]})
    assert r.status_code == 428 and r.json()["detail"] == {"consent": auth.CONSENT_VERSION}
    assert client.post("/api/consent").json()["consented"]
    assert client.post("/api/reports", data={"lat": str(lat), "lon": str(lon), "accuracy": "8", "codes": ["litter"]}).status_code == 200
    me = client.get("/api/me").json()
    assert me["pseudonym"] == pid and me["consent"]["version"] == auth.CONSENT_VERSION


def test_reports_are_rate_limited(client):
    client.post("/api/session", data={"role": "citizen"})
    for _ in range(20):
        submit(client, photo=False)
    from tests.test_app import hotspot
    lat, lon = hotspot()
    r = client.post("/api/reports", data={"lat": str(lat), "lon": str(lon), "codes": ["litter"], "consent": "1"})
    assert r.status_code == 429


def test_share_card_is_public_and_coarse(client):
    rid = next(r.id for r in store.all() if r.rung.level >= 2)
    card = TestClient(app).get(f"/api/share/{rid}").json()
    assert card["id"] == rid and card["area"]
    text = str(card)
    assert "obs-" not in text and "lat" not in text and "lon" not in text
    hidden = next(r.id for r in store.all() if r.rung.value == "not-confirmed")
    assert TestClient(app).get(f"/api/share/{hidden}").status_code == 404


def test_demo_sign_in_can_be_switched_off(client, monkeypatch):
    monkeypatch.setattr(config, "DEMO_MODE", False)
    assert client.post("/api/session", data={"role": "org"}).status_code == 403
    assert login(client, REVIEWER["email"]).status_code == 200


def unique(prefix):
    return f"{prefix}-{secrets.token_hex(4)}@example.org"


def test_citizen_signup_keeps_anonymous_reports(client):
    client.post("/api/citizen/start", data={"display": "Ana"})
    pid = client.get("/api/session").json()["citizen"]["id"]
    client.post("/api/consent")
    submit(client, photo=False)
    email = unique("ana")
    assert client.post("/api/citizen/signup", data={"display": "Ana", "email": email, "password": "short"}).status_code == 400
    r = client.post("/api/citizen/signup", data={"display": "Ana", "email": email, "password": "a-long-enough-password", "city": "Ghent"})
    assert r.status_code == 200 and r.json()["kept_reports"] and r.json()["citizen"]["id"] == pid
    assert r.json()["citizen"]["account"]
    # same email again is refused
    other = TestClient(app)
    assert other.post("/api/citizen/signup", data={"display": "X", "email": email, "password": "a-long-enough-password"}).status_code == 409

    client.post("/api/citizen/logout")
    assert client.get("/api/session").json()["citizen"] is None
    assert client.post("/api/citizen/login", data={"email": email, "password": "wrong-password"}).status_code == 401
    r = client.post("/api/citizen/login", data={"email": email.upper(), "password": "a-long-enough-password"})
    assert r.status_code == 200 and r.json()["citizen"]["id"] == pid
    assert len(client.get("/api/me").json()["reports"]) == 1  # signed in on any device, same reports


def test_citizen_profile_and_stars(client):
    r = client.post("/api/citizen/login", data={"email": seed.DEMO_CITIZEN_EMAIL, "password": PW})
    assert r.status_code == 200 and r.json()["citizen"]["id"] == seed.DEMO_CITIZEN[0]
    p = client.get("/api/citizen/profile").json()
    assert p["has_account"] and p["email"] == seed.DEMO_CITIZEN_EMAIL
    rec = p["recognition"]
    assert {"stars", "level", "badges", "breakdown"} <= set(rec)
    assert client.post("/api/citizen/profile", data={"display": "Maria S.", "bio": "x" * 300}).status_code == 400
    assert client.post("/api/citizen/profile", data={"display": "Maria S.", "city": "Atlantis"}).status_code == 400
    p = client.post("/api/citizen/profile", data={"display": "Maria S.", "bio": "Evening walks.", "city": "Coimbra", "avatar": "moss"}).json()
    assert p["bio"] == "Evening walks." and p["avatar"] == "moss"
    assert client.post("/api/citizen/password", data={"current": "nope", "new": "another-long-password"}).status_code == 400
    assert client.post("/api/citizen/password", data={"current": PW, "new": "another-long-password"}).status_code == 200


def test_stars_come_from_confirmed_evidence_only(client):
    from app import recognition
    reports = store.all()
    ana = recognition.citizen("obs-7f3a", reports)  # four expert-confirmed reports in the seed
    rui = recognition.citizen("obs-0b44", reports)  # one report, not confirmed
    assert ana["stars"] >= 4 and ana["level"] != "newcomer"
    assert rui["stars"] == 0  # a rejection is never a penalty, just no star
    rev = recognition.reviewer(seed.DEMO_EXPERT, reports, store.missions())
    assert rev["stars"] > 0 and rev["counts"]


def test_forget_removes_citizen_account(client):
    client.post("/api/citizen/start", data={"display": "Temp"})
    email = unique("temp")
    client.post("/api/citizen/signup", data={"display": "Temp", "email": email, "password": "a-long-enough-password"})
    assert client.post("/api/me/forget").status_code == 200
    assert store.citizen_account_by_email(email) is None


def test_org_signup_creates_scoped_organisation(client):
    email = unique("ghent-admin")
    r = client.post("/api/org/signup", data={"org_name": "Ghent water lab", "city": "Ghent", "name": "Lien",
                                             "email": email, "password": "a-long-enough-password"})
    assert r.status_code == 200 and r.json()["org"]["role"] == "admin" and r.json()["org"]["city"] == "Ghent"
    # Coimbra reports are outside a Ghent organisation's area
    q = client.get("/api/queue").json()
    assert q["todo"] == [] and q["done"] == [] and q["missions"] == []
    coimbra = next(r.id for r in store.all())
    assert client.post(f"/api/reports/{coimbra}/verify", data={"method": "remote", "note": "x"}).status_code == 404
    # team only shows this organisation
    members = client.get("/api/org/team").json()["members"]
    assert [m["email"] for m in members] == [email]
    p = client.post("/api/org/profile", data={"name": "Lien V.", "title": "Water quality lead", "bio": "Lab chemist.", "avatar": "dusk"}).json()
    assert p["title"] == "Water quality lead" and p["organisation"]["city"] == "Ghent"
    assert client.post("/api/org/organisation", data={"name": "Ghent water lab", "website": "ftp://x"}).status_code == 400
    o = client.post("/api/org/organisation", data={"name": "Ghent Water Lab", "about": "City lab.", "website": "https://example.org"}).json()
    assert o["organisation"]["name"] == "Ghent Water Lab"
    client.post("/api/auth/logout")
    assert client.get("/api/session").json()["org"] is None


def test_roles_sign_out_separately(client):
    client.post("/api/citizen/login", data={"email": seed.DEMO_CITIZEN_EMAIL, "password": PW})
    login(client, REVIEWER["email"])
    s = client.get("/api/session").json()
    assert s["citizen"] and s["org"]
    client.post("/api/citizen/logout")
    s = client.get("/api/session").json()
    assert s["citizen"] is None and s["org"]
    login(client, REVIEWER["email"])
    client.post("/api/citizen/login", data={"email": seed.DEMO_CITIZEN_EMAIL, "password": PW})
    client.post("/api/auth/logout")
    s = client.get("/api/session").json()
    assert s["citizen"] and s["org"] is None
