"""The brief cites the real OneAquaHealth Catalogue of Measures. These tests keep that honest: the mapping
covers every sign, and, when the Catalogue text is available locally, every measure title is on the page
we cite and every quoted phrase is on the page we point to (a typo in a page number fails here)."""

import json
import re

import pytest
from fastapi.testclient import TestClient

from app import auth, catalogue, config, seed
from app.indicators import INDICATORS
from app.main import app, store

TEXT = config.ROOT / "research" / "catalogue" / "catalogue.txt"  # pdftotext of the Zenodo PDF (git-ignored)


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9>]", "", s.lower())


@pytest.fixture(scope="module")
def pages() -> dict[int, str]:
    if not TEXT.exists():
        pytest.skip("Catalogue text not available (research/catalogue/catalogue.txt, from the Zenodo PDF)")
    out = {}
    for p in TEXT.read_text(encoding="utf-8", errors="replace").split("\f"):
        m = re.match(r"\s*D2\.4 Catalogue[^\n]*?\s(\d+)\s*\n", p)
        if m:
            out[int(m.group(1))] = norm(p)
    return out


def test_every_sign_is_covered_and_nothing_is_a_placeholder():
    for code in INDICATORS:
        e = catalogue.for_sign(code)
        if code == "all-clear":
            assert not e["measures"]
            continue
        assert e["measures"] and e["first_response"], code
        for m in e["measures"]:
            assert m["what"] and m["limits"] and m["page"] and m["id"].count(".") == 2
    # signs the Catalogue is silent on say so rather than pretend
    assert catalogue.for_sign("foam")["inferred"] and catalogue.for_sign("odour")["inferred"]
    assert not catalogue.for_sign("sewage")["inferred"]
    raw = catalogue.FILE.read_text(encoding="utf-8").lower()
    assert "illustrative" not in raw and "placeholder" not in raw


def test_mosquito_signs_carry_the_catalogues_own_mosquito_cautions():
    m = catalogue.for_sign("mosquitoes")
    assert {c["id"] for c in m["cautions"]} == {"4.6.1", "4.6.2", "4.6.6", "4.6.7"}
    assert all(c["caution"] and not c["what"] for c in m["cautions"])


def test_titles_are_on_the_pages_cited(pages):
    for mid, m in catalogue.DATA["measures"].items():
        assert norm(f"{mid}{m['title']}") in pages[m["page"]], f"{mid} '{m['title']}' is not on page {m['page']}"


def test_quoted_phrases_are_on_the_pages_cited(pages):
    for mid, m in catalogue.DATA["measures"].items():
        assert norm(m["evidence"]) in pages[m["cite_page"]], f"{mid}: '{m['evidence']}' not on page {m['cite_page']}"
    for code, e in catalogue.DATA["signs"].items():
        for n in e.get("notes", []):
            assert norm(n["evidence"]) in pages[n["page"]], f"{code}: '{n['evidence']}' not on page {n['page']}"
    a = catalogue.ABOUT
    assert norm(a["evidence"]) in pages[a["page"]]


def test_the_catalogue_really_is_silent_on_foam(pages):
    assert not any("foam" in p for p in pages.values())  # why the foam entry is marked as the team's inference


@pytest.fixture()
def client():
    seed.run(store)
    auth.reset_limits()
    c = TestClient(app)
    assert c.post("/api/session", data={"role": "org"}).status_code == 200
    return c


def test_brief_serves_catalogue_measures_with_credit(client):
    b = client.get("/api/brief").json()
    by = {m["code"]: m for m in b["measures"]}
    assert "all-clear" not in by and set(by) == set(INDICATORS) - {"all-clear"}
    sewage = by["sewage"]["measures"][0]
    assert (sewage["id"], sewage["title"], sewage["page"]) == ("4.2.2", "Sewer system and point-source improvements", 42)
    assert b["catalogue"]["source"]["doi"] == "10.5281/zenodo.20040211" and b["catalogue"]["source"]["licence"] == "CC BY 4.0"
    json.dumps(b)  # serialisable
