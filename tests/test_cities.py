"""Any city: search, registering a city, its streams, grading and organisation scope there."""

import secrets

import pytest
from fastapi.testclient import TestClient

from app import auth, cities, geo, seed
from app.main import app, store

# A made-up 1.2 km stream line in Kraków (lon, lat), standing in for what OpenStreetMap returns.
LINE = [[19.900, 50.060], [19.905, 50.062], [19.910, 50.064], [19.915, 50.066]]


@pytest.fixture()
def client(monkeypatch):
    seed.run(store)
    auth.reset_limits()

    def fake_streams(city, box):
        return [{"id": f"{geo.slug(city)}-test", "name": "Test Brook", "city": city, "flow": "upstream_to_downstream",
                 "coordinates": LINE, "source": "test", "license": "test"}]

    monkeypatch.setattr(cities, "fetch_streams", fake_streams)
    monkeypatch.setattr(cities, "fetch_weather", lambda *a: None)
    monkeypatch.setattr(cities, "_start", lambda st, c, background: cities._fetch(st, c["name"]))
    return TestClient(app)


def add(c, name="Kraków", cc="pl"):
    r = c.post("/api/cities", data={"name": name, "country": "Poland", "cc": cc, "lat": "50.0619", "lon": "19.9369",
                                     "bbox": "[19.79, 49.97, 20.22, 50.13]"})
    assert r.status_code == 200, r.text
    return r.json()


def test_search_works_offline_for_known_cities(client):
    res = client.get("/api/cities/search", params={"q": "gh"}).json()["results"]
    assert res[0]["name"] == "Ghent" and res[0]["oah"]


def test_registering_a_city_fetches_its_streams(client):
    c = add(client)
    assert c["city"] == "Kraków" and c["status"] == "ready" and c["streams"] == 1 and not c["oah"]
    got = client.get("/api/cities/Kraków").json()
    assert got["lines"][0]["name"] == "Test Brook"
    assert "Kraków" in [x["city"] for x in client.get("/api/meta").json()["cities"]]
    assert add(client)["city"] == "Kraków"  # idempotent


def test_report_in_a_new_city_is_graded_on_its_stream(client):
    add(client)
    client.post("/api/session", data={"role": "citizen"})
    r = client.post("/api/reports", data={"lat": "50.064", "lon": "19.910", "accuracy": "8", "codes": ["litter"], "consent": "1"}).json()
    stream = next(x for x in r["reasons"] if x["signal"] == "stream")
    assert stream["status"] == "ok" and "Test Brook" in stream["text"]
    assert "Kraków" in r["place"]


def test_organisation_in_a_new_city_sees_only_that_city(client):
    add(client)
    client.post("/api/session", data={"role": "citizen"})
    rid = client.post("/api/reports", data={"lat": "50.064", "lon": "19.910", "codes": ["litter"], "consent": "1"}).json()["id"]
    org = TestClient(app)
    r = org.post("/api/org/signup", data={"org_name": "Kraków water", "city": "Kraków", "name": "Ola",
                                         "email": f"ola-{secrets.token_hex(3)}@example.org", "password": "a-long-enough-password"})
    assert r.status_code == 200 and r.json()["org"]["city"] == "Kraków"
    ids = [x["id"] for x in org.get("/api/queue").json()["todo"]]
    assert ids == [rid]  # nothing from Coimbra


def test_unknown_city_is_refused_for_accounts(client):
    r = TestClient(app).post("/api/org/signup", data={"org_name": "X", "city": "Atlantis", "name": "X",
                                                        "email": f"x-{secrets.token_hex(3)}@example.org", "password": "a-long-enough-password"})
    assert r.status_code == 400


def test_offline_city_is_marked_unavailable(client, monkeypatch):
    def down(city, box):
        raise OSError("network disabled")
    monkeypatch.setattr(cities, "fetch_streams", down)
    c = add(client, name="Nowhereville", cc="xx")
    assert c["status"] == "unavailable"
    # it can still be used: the map opens at the centre
    assert c["start"] == [50.0619, 19.9369]
