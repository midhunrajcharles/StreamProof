"""The records StreamProof keeps. Plain dataclasses; the store turns them into rows."""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum


def now() -> datetime:
    return datetime.now(timezone.utc)


class Rung(str, Enum):
    """Trust levels. An evidence graph, not a strict ladder: Expert-verified is reachable
    straight from Assessed, so a rural site with no second observer is not stuck."""

    REPORT = "report"
    ASSESSED = "assessed"
    COMMUNITY = "community-supported"
    EXPERT = "expert-verified"
    DECISION = "decision-grade"
    NOT_CONFIRMED = "not-confirmed"

    @property
    def level(self) -> int:
        return {"report": 1, "assessed": 2, "community-supported": 3,
                "expert-verified": 4, "decision-grade": 5, "not-confirmed": 0}[self.value]

    @property
    def label(self) -> str:
        return {"report": "Report", "assessed": "Assessed", "community-supported": "Community-supported",
                "expert-verified": "Expert-verified", "decision-grade": "Decision-grade",
                "not-confirmed": "Not confirmed"}[self.value]


@dataclass
class Reason:
    signal: str  # photo | photo_time | location | stream | nearby | context | track_record
    status: str  # ok | warn | fail | info
    text: str
    points: int
    max_points: int


@dataclass
class Event:
    at: str
    rung: str
    by: str
    note: str


@dataclass
class Report:
    id: str
    observer: str  # pseudonym, never a name or email
    created_at: datetime
    indicators: list[str]
    lat: float  # exact; stored in the identity vault table, never on public surfaces
    lon: float
    gps_accuracy_m: float | None = None
    description: str = ""
    photo: dict | None = None  # imaging.PhotoMetrics as dict
    photo_file: str | None = None
    mission_id: str | None = None
    rung: Rung = Rung.REPORT
    grade: str | None = None
    score: int | None = None
    reasons: list[Reason] = field(default_factory=list)
    hint: str | None = None
    safety: str | None = None
    supporters: dict[str, float] = field(default_factory=dict)  # report id -> weight
    verification: dict | None = None  # {by, method, at, note}
    rejection: str | None = None
    status: str = "Under review"
    history: list[Event] = field(default_factory=list)
    ai_suggestion: dict | None = None  # shown to the expert only; never counted in the grade

    @property
    def support(self) -> float:
        return round(sum(self.supporters.values()), 2)

    def log(self, by: str, note: str) -> None:
        self.history.append(Event(now().isoformat(timespec="seconds"), self.rung.value, by, note))

    def to_dict(self) -> dict:
        d = asdict(self)
        d["created_at"] = self.created_at.isoformat()
        d["rung"] = self.rung.value
        return d


@dataclass
class Mission:
    id: str
    report_id: str
    indicators: list[str]
    lat: float
    lon: float
    radius_m: int
    request: str
    created_by: str
    created_at: datetime
    status: str = "open"
    submissions: list[str] = field(default_factory=list)
    safety: str = ("Stay on public paths. Don't enter or touch the water. "
                   "Don't photograph people. Leave if it feels unsafe.")
