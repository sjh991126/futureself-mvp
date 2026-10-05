"""데이터 모델."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Optional

STATUS_LABEL = {
    "bull": "🟢 우호",
    "neutral": "⚪ 중립",
    "caution": "🟡 경계",
    "bear": "🔴 비우호",
    "na": "⚫ 데이터 없음",
}
FRESHNESS_LABEL = {
    "fresh": "최신",
    "stale": "오래됨",
    "manual": "수동 입력",
    "missing": "미수집",
}


@dataclass
class Point:
    """시계열 한 점. date 는 ISO 날짜 문자열(월별 시리즈는 YYYY-MM-01)."""

    date: str
    value: float
    note: str = ""

    def to_row(self) -> dict:
        return {"date": self.date, "value": self.value, "note": self.note}


@dataclass
class SourceStatus:
    key: str
    ok: bool
    mode: str  # auto | manual | skipped | error | needs_key
    message: str = ""
    fetched_at: str = ""
    count: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Signal:
    key: str
    name: str
    status: str  # bull | neutral | caution | bear | na
    headline: str
    rationale: str
    lead_lag: str
    as_of: Optional[str] = None
    freshness: str = "missing"
    votes: dict = field(default_factory=dict)
    metrics: dict = field(default_factory=dict)
    sources: list = field(default_factory=list)
    next_release: Optional[str] = None
    needs_manual: list = field(default_factory=list)

    @property
    def status_label(self) -> str:
        return STATUS_LABEL.get(self.status, self.status)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["status_label"] = self.status_label
        d["votes"] = {str(k): v for k, v in self.votes.items()}
        return d


@dataclass
class PhaseAssessment:
    phase: Optional[int]
    label: str
    confidence: float
    votes: dict
    coverage: int
    drivers: list
    dissenters: list
    summary: str
    guide: str

    def to_dict(self) -> dict:
        d = asdict(self)
        d["votes"] = {str(k): round(v, 2) for k, v in self.votes.items()}
        return d
