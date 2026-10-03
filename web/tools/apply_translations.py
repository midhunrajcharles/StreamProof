"""Merge a numbered translation file into ui/locales/<lang>.json.

    python tools/apply_translations.py de path/to/de.txt

The file has one line per string: "<index>\\t<translation>", where <index> is the line number in
ui/locales/_source.txt (written by: python tools/check_i18n.py --source, then this file's --numbered).
Placeholders such as {n} must match the English. Existing translations are kept unless replaced.

    python tools/apply_translations.py --numbered   # (re)write ui/locales/_source.txt from _source.json
"""

import json
import re
import sys
from pathlib import Path

LOCALES = Path(__file__).resolve().parent.parent / "ui" / "locales"
PH = re.compile(r"\{\w+\}")


def source() -> list[tuple[str, str]]:
    return list(json.loads((LOCALES / "_source.json").read_text(encoding="utf-8")).items())


if __name__ == "__main__":
    if sys.argv[1] == "--numbered":
        with (LOCALES / "_source.txt").open("w", encoding="utf-8") as f:
            for i, (_, v) in enumerate(source()):
                f.write(f"{i}\t{v}\n")
        sys.exit(0)
    lang, path = sys.argv[1], Path(sys.argv[2])
    src = source()
    target = LOCALES / f"{lang}.json"
    have = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    errors, n = [], 0
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        idx, _, text = line.partition("\t")
        i = int(idx)
        key, english = src[i]
        text = text.strip()
        if set(PH.findall(english)) != set(PH.findall(text)):
            errors.append(f"{i}: placeholders {sorted(set(PH.findall(english)))} vs {sorted(set(PH.findall(text)))}: {text[:60]}")
            continue
        have[key] = text
        n += 1
    order = {k: i for i, (k, _) in enumerate(src)}
    out = dict(sorted(have.items(), key=lambda kv: order.get(kv[0], 10**6)))
    target.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{lang}: {n} applied, {len(out)} total, {len(errors)} errors")
    for e in errors:
        print("  ", e)
