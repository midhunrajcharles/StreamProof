"""Compile the StreamProof add-on (ig/input/fsh) against the official OneAquaHealth guide.

    python tools/build_ig.py            # compile, publish to fhir/definitions
    python tools/build_ig.py --rebuild-oah   # also re-compile the OAH guide

Why this is more than one command: the HL7 Europe OAH guide (github.com/hl7-eu/oah) has no licence
file and is not published as a package, so it is never copied into this repository. This script
  1. clones it into tools/oah-ig (git-ignored) if it is not there,
  2. compiles it with SUSHI,
  3. installs the compiled profiles and terminology in the local FHIR package cache
     (~/.fhir/packages/hl7.eu.fhir.oah#0.1.0-ci-build) so SUSHI and the HL7 validator can resolve it.
     SUSHI only writes differentials, and deriving from a profile needs its snapshot, so the HL7 validator
     generates the snapshots (this is the slow step, about two minutes, and needs Java 11+),
  4. compiles ig/ (StreamProof's profiles derive from ObservationIndicatorsOah and LocationOah),
  5. writes the result to fhir/definitions/, with a one-line narrative on each resource.

Needs Node 18+ (`cd tools && npm install fsh-sushi`) and git. The first run downloads FHIR packages.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
OAH = TOOLS / "oah-ig"
IG = ROOT / "ig"
DEFS = ROOT / "fhir" / "definitions"
SUSHI = TOOLS / "node_modules" / "fsh-sushi" / "dist" / "app.js"
JAR = TOOLS / "validator_cli.jar"
OAH_ID, OAH_VERSION = "hl7.eu.fhir.oah", "0.1.0-ci-build"
PACKAGE_DIR = Path.home() / ".fhir" / "packages" / f"{OAH_ID}#{OAH_VERSION}"
KEEP = ("StructureDefinition", "CodeSystem", "ValueSet", "ConceptMap")  # conformance only, no examples
DERIVED_FROM = ("location-oah", "observation-indicators-oah")  # the OAH profiles the add-on builds on


def run(cmd: list[str], cwd: Path) -> None:
    print("$", " ".join(cmd), f"  (in {cwd.name})")
    proc = subprocess.run(cmd, cwd=cwd, text=True, encoding="utf-8", errors="replace",
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    tail = proc.stdout.strip().splitlines()[-14:]
    print("\n".join("    " + ln for ln in tail))
    if proc.returncode:
        raise SystemExit(f"failed ({proc.returncode}): {' '.join(cmd)}")


def sushi(folder: Path) -> None:
    if not SUSHI.exists():
        raise SystemExit("SUSHI not found: run `cd tools && npm install fsh-sushi`")
    run(["node", str(SUSHI), str(folder)], folder)


def add_snapshots(pkg: Path) -> None:
    """Give the profiles the add-on derives from a snapshot, using the HL7 validator's snapshot generator.
    (Only these two: the validator cannot snapshot every OAH profile, and nothing else needs one.)"""
    todo = []
    for p in sorted(pkg / f"StructureDefinition-{n}.json" for n in DERIVED_FROM):
        sd = json.loads(p.read_text(encoding="utf-8"))
        if sd.get("derivation") == "constraint" and sd.get("kind") == "resource" and "snapshot" not in sd:
            todo.append(p)
    if not todo:
        return
    if not JAR.exists():
        raise SystemExit(f"HL7 validator not found at {JAR}; download validator_cli.jar from github.com/hl7/fhir-validator-publisher")
    run(["java", "-jar", str(JAR), "snapshot", *map(str, todo), "-version", "4.0.1",
         "-ig", "hl7.fhir.uv.xver-r5.r4#0.1.0", "-outputSuffix", "snap.json"], pkg)
    for p in todo:
        out = p.with_name(p.name + ".snap.json")
        if not out.exists():
            raise SystemExit(f"no snapshot produced for {p.name}")
        out.replace(p)


def oah_commit() -> str:
    proc = subprocess.run(["git", "rev-parse", "HEAD"], cwd=OAH, text=True, capture_output=True)
    return proc.stdout.strip() or "unknown"


def install_oah_package(force: bool) -> int:
    """Install the compiled OAH guide in the package cache; skipped when the cached copy is current."""
    src = OAH / "fsh-generated" / "resources"
    pkg = PACKAGE_DIR / "package"
    stamp = pkg / ".built-from"
    if not force and stamp.exists() and stamp.read_text(encoding="utf-8") == oah_commit():
        return len(list(pkg.glob("*.json"))) - 1
    if PACKAGE_DIR.exists():
        shutil.rmtree(PACKAGE_DIR)
    pkg.mkdir(parents=True)
    n = 0
    for p in sorted(src.glob("*.json")):
        if p.name.split("-", 1)[0] in KEEP:
            shutil.copy2(p, pkg / p.name)
            n += 1
    add_snapshots(pkg)
    manifest = {"name": OAH_ID, "version": OAH_VERSION, "canonical": "http://hl7.eu/fhir/ig/oah",
                "title": "OneAquaHealth Project (compiled locally from hl7-eu/oah)", "type": "fhir.ig",
                "fhirVersions": ["4.0.1"], "dependencies": {"hl7.fhir.r4.core": "4.0.1"}}
    (pkg / "package.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    stamp.write_text(oah_commit(), encoding="utf-8")
    return n


def narrative(res: dict) -> dict:
    """Add a one-line human-readable narrative (FHIR best practice dom-6) to a definition."""
    if "text" not in res:
        title = res.get("title") or res.get("name") or res["id"]
        line = f"{res['resourceType']}: {title}"
        esc = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        res["text"] = {"status": "generated", "div": f'<div xmlns="http://www.w3.org/1999/xhtml"><p>{esc}</p></div>'}
    return res


def publish() -> list[str]:
    src = IG / "fsh-generated" / "resources"
    DEFS.mkdir(parents=True, exist_ok=True)
    for old in DEFS.glob("*.json"):
        old.unlink()
    names = []
    for p in sorted(src.glob("*.json")):
        res = json.loads(p.read_text(encoding="utf-8"))
        if res["resourceType"] == "ImplementationGuide":
            continue
        (DEFS / p.name).write_text(json.dumps(narrative(res), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        names.append(p.name)
    return names


def main() -> int:
    if not OAH.exists():
        run(["git", "clone", "--depth", "1", "https://github.com/hl7-eu/oah", str(OAH)], TOOLS)
    force = "--rebuild-oah" in sys.argv
    if force or not (OAH / "fsh-generated" / "resources").exists():
        sushi(OAH)
    print(f"OAH guide: {install_oah_package(force)} conformance resources in {PACKAGE_DIR}")
    shutil.rmtree(IG / "fsh-generated", ignore_errors=True)
    sushi(IG)
    names = publish()
    print(f"published {len(names)} resources to {DEFS}:")
    print("  " + "\n  ".join(names))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
