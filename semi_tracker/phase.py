"""지표별 투표를 합산해 종합 국면(①~④)을 추정."""
from __future__ import annotations

from typing import Optional

from .config import PHASES, PHASE_GUIDE
from .models import PhaseAssessment, Signal

MIN_COVERAGE = 3  # 판정에 필요한 최소 지표 수


def assess(signals: list[Signal]) -> PhaseAssessment:
    votes = {1: 0.0, 2: 0.0, 3: 0.0, 4: 0.0}
    for s in signals:
        for k, w in s.votes.items():
            votes[int(k)] += float(w)
    total = sum(votes.values())
    coverage = sum(1 for s in signals if s.status != "na")
    if total <= 0 or coverage < MIN_COVERAGE:
        return PhaseAssessment(
            phase=None, label="판단 보류 (데이터 부족)", confidence=0.0, votes=votes, coverage=coverage,
            drivers=[], dissenters=[],
            summary=f"판정 가능한 지표가 {coverage}/{len(signals)}개뿐입니다. 자동 수집을 실행하거나 수동 입력을 채워 주세요.",
            guide="",
        )
    phase = max(votes, key=lambda k: (votes[k], -k))
    confidence = votes[phase] / total

    drivers = []
    dissenters = []
    for s in signals:
        if s.status == "na" or not s.votes:
            continue
        v = {int(k): float(w) for k, w in s.votes.items()}
        own = max(v, key=lambda k: v[k])
        if v.get(phase, 0) > 0:
            drivers.append({"key": s.key, "name": s.name, "weight": round(v[phase], 2), "rationale": s.rationale})
        if own != phase and v[own] > v.get(phase, 0):
            dissenters.append({"key": s.key, "name": s.name, "phase": own, "phase_label": PHASES[own],
                               "weight": round(v[own], 2), "rationale": s.rationale})
    drivers.sort(key=lambda d: -d["weight"])
    dissenters.sort(key=lambda d: -d["weight"])

    up, down = votes[1] + votes[2], votes[3] + votes[4]
    tilt = (up - down) / total
    label = PHASES[phase]
    extra = ""
    if phase == 2 and votes[3] >= 0.6 * votes[2]:
        extra = " ③ 전환 경계 신호가 누적되고 있습니다."
    elif phase == 4 and votes[1] >= 0.6 * votes[4]:
        extra = " ① 바닥 신호가 함께 나타나고 있습니다."
    names = ", ".join(d["name"] for d in drivers[:3]) or "—"
    summary = (f"{label} 가능성 {confidence:.0%} (지표 {coverage}/{len(signals)}개 반영, "
               f"상승 성향 {tilt:+.2f}). 주된 근거: {names}.{extra}")
    return PhaseAssessment(phase=phase, label=label, confidence=round(confidence, 3), votes=votes,
                           coverage=coverage, drivers=drivers, dissenters=dissenters, summary=summary,
                           guide=PHASE_GUIDE[phase])


def diff_snapshots(prev: Optional[dict], cur: dict) -> list[str]:
    """이전 스냅샷 대비 국면·지표 판정 변화 목록(알림용)."""
    if not prev:
        return ["첫 실행"]
    changes = []
    p_phase = (prev.get("phase") or {}).get("label")
    c_phase = (cur.get("phase") or {}).get("label")
    if p_phase != c_phase:
        changes.append(f"국면: {p_phase} → {c_phase}")
    p_sig = {s["key"]: s for s in prev.get("signals", [])}
    for s in cur.get("signals", []):
        old = p_sig.get(s["key"])
        if old and old.get("status") != s.get("status"):
            changes.append(f"{s['name']}: {old.get('status_label')} → {s.get('status_label')} ({s.get('headline')})")
    return changes
