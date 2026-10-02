"""What a citizen can report, in plain words, and how each choice maps to a code.

The chips are the citizen-facing vocabulary (no ecology jargon). Each one maps to a
code in the open StreamProof CodeSystem (fhir/CodeSystem-stream-indicator.json),
which is the piece another platform can adopt without adopting this app.
"""

from dataclasses import dataclass

from .config import FHIR_BASE

CODESYSTEM_URL = f"{FHIR_BASE}/CodeSystem/stream-indicator"
VALUESET_URL = f"{FHIR_BASE}/ValueSet/stream-indicator"


@dataclass(frozen=True)
class Indicator:
    code: str
    chip: str  # what the citizen taps
    display: str  # what the record says
    group: str  # water-quality | biota | habitat | pollution | vector | none
    health_relevant: bool  # can contribute to a public-health advisory flag
    definition: str


INDICATORS: dict[str, Indicator] = {
    i.code: i
    for i in [
        Indicator("algal-scum", "Scum or green water", "Algal scum or green discoloured water",
                  "water-quality", True,
                  "Visible surface scum or green/blue-green discolouration, a possible algal bloom."),
        Indicator("odour", "Bad smell", "Unusual odour from the water",
                  "water-quality", False,
                  "A strong septic, chemical or rotten smell noticed at the bank."),
        Indicator("dead-fish", "Dead fish", "Dead or dying fish",
                  "biota", True,
                  "One or more dead or visibly distressed fish in or at the edge of the water."),
        Indicator("oil-sheen", "Oily sheen", "Oily or rainbow sheen on the surface",
                  "pollution", True,
                  "A rainbow or silvery film on the surface that breaks up into patches."),
        Indicator("stagnant-water", "Stagnant water", "Stagnant or ponded water",
                  "habitat", True,
                  "Water that is not flowing: ponded side pools, blocked channel or standing water."),
        Indicator("mosquitoes", "Many mosquitoes", "High mosquito activity",
                  "vector", True,
                  "Many mosquitoes or larvae seen at the site; a possible vector habitat signal."),
        Indicator("sewage", "Sewage or discharge", "Sewage or pipe discharge",
                  "pollution", True,
                  "Grey water, toilet paper, or a pipe discharging into the stream."),
        Indicator("litter", "Litter", "Litter in or beside the channel",
                  "pollution", False,
                  "Plastic, bags or dumped items in the channel or on the banks."),
        Indicator("foam", "Foam", "Persistent foam on the surface",
                  "water-quality", False,
                  "White or brown foam that does not break up quickly."),
        Indicator("all-clear", "Everything looks fine", "No problem observed",
                  "none", False,
                  "The observer checked the site and saw nothing of concern. Credited equally."),
    ]
}


def get(code: str) -> Indicator:
    if code not in INDICATORS:
        raise KeyError(f"unknown indicator code: {code}")
    return INDICATORS[code]


def validate_codes(codes: list[str]) -> list[str]:
    """Return codes in catalogue order, de-duplicated. 'all-clear' cannot be mixed with problems."""
    unique = [c for c in INDICATORS if c in set(codes)]
    if not unique:
        raise ValueError("pick at least one thing you saw (or 'Everything looks fine')")
    for c in codes:
        get(c)
    if "all-clear" in unique and len(unique) > 1:
        raise ValueError("'Everything looks fine' can't be combined with a problem")
    return unique
