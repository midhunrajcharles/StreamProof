"""The permitted-use matrix: what each trust level may be used for.

This is the central artifact. Every output (dashboard, public map, FHIR exchange,
advisory flag, certificate) asks `check()` first; nothing reaches a partner system
unless the record's rung allows it. Uses are cumulative up the levels.
"""

from dataclasses import dataclass

from .models import Rung

USES: dict[str, str] = {
    "triage": "Org triage queue",
    "field_check": "Trigger a field-check request",
    "mission": "Open a community evidence mission",
    "org_dashboard": "Org dashboard, labelled unverified",
    "public_map": "Public map as 'reported, being checked'",
    "oah_dashboard": "OAH dashboard and DSS input",
    "fhir_exchange": "FHIR exchange with partner systems",
    "recognition": "Contributor recognition (signed certificate)",
    "advisory_flag": "Advisory flag to agencies and public-health partners",
}

MATRIX: dict[Rung, list[str]] = {
    Rung.NOT_CONFIRMED: [],
    Rung.REPORT: ["triage", "field_check", "mission"],
    Rung.ASSESSED: ["org_dashboard"],
    Rung.COMMUNITY: ["public_map"],
    Rung.EXPERT: ["oah_dashboard", "fhir_exchange", "recognition"],
    Rung.DECISION: ["advisory_flag"],
}
_ORDER = [Rung.REPORT, Rung.ASSESSED, Rung.COMMUNITY, Rung.EXPERT, Rung.DECISION]


def allowed_uses(rung: Rung) -> list[str]:
    if rung == Rung.NOT_CONFIRMED:
        return []
    out: list[str] = []
    for r in _ORDER[: _ORDER.index(rung) + 1]:
        out += MATRIX[r]
    return out


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
