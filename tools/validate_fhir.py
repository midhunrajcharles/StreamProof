"""Write the open FHIR definitions, build an example verified Bundle, and run the official
HL7 FHIR Validator on it. Output is saved to fhir/validation/ so it can be shown offline.

    python tools/validate_fhir.py            # needs Java 11+ and tools/validator_cli.jar
"""

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import evidence, fhir, grading, signing  # noqa: E402
from app.models import Report  # noqa: E402

FHIR_DIR = ROOT / "fhir"
DEFS = FHIR_DIR / "definitions"
EXAMPLES = FHIR_DIR / "examples"
OUT = FHIR_DIR / "validation"
JAR = ROOT / "tools" / "validator_cli.jar"


def example_bundle() -> dict:
    t = datetime(2026, 10, 2, 9, 40, tzinfo=timezone.utc)
    photo = {"sha256": "9f2c" + "0" * 60, "width": 3024, "height": 4032, "sharpness": 210.5,
             "brightness": 118.0, "exif_time": "2026-10-02T10:38:00", "has_gps_exif": True}
    a = Report("SP-1001", "obs-7f3a", t, ["stagnant-water", "mosquitoes"], 40.22267, -8.42745, 8, photo=photo)
    b = Report("SP-1002", "obs-c21e", t + timedelta(hours=5), ["stagnant-water"], 40.22301, -8.42601, 12, photo=photo)
    grading.grade(a, [])
    grading.grade(b, [a])
    evidence.link_corroboration(b, [a])
    evidence.verify(a, "exp-feio-lab", "field", "Ponded side channel, larvae present in dip sample.")
    signed = signing.sign(signing.deidentified(a))
    return fhir.bundle(a, signed, at=t + timedelta(days=1))


def main() -> int:
    for d in (DEFS, EXAMPLES, OUT):
        d.mkdir(parents=True, exist_ok=True)
    for name, res in fhir.definitions().items():
        (DEFS / name).write_text(json.dumps(res, indent=2), encoding="utf-8")
    bpath = EXAMPLES / "Bundle-verified-report-example.json"
    bpath.write_text(json.dumps(example_bundle(), indent=2), encoding="utf-8")
    if not JAR.exists():
        print(f"validator not found at {JAR}; definitions and example written only")
        return 0
    targets = [str(bpath)] + [str(p) for p in sorted(DEFS.glob("*.json"))]
    cmd = ["java", "-jar", str(JAR), *targets, "-version", "4.0.1", "-ig", str(DEFS),
           "-output", str(OUT / "validation-outcome.json")]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    log = proc.stdout + proc.stderr
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    (OUT / "validator-output.txt").write_text(f"# HL7 FHIR Validator run {stamp}\n# {' '.join(cmd)}\n\n{log}",
                                              encoding="utf-8")
    summary = [ln for ln in log.splitlines() if ln.startswith(("Success", "*FAILURE*", "Done.", "-- ")) or "errors" in ln]
    print("\n".join(summary[-30:]))
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
