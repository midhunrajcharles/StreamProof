"""List (or extract) the landing page's text so it can be translated.

    python tools/landing_strings.py            # list unique strings
    python tools/landing_strings.py --extract  # rewrite components to use t("land.N"), write ui/locales/landing.en.json

Text lives in the components as JSX string children ({"..."}) and in aria-label/alt attributes.
Extraction replaces each with a lookup in the server-side dictionary (components/lt.ts).
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = sorted((ROOT / "components").glob("*/*.tsx"))
LIT = re.compile(r'(?<![={])\{("(?:[^"\\]|\\.)*")\}')
ATTR = re.compile(r'\b(aria-label|alt)="([^"]*)"')
WORDS = re.compile(r"[A-Za-z]")


def strings() -> dict[str, str]:
    uniq: dict[str, str] = {}
    for f in FILES:
        s = f.read_text(encoding="utf-8")
        for m in LIT.finditer(s):
            t = json.loads(m.group(1))
            if t.strip() and WORDS.search(t):
                uniq.setdefault(t, f.name)
        for m in ATTR.finditer(s):
            if WORDS.search(m.group(2)):
                uniq.setdefault(m.group(2), f"{f.name}:{m.group(1)}")
    return uniq


SKIP = {"STREAMPROOF", "F", "A", "Q"}  # the logo and the decorative FAQ letters


def extract() -> None:
    for f in FILES:
        s = f.read_text(encoding="utf-8")
        o = s

        def lit(m):
            t = json.loads(m.group(1))
            return m.group(0) if (not t.strip() or not WORDS.search(t) or t in SKIP) else "{lt(" + m.group(1) + ")}"

        def attr(m):
            return m.group(0) if not WORDS.search(m.group(2)) else f"{m.group(1)}={{lt({json.dumps(m.group(2), ensure_ascii=False)})}}"

        s = LIT.sub(lit, s)
        s = ATTR.sub(attr, s)
        if s == o:
            continue
        s = re.sub(r"export default function (\w+)\(([^)]*)\) \{\n", lambda m: f"export default async function {m.group(1)}({m.group(2)}) {{\n  const lt = await getLt();\n", s, count=1)
        s = 'import { getLt } from "@/components/lt";\n' + s
        f.write_text(s, encoding="utf-8")
        print("translated", f.name)


if __name__ == "__main__":
    u = strings()
    if "--extract" in sys.argv:
        extract()
    else:
        print(len(u), "unique,", sum(len(k) for k in u), "chars")
        for k, v in u.items():
            print(f"{v:28} {k[:120]}")
