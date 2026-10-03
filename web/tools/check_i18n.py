"""Check that every language in ui/i18n.tsx has every English key (missing keys fall back to English).

    python tools/check_i18n.py
"""
import re
import sys
from pathlib import Path

src = (Path(__file__).resolve().parent.parent / "ui" / "i18n.tsx").read_text(encoding="utf-8")
blocks = dict(re.findall(r"const (en|pt|it|fr|nl|no): Dict = \{(.*?)\n\};", src, re.S))
keys = {lang: set(re.findall(r'"([^"]+)": "', body)) for lang, body in blocks.items()}
base = keys["en"]
ok = True
print(f"en: {len(base)} keys")
for lang in ("pt", "it", "fr", "nl", "no"):
    missing, extra = sorted(base - keys[lang]), sorted(keys[lang] - base)
    print(f"{lang}: {len(keys[lang])} keys, missing {len(missing)}, extra {len(extra)}")
    for k in missing[:20]:
        print("   missing:", k)
    for k in extra[:20]:
        print("   extra:  ", k)
    ok &= not missing and not extra
sys.exit(0 if ok else 1)
