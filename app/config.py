"""Run settings. Everything here can be overridden with an environment variable."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("STREAMPROOF_DATA", ROOT / "var"))
DB_PATH = DATA_DIR / "streamproof.db"
MEDIA_DIR = DATA_DIR / "media"
KEY_PATH = DATA_DIR / "org_signing_key.pem"

# Canonical base for the open CodeSystems/ValueSet: the project's GitHub Pages site,
# where fhir/definitions/ is published.
FHIR_BASE = os.environ.get("STREAMPROOF_FHIR_BASE", "https://midhunrajcharles.github.io/streamproof/fhir")
# The published rules the gate loads at start-up (see app/permitted_use.py). Point this at another
# folder to run StreamProof under a different permitted-use rule file.
RULES_DIR = Path(os.environ.get("STREAMPROOF_RULES", ROOT / "fhir" / "definitions"))
PSEUDONYM_SYSTEM = f"{FHIR_BASE}/NamingSystem/observer-pseudonym"

SESSION_SECRET = os.environ.get("STREAMPROOF_SESSION_SECRET", "dev-only-change-me")
# Demo mode: one-tap demo sign-in and the demo accounts' details on the sign-in page.
# Set STREAMPROOF_DEMO=0 for a real deployment: reviewers must use their password.
DEMO_MODE = os.environ.get("STREAMPROOF_DEMO", "1") == "1"
ORG_NAME = os.environ.get("STREAMPROOF_ORG", "StreamProof demo organization")

# Evidence rules. Illustrative defaults to be calibrated with OAH ecologists, not validated values.
NEARBY_RADIUS_M = 500
NEARBY_WINDOW_DAYS = 14
ADVISORY_MIN_EXPERT = 2
ADVISORY_MIN_COMMUNITY = 3
CORROBORATIONS_PER_ACCOUNT_PER_DAY = 3
MIN_CORROBORATION_GAP_MIN = 30  # same-place reports closer than this in time don't count as independent
MIN_CORROBORATION_GAP_M = 50  # ...unless they are at least this far apart
MISSION_UPSTREAM_M = 400
