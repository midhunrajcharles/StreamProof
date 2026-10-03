"""Check that every language has every string (missing ones fall back to English).

    python tools/check_i18n.py                 # report per language; exit 1 if anything is missing
    python tools/check_i18n.py --source        # write ui/locales/_source.json: every key -> English
    python tools/check_i18n.py --missing de    # print the missing keys for one language as JSON (key -> English)

Strings come from four places:
  - id keys in the English dictionary in ui/i18n.tsx            t("nav.report")
  - English text used as the key in the web app                 tx("Verify report"), N("...")
  - English text on the landing page (server-rendered)          lt("...")
  - sentences the API sends (ui/locales/server.en.json, from tools/server_strings.py)
"""

import json
import re
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
LOCALES = WEB / "ui" / "locales"
PAIR = re.compile(r'"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"')
CALL = re.compile(r'\b(tx|N|lt)\(\s*"((?:[^"\\]|\\.)*)"')


def js(x: str) -> str:
    return json.loads('"' + x.replace("\\'", "'") + '"')


def english() -> dict[str, str]:
    src = (WEB / "ui" / "i18n.tsx").read_text(encoding="utf-8")
    body = re.search(r"const en: Dict = \{(.*?)\n\};", src, re.S).group(1)
    out = {js(k): js(v) for k, v in PAIR.findall(body)}
    files = [*WEB.glob("app/**/*.tsx"), *WEB.glob("ui/**/*.tsx"), *WEB.glob("components/**/*.tsx")]
    for f in sorted(files):
        for _, text in CALL.findall(f.read_text(encoding="utf-8")):
            t = js(text)
            out.setdefault(t, t)
    for t in json.loads((LOCALES / "server.en.json").read_text(encoding="utf-8")):
        out.setdefault(t, t)
    return out


def langs() -> list[str]:
    return sorted(p.stem for p in LOCALES.glob("??.json"))


if __name__ == "__main__":
    base = english()
    if "--source" in sys.argv:
        (LOCALES / "_source.json").write_text(json.dumps(base, ensure_ascii=False, indent=0), encoding="utf-8")
        print(len(base), "strings ->", LOCALES / "_source.json")
        sys.exit(0)
    if "--missing" in sys.argv:
        lang = sys.argv[sys.argv.index("--missing") + 1]
        have = json.loads((LOCALES / f"{lang}.json").read_text(encoding="utf-8"))
        print(json.dumps({k: v for k, v in base.items() if k not in have}, ensure_ascii=False, indent=0))
        sys.exit(0)
    ok = True
    print(f"en: {len(base)} strings")
    for lang in langs():
        have = json.loads((LOCALES / f"{lang}.json").read_text(encoding="utf-8"))
        missing = [k for k in base if k not in have]
        extra = [k for k in have if k not in base]
        bad = [k for k in base if k in have and set(re.findall(r"\{\w+\}", base[k])) != set(re.findall(r"\{\w+\}", have[k]))]
        print(f"{lang}: {len(have)} strings, missing {len(missing)}, extra {len(extra)}, placeholder mismatches {len(bad)}")
        for k in bad[:5]:
            print("   placeholders differ:", k[:80])
        ok &= not missing and not bad
    sys.exit(0 if ok else 1)
