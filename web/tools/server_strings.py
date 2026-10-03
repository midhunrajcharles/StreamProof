"""Collect the English sentences the API sends to the web app, so they can be translated.

    python tools/server_strings.py           # print them
    python tools/server_strings.py --json    # write ui/locales/server.en.json (the list check_i18n.py uses)

Static strings become text keys. f-strings become templates with {a}, {b}... placeholders, which
tr() in ui/i18n.tsx matches against what the server actually sent.
"""

import ast
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MODULES = ["brief.py", "evidence.py", "permitted_use.py", "service.py", "signing.py", "api.py", "accounts.py", "auth.py",
           "models.py", "indicators.py", "cities.py"]
# grading reasons, hints and mission text are rebuilt by id-based patterns in i18n.tsx already
SENTENCE = re.compile(r"[A-Za-z].*[a-z].*")
SKIP = re.compile(r"^(https?://|/|[a-z_\-.]+$|[A-Z_]+$|%|\{|scrypt|SELECT|INSERT|DELETE|CREATE|PRAGMA|application/|image/|utf|Bundle|[a-z]+=)")


# technical values, credits and proper names that are never translated
NOT_TEXT = {"Content-Disposition", "Retry-After", "User-Agent", "LineString", "MultiLineString", "Ed25519", "SP-{a}", "M-{a}",
            'inline; filename="streamproof-{a}.pdf"', "network disabled", "CC BY 4.0 Open-Meteo.com", "OpenStreetMap via Nominatim",
            "ODbL, (c) OpenStreetMap contributors", "Open-Meteo forecast API, past_days=45, fetched {a}", "unknown role", "Building",
            "StreamProof hackathon demo (OneAquaHealth; city streams lookup)", "Coimbra", "Benevento", "Ghent", "Oslo", "Toulouse",
            "Portugal", "Italy", "Belgium", "Norway", "France", "the Mondego", "Citizen"}


def template(node: ast.JoinedStr) -> str | None:
    out, n = [], 0
    for v in node.values:
        if isinstance(v, ast.Constant):
            out.append(str(v.value))
        else:
            out.append("{" + "abcdefgh"[n] + "}")
            n += 1
    s = "".join(out)
    return s if n <= 6 else None


def collect() -> list[str]:
    seen: dict[str, None] = {}
    for name in MODULES:
        tree = ast.parse((ROOT / "app" / name).read_text(encoding="utf-8"))
        parents = {c: p for p in ast.walk(tree) for c in ast.iter_child_nodes(p)}
        for node in ast.walk(tree):
            if isinstance(node, ast.JoinedStr):
                s = template(node)
            elif isinstance(node, ast.Constant) and isinstance(node.value, str) and not isinstance(parents.get(node), ast.JoinedStr):
                if isinstance(parents.get(node), ast.Expr):
                    continue  # docstrings
                s = node.value
            else:
                continue
            if not s or len(s) < 3 or " " not in s.strip() and not s[:1].isupper():
                continue
            s = s.strip()
            if SKIP.match(s) or not SENTENCE.match(s) or "\n" in s or len(s) > 400:
                continue
            if s not in NOT_TEXT:
                seen.setdefault(s, None)
    return list(seen)


if __name__ == "__main__":
    items = collect()
    if "--json" in sys.argv:
        out = ROOT / "web" / "ui" / "locales" / "server.en.json"
        out.write_text(json.dumps(items, ensure_ascii=False, indent=0), encoding="utf-8")
        print(len(items), "server strings ->", out)
    else:
        for s in items:
            print(s)
        print(len(items), "strings")
