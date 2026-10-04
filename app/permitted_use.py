"""The permitted-use matrix: what each trust level may be used for.

The rule is DATA, not code: it is the published FHIR CodeSystem `trust-level` (property `permits`,
one value per allowed use, written in ig/input/fsh/trust-level.fsh and compiled into
fhir/definitions/). This module loads that file when it is imported, so the gate and the published
rule cannot disagree; a test also proves the file says what the engine needs. Every output
(dashboard, public map, FHIR exchange, advisory flag, certificate) asks `check()` first; nothing
reaches a partner system unless the record's rung allows it. Uses are cumulative up the levels.
"""

import json
from dataclasses import dataclass

from . import config
from .models import Rung

TRUST_LEVEL_FILE = config.RULES_DIR / "CodeSystem-trust-level.json"
PERMITTED_USE_FILE = config.RULES_DIR / "CodeSystem-permitted-use.json"


def _prop(concept: dict, code: str) -> list:
    return [p["valueCoding"]["code"] if "valueCoding" in p else p.get("valueInteger")
            for p in concept.get("property", []) if p["code"] == code]


def _load() -> tuple[dict[str, str], dict[Rung, list[str]], list[Rung]]:
    uses = {c["code"]: c["display"] for c in json.loads(PERMITTED_USE_FILE.read_text(encoding="utf-8"))["concept"]}
    levels: dict[Rung, tuple[int, list[str]]] = {}
    for c in json.loads(TRUST_LEVEL_FILE.read_text(encoding="utf-8"))["concept"]:
        rung = Rung(c["code"])  # an unknown trust level in the file fails loudly
        permits = _prop(c, "permits")
        unknown = [u for u in permits if u not in uses]
        if unknown:
            raise ValueError(f"{TRUST_LEVEL_FILE.name}: {rung.value} permits unknown use(s) {unknown}")
        levels[rung] = (_prop(c, "level")[0], permits)
    missing = set(Rung) - set(levels)
    if missing:
        raise ValueError(f"{TRUST_LEVEL_FILE.name} does not define: {sorted(r.value for r in missing)}")
    order = sorted((r for r in Rung if r != Rung.NOT_CONFIRMED), key=lambda r: levels[r][0])
    matrix: dict[Rung, list[str]] = {Rung.NOT_CONFIRMED: []}
    previous: list[str] = []
    for r in order:  # what each level ADDS: the published list is cumulative
        matrix[r] = [u for u in levels[r][1] if u not in previous]
        previous = levels[r][1]
    return uses, matrix, order


USES, MATRIX, _ORDER = _load()
_PERMITS: dict[Rung, list[str]] = {r: [u for step in _ORDER[: _ORDER.index(r) + 1] for u in MATRIX[step]]
                                   for r in _ORDER}


def allowed_uses(rung: Rung) -> list[str]:
    return list(_PERMITS.get(rung, []))


def minimum_rung(use: str) -> Rung:
    for r in _ORDER:
        if use in MATRIX[r]:
            return r
    raise KeyError(use)


@dataclass
class Decision:
    allowed: bool
    use: str
    rung: Rung
    reason: str


class Blocked(Exception):
    def __init__(self, decision: Decision):
        super().__init__(decision.reason)
        self.decision = decision


def check(rung: Rung, use: str) -> Decision:
    if use not in USES:
        raise KeyError(f"unknown use: {use}")
    if use in allowed_uses(rung):
        return Decision(True, use, rung, f"{rung.label} may be used for: {USES[use]}.")
    if rung == Rung.NOT_CONFIRMED:
        return Decision(False, use, rung, "Not-confirmed reports are kept for the record only.")
    need = minimum_rung(use)
    return Decision(False, use, rung,
                    f"Blocked by the permitted-use gate: a {rung.label} record may not be used for "
                    f"'{USES[use]}'. It needs {need.label} or higher.")


def require(rung: Rung, use: str) -> Decision:
    d = check(rung, use)
    if not d.allowed:
        raise Blocked(d)
    return d


def table() -> list[dict]:
    return [{"rung": r.label, "level": r.level, "adds": [USES[u] for u in MATRIX[r]]} for r in _ORDER]
